// Derived geometry for line-to-curve squircle joins (Glyphs' "raindrop").
//
// ADR-0012. The stored outline is NOT touched: a line and a curve keep meeting at
// the squircle node, and the smooth G2 transition is materialised here, in
// memory, for rendering and export only. The Python reference implementation is
// `src/fontra/core/` + the algorithm prototype `qa/probe-raindrop-v2b.py`; this
// file is a line-by-line mirror of that prototype, and the shared truth table
// `test-common/squircle-line-curve-vectors.json` is what keeps the two in step
// (AGENTS.md: "屏幕所见必须等于导出所得" -- enforced by tests, not by discipline).
//
// The construction, for a straight run A...P meeting the cubic [P, Y, hC, C]:
//
//     ... A --straight-- E --seg1--> M --seg2--> Q --[second half]--> C ...
//
// P and the first half of the original cubic are dropped, so the travel direction
// never reverses (an earlier "keep the original handles" attempt did reverse at P
// and produced a cusp -- see ADR-0012 §3).
//
//   * E = P - t*d, c2 = E + beta*d, c1 = (E + c2)/2  => at E: tangent along the
//     line (G1) and zero curvature (G2) BY CONSTRUCTION.
//   * Q is an exact de Casteljau split point of [P, Y, hC, C]; the second half
//     continues the original curve.
//   * M = lerp(P, Q, mFrac).
//   * seg2's two controls satisfy both G1 conditions BY CONSTRUCTION:
//     g1 = M + s*(M - c2),  g2 = Q - v*(half[1] - Q).
//   * What is left are the two curvature MAGNITUDE conditions. They are COUPLED
//     (the curvature at M involves seg2's end control g2), so s and v are solved
//     together by a 2x2 damped Newton -- never one after the other.
//
// Acceptance is strict: both magnitude residuals below 1e-9 AND all four curvature
// senses matching. Otherwise the join is "refused" and the outline is drawn as
// stored (never a half-transition).
import { VarPackedPath } from "./var-path.js";

// ---- tunables (each one must mirror the Python reference) --------------

// How far back E sits from P, as a fraction of the available straight run. The
// two solvable convex fixtures in the prototype used 60/400 and 50/500, i.e.
// 10-15%.
export const SETBACK_RATIO = 0.1;

// How much of the straight run one setback may take. Beyond this there is no
// straight part left to anchor the transition on -> "no room".
// (Mirrors MAX_SETBACK_ROOM_RATIO = 0.9 in the Python reference.)
export const ROOM_LIMIT_RATIO = 0.9;

// The Python reference's DEFAULT setback is a fraction of the CURVE's scale:
// setbackCurveFactor * |curve_near - node| (see the `roomRule` block in
// test-common/squircle-line-curve-vectors.json). Only used when the caller does
// not pass an explicit setback.
export const SETBACK_CURVE_FACTOR = 0.5;

// A transition shorter than this fraction of the run is refused rather than
// silently shrunk (matches the truth table's "tiny-setback" refusal: setback 3
// on a run of 400).
export const MIN_SETBACK_RATIO = 0.05;

// Magnitude residual below which a join counts as solved.
export const RESIDUAL_TOLERANCE = 1e-9;

// Convergence threshold for the Newton loop.
const CONVERGENCE_TOLERANCE = 1e-14;
const NEWTON_ITERATIONS = 80;
const NEWTON_STEP_HALVINGS = 30;
const NEWTON_JACOBIAN_STEP = 1e-7;
const NEWTON_MIN_PARAMETER = 1e-3;
const NEWTON_MIN_DET = 1e-18;

// Deterministic search grid (mirrors the prototype).
const Q_GRID = Array.from({ length: 23 }, (_, i) => 0.08 + 0.04 * i);
const M_FRAC_GRID = Array.from({ length: 16 }, (_, i) => 0.1 + 0.05 * i);
const INITIAL_GUESSES = [
  [1.0, 0.5],
  [0.4, 1.0],
  [2.0, 0.25],
  [0.7, 0.7],
  [1.5, 1.5],
  [0.25, 0.4],
];

// The rescue sweep (mirrors FALLBACK_* in the Python reference): finer q steps
// plus wider Newton guesses, consulted ONLY when the main grid finds nothing.
// Some feasible joins have narrow convergence basins the main q steps step
// over -- notably a right-angle corner whose curve handle lies on the chord,
// exactly what smoothing a rectangle corner produces next door.
const FALLBACK_Q_GRID = Array.from({ length: 37 }, (_, i) => 0.05 + 0.025 * i);
const FALLBACK_INITIAL_GUESSES = [
  ...INITIAL_GUESSES,
  [0.1, 0.3],
  [0.1, 1.0],
  [0.1, 3.0],
  [0.3, 1.0],
];

// Samples per derived segment, for the self-intersection check.
const SHAPE_SAMPLES = 40;

// Two sampled stretches closer than this are treated as adjacent, so a curve's
// own neighbouring samples cannot be reported as a self-crossing.
const SELF_INTERSECTION_MIN_GAP = 2;

// ---- small vector helpers (semantics identical to the prototype) --------

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a, s) => ({ x: a.x * s, y: a.y * s });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const norm = (a) => Math.hypot(a.x, a.y);
const lerp = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

function unit(a) {
  const n = norm(a);
  return n > 0 ? { x: a.x / n, y: a.y / n } : { x: 0, y: 0 };
}

// ---- cubic helpers ------------------------------------------------------

function bezierD1(seg, t) {
  const [p0, p1, p2, p3] = seg;
  const u = 1 - t;
  return {
    x: 3 * (u * u * (p1.x - p0.x) + 2 * u * t * (p2.x - p1.x) + t * t * (p3.x - p2.x)),
    y: 3 * (u * u * (p1.y - p0.y) + 2 * u * t * (p2.y - p1.y) + t * t * (p3.y - p2.y)),
  };
}

function bezierD2(seg, t) {
  const [p0, p1, p2, p3] = seg;
  const u = 1 - t;
  return {
    x: 6 * (u * (p2.x - 2 * p1.x + p0.x) + t * (p3.x - 2 * p2.x + p1.x)),
    y: 6 * (u * (p2.y - 2 * p1.y + p0.y) + t * (p3.y - 2 * p2.y + p1.y)),
  };
}

function bezierPoint(seg, t) {
  const [p0, p1, p2, p3] = seg;
  const u = 1 - t;
  return {
    x:
      u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y:
      u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

// Signed curvature and curvature VECTOR at parameter t.
function curvature(seg, t) {
  const v = bezierD1(seg, t);
  const a = bezierD2(seg, t);
  const q = dot(v, v);
  if (!(q > 0)) {
    return { k: 0, vector: { x: 0, y: 0 } };
  }
  const k = cross(v, a) / Math.pow(q, 1.5);
  const inv = 1 / Math.sqrt(q);
  return { k, vector: { x: k * -v.y * inv, y: k * v.x * inv } };
}

// Exact de Casteljau split. Returns [firstHalf, secondHalf].
export function splitCubic(p0, p1, p2, p3, q) {
  const l0 = lerp(p0, p1, q);
  const l1 = lerp(p1, p2, q);
  const l2 = lerp(p2, p3, q);
  const l01 = lerp(l0, l1, q);
  const l12 = lerp(l1, l2, q);
  const m = lerp(l01, l12, q);
  return [
    [p0, l0, l01, m],
    [m, l12, l2, p3],
  ];
}

// ---- the solver ---------------------------------------------------------

/**
 * Derive the G2 transition for one line-to-curve join.
 *
 * @param {{A, P, Y, hC, C}} join - straight-side far point, the squircle node,
 *   the curve's near and far handles, and the curve's far on-curve point.
 * @param {{setback?: number}} [options]
 * @returns {{status: "ok", E, c1, c2, M, Q, g1, g2, q, s, v, seg1, seg2, half}
 *   | {status: "refused", reason: string}}
 */
export function deriveLineCurveTransition(join, options = {}) {
  const { A, P, Y, hC, C } = join;
  const d = unit(sub(P, A));
  const room = norm(sub(P, A));
  const curveScale = norm(sub(Y, P));
  // The Python reference's default setback is a fraction of the CURVE's scale, not
  // of the straight run: `setbackCurveFactor * |curve_near - node|` (see the
  // `roomRule` block in test-common/squircle-line-curve-vectors.json).
  const setback = options.setback ?? SETBACK_CURVE_FACTOR * curveScale;
  if (!(room > 0) || !(setback > 0) || !(curveScale > 0)) {
    return { status: "refused", reason: "no-room" };
  }
  if (setback >= ROOM_LIMIT_RATIO * room) {
    // E would land at or past 90% of the straight run: refuse BEFORE solving.
    return { status: "refused", reason: "no-room" };
  }

  const E = add(P, mul(d, -setback));
  const beta = setback / 2;
  const c2 = add(E, mul(d, beta));
  const c1 = mul(add(E, c2), 0.5);

  // One deterministic sweep of the search space. Returns the best candidate
  // (smallest |M - P|) or null.
  const sweep = (qGrid, guesses) => {
    let best = null;
    let bestScore = Infinity;
    for (const q of qGrid) {
      for (const mFrac of M_FRAC_GRID) {
        const [, half] = splitCubic(P, Y, hC, C, q);
        const Q = half[0];
        const M = lerp(P, Q, mFrac);
        const seg1 = [E, c1, c2, M];
        const k1 = curvature(seg1, 1.0);
        const kh = curvature(half, 0.0);

        const makeSeg2 = (s, v) => [
          M,
          add(M, mul(sub(M, c2), s)),
          sub(Q, mul(sub(half[1], Q), v)),
          Q,
        ];
        const residuals = (p) => [
          Math.abs(curvature(makeSeg2(p[0], p[1]), 0.0).k) - Math.abs(k1.k),
          Math.abs(curvature(makeSeg2(p[0], p[1]), 1.0).k) - Math.abs(kh.k),
        ];

        for (const guess of guesses) {
          const solved = solveCoupled(residuals, guess);
          if (!solved) {
            continue;
          }
          const [s, v] = solved;
          const seg2 = makeSeg2(s, v);
          const k2m = curvature(seg2, 0.0);
          const k2q = curvature(seg2, 1.0);
          // strict acceptance: magnitudes AND all four senses
          const worst =
            Math.max(
              Math.abs(Math.abs(k2m.k) - Math.abs(k1.k)),
              Math.abs(Math.abs(k2q.k) - Math.abs(kh.k))
            ) > RESIDUAL_TOLERANCE;
          if (worst || !(k1.k * k2m.k > 0) || !(k2q.k * kh.k > 0)) {
            continue;
          }
          if (!shapeIsSane(A, E, seg1, seg2, half, C, d, hC, P)) {
            continue;
          }
          const score = norm(sub(M, P));
          if (score < bestScore) {
            bestScore = score;
            best = { E, c1, c2, M, Q, g1: seg2[1], g2: seg2[2], q, mFrac, s, v, seg1, seg2, half };
          }
        }
      }
    }
    return best;
  };

  let best = sweep(Q_GRID, INITIAL_GUESSES);
  if (!best) {
    // Nothing in the main grid: sweep the finer rescue grid before giving up.
    // Same scoring, same deterministic order.
    best = sweep(FALLBACK_Q_GRID, FALLBACK_INITIAL_GUESSES);
  }

  if (!best) {
    return { status: "refused", reason: "no transition satisfies G1+G2 inside the search grid" };
  }
  return { status: "ok", ...best };
}

// 2x2 damped Newton with a numeric Jacobian and step halving. Returns [s, v] or
// null. `residuals` is total, so the iteration never falls into a hole.
function solveCoupled(residuals, guess) {
  let p = guess.slice();
  let converged = false;
  for (let iter = 0; iter < NEWTON_ITERATIONS; iter++) {
    const r = residuals(p);
    const cost0 = Math.max(Math.abs(r[0]), Math.abs(r[1]));
    if (cost0 < CONVERGENCE_TOLERANCE) {
      converged = true;
      break;
    }
    const jacobian = [];
    for (let i = 0; i < 2; i++) {
      const h = NEWTON_JACOBIAN_STEP * Math.max(1, Math.abs(p[i]));
      const probe = p.slice();
      probe[i] += h;
      const rp = residuals(probe);
      jacobian.push([(rp[0] - r[0]) / h, (rp[1] - r[1]) / h]);
    }
    const det = jacobian[0][0] * jacobian[1][1] - jacobian[0][1] * jacobian[1][0];
    if (Math.abs(det) < NEWTON_MIN_DET) {
      break;
    }
    const rhs0 = -r[0];
    const rhs1 = -r[1];
    const dx = [
      (jacobian[1][1] * rhs0 - jacobian[0][1] * rhs1) / det,
      (-jacobian[1][0] * rhs0 + jacobian[0][0] * rhs1) / det,
    ];
    let step = 1;
    let moved = false;
    for (let halving = 0; halving < NEWTON_STEP_HALVINGS; halving++) {
      const candidate = [
        Math.max(NEWTON_MIN_PARAMETER, p[0] + step * dx[0]),
        Math.max(NEWTON_MIN_PARAMETER, p[1] + step * dx[1]),
      ];
      const rc = residuals(candidate);
      const cost = Math.max(Math.abs(rc[0]), Math.abs(rc[1]));
      if (cost < cost0) {
        p = candidate;
        moved = true;
        break;
      }
      step *= 0.5;
    }
    if (!moved) {
      break;
    }
  }
  return converged ? p : null;
}

// ---- shape sanity -------------------------------------------------------

function orient(a, b, c) {
  const v = cross(sub(b, a), sub(c, a));
  if (Math.abs(v) < 1e-12) {
    return 0;
  }
  return v > 0 ? 1 : -1;
}

function segmentsCross(p1, p2, p3, p4) {
  const o1 = orient(p1, p2, p3);
  const o2 = orient(p1, p2, p4);
  const o3 = orient(p3, p4, p1);
  const o4 = orient(p3, p4, p2);
  return o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0;
}

export function polylineSelfIntersects(points, minGap = SELF_INTERSECTION_MIN_GAP) {
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + minGap; j < points.length - 1; j++) {
      if (segmentsCross(points[i], points[i + 1], points[j], points[j + 1])) {
        return [i, j];
      }
    }
  }
  return null;
}

function sampleSegment(seg, n = SHAPE_SAMPLES) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    out.push(bezierPoint(seg, i / n));
  }
  return out;
}

// The apex must bow the same way as the original curve, and the derived outline
// must not cross itself.
function shapeIsSane(A, E, seg1, seg2, half, C, d, hC, P) {
  const side = cross(d, sub({ x: seg2[0].x, y: seg2[0].y }, E));
  const bow = cross(d, sub(hC, P));
  if (!(side * bow > 0)) {
    return false;
  }
  const points = [A, E, ...sampleSegment(seg1).slice(1), ...sampleSegment(seg2).slice(1),
    ...sampleSegment(half).slice(1), C];
  return polylineSelfIntersects(points) === null;
}

// ---- path level ---------------------------------------------------------

// The packed representation stores a cubic control point as 0x02.
const OFF_CURVE_CUBIC = 0x02;

function isOffCurve(path, pointIndex) {
  return (path.pointTypes[pointIndex] & VarPackedPath.POINT_TYPE_MASK) !== VarPackedPath.ON_CURVE;
}

// Number of consecutive off-curve points walking from the node at contour
// position `rel` in direction `dir`, capped at 3 exactly like the Python
// reference's `_off_curve_run` guard (three handles in a row is not a cubic).
function offCurveRun(path, wrap, rel, dir) {
  let run = 0;
  while (run < 3) {
    if (!isOffCurve(path, wrap(rel + dir * (run + 1)))) {
      break;
    }
    run++;
  }
  return run;
}

function contourSpan(path, contourIndex) {
  const startPoint =
    contourIndex > 0 ? path.contourInfo[contourIndex - 1].endPoint + 1 : 0;
  const endPoint = path.contourInfo[contourIndex].endPoint;
  return {
    startPoint,
    endPoint,
    count: endPoint - startPoint + 1,
    isClosed: !!path.contourInfo[contourIndex].isClosed,
  };
}

/**
 * Derive every line-to-curve squircle join in `path`.
 *
 * Pure: `path` is never mutated. When nothing can be derived the returned
 * `derivedPath` IS the input path, so callers can draw unconditionally.
 *
 * @param {VarPackedPath} path
 * @returns {{derivedPath: VarPackedPath, transitions: Array<object>}}
 */
export function deriveSquircleTransitions(path) {
  const transitions = [];

  for (let contourIndex = 0; contourIndex < path.contourInfo.length; contourIndex++) {
    const span = contourSpan(path, contourIndex);
    const wrap = (rel) =>
      span.isClosed
        ? span.startPoint + (((rel % span.count) + span.count) % span.count)
        : span.startPoint + rel;

    for (let rel = 0; rel < span.count; rel++) {
      const pointIndex = span.startPoint + rel;
      const type = path.pointTypes[pointIndex];
      if (type & VarPackedPath.POINT_TYPE_MASK) {
        continue; // off-curve
      }
      if (!(type & VarPackedPath.SQUIRCLE_FLAG)) {
        continue; // not a squircle node
      }
      if (!span.isClosed) {
        // Python-reference parity: an open contour is never derived (the
        // export draws it exactly as stored), so the canvas must not derive
        // it either -- "屏幕所见必须等于导出所得" is enforced by refusing on
        // BOTH sides, not by hoping the two implementations agree.
        transitions.push({
          contourIndex,
          pointIndex,
          status: "refused",
          reason: "open-contour",
        });
        continue;
      }
      // Classify both sides the way the Python reference does: a side is
      // STRAIGHT when it has NO off-curve points at all, and a usable CURVE
      // only when it is a full cubic (exactly two off-curve points ending in
      // an on-curve one). Anything else is not a line-to-curve join at all.
      const inHandles = offCurveRun(path, wrap, rel, -1);
      const outHandles = offCurveRun(path, wrap, rel, +1);
      const point = (index) => {
        const p = path.getPoint(index);
        return { x: p.x, y: p.y };
      };
      if (inHandles === 0 && outHandles === 2) {
        // the canonical orientation: straight run in, cubic [P, Y, hC, C] out
        const curveA = wrap(rel + 1);
        const curveB = wrap(rel + 2);
        const curveC = wrap(rel + 3);
        if (rel + 3 > span.count - 1) {
          // the curve would wrap around the contour start; a flat-array
          // splice cannot express a cyclic replacement, so refuse (the
          // outline is then drawn exactly as stored)
          transitions.push({
            contourIndex,
            pointIndex,
            status: "refused",
            reason: "the curve side is not a single cubic segment",
          });
          continue;
        }
        const result = deriveLineCurveTransition({
          A: point(wrap(rel - 1)),
          P: point(pointIndex),
          Y: point(curveA),
          hC: point(curveB),
          C: point(curveC),
        });
        transitions.push({
          contourIndex,
          pointIndex,
          replacedFrom: pointIndex,
          replacedCount: 3,
          ...result,
        });
        continue;
      }
      if (outHandles === 0 && inHandles === 2) {
        // Mirrored orientation: the curve ARRIVES and the straight run
        // LEAVES. The Python reference (squircle_transition.py) solves this
        // with the SAME solver on the control-point-reversed curve -- the
        // solver's run A-E-c1-c2-M-g1-g2-Q-h1-h2-C is stored REVERSED, so
        // there is exactly one construction to keep in sync. The replaced
        // slice is [C, h2, h1, P]; the straight side's far point stays.
        const curveA = wrap(rel - 1); // the near handle (h1)
        const curveB = wrap(rel - 2); // the far handle (h2)
        const curveC = wrap(rel - 3); // the curve's far on-curve point (C)
        if (rel - 3 < 0) {
          transitions.push({
            contourIndex,
            pointIndex,
            status: "refused",
            reason: "the curve side is not a single cubic segment",
          });
          continue;
        }
        const result = deriveLineCurveTransition({
          A: point(wrap(rel + 1)), // the straight side's far point
          P: point(pointIndex),
          Y: point(curveA),
          hC: point(curveB),
          C: point(curveC),
        });
        if (result.status !== "ok") {
          transitions.push({
            contourIndex,
            pointIndex,
            status: result.status,
            reason: result.reason,
          });
          continue;
        }
        transitions.push({
          contourIndex,
          pointIndex,
          replacedFrom: curveC,
          replacedCount: 4,
          mirrored: true,
          ...result,
        });
        continue;
      }
      transitions.push({
        contourIndex,
        pointIndex,
        status: "refused",
        reason: "not-a-line-to-curve-join",
      });
    }
  }

  const derived = transitions.filter((t) => t.status === "ok");
  if (!derived.length) {
    return { derivedPath: path, transitions };
  }

  const contours = path.unpackedContours();
  // descending point index, so an earlier splice never invalidates a later one
  const byContour = new Map();
  for (const transition of derived) {
    if (!byContour.has(transition.contourIndex)) {
      byContour.set(transition.contourIndex, []);
    }
    byContour.get(transition.contourIndex).push(transition);
  }
  for (const [contourIndex, list] of byContour) {
    const span = contourSpan(path, contourIndex);
    const points = contours[contourIndex].points;
    list.sort((a, b) => b.replacedFrom - a.replacedFrom);
    for (const transition of list) {
      const { E, c1, c2, M, g1, g2, Q, half } = transition;
      const at = transition.replacedFrom - span.startPoint;
      // Canonical (straight side first): [P, Y, hC] -> E..half[2], C stays.
      // Mirrored (curve arrives): the solver's run is stored REVERSED --
      // [C, h2, h1, P] -> [C, half[2], half[1], Q, g2, g1, M, c2, c1, E],
      // so the contour keeps travelling forwards (no reversal cusp).
      const replacement = transition.mirrored
        ? [
            { x: half[3].x, y: half[3].y },
            { x: half[2].x, y: half[2].y, type: "cubic" },
            { x: half[1].x, y: half[1].y, type: "cubic" },
            { x: Q.x, y: Q.y },
            { x: g2.x, y: g2.y, type: "cubic" },
            { x: g1.x, y: g1.y, type: "cubic" },
            { x: M.x, y: M.y },
            { x: c2.x, y: c2.y, type: "cubic" },
            { x: c1.x, y: c1.y, type: "cubic" },
            { x: E.x, y: E.y },
          ]
        : [
            { x: E.x, y: E.y },
            { x: c1.x, y: c1.y, type: "cubic" },
            { x: c2.x, y: c2.y, type: "cubic" },
            { x: M.x, y: M.y },
            { x: g1.x, y: g1.y, type: "cubic" },
            { x: g2.x, y: g2.y, type: "cubic" },
            { x: Q.x, y: Q.y },
            { x: half[1].x, y: half[1].y, type: "cubic" },
            { x: half[2].x, y: half[2].y, type: "cubic" },
          ];
      points.splice(at, transition.replacedCount, ...replacement);
    }
  }

  return {
    derivedPath: VarPackedPath.fromUnpackedContours(contours),
    transitions,
  };
}

/**
 * Does this path contain any line-to-curve squircle join at all? Cheap
 * pre-check so callers can skip the derivation entirely.
 */
export function hasSquircleTransitionCandidate(path) {
  for (let contourIndex = 0; contourIndex < path.contourInfo.length; contourIndex++) {
    const span = contourSpan(path, contourIndex);
    for (let pointIndex = span.startPoint; pointIndex <= span.endPoint; pointIndex++) {
      const type = path.pointTypes[pointIndex];
      if (type & VarPackedPath.POINT_TYPE_MASK) {
        continue;
      }
      if (!(type & VarPackedPath.SQUIRCLE_FLAG)) {
        continue;
      }
      return true;
    }
  }
  return false;
}

/**
 * Describe the line-to-curve join at on-curve `pointIndex` -- if there is one
 * -- in the canonical orientation the solver expects (straight run first,
 * cubic [P, Y, hC, C] second). Flag-agnostic: the gesture calls this BEFORE
 * the squircle flag exists, to decide whether setting it would be honest.
 *
 * Returns null when the node has no line-to-curve join (both or neither side
 * straight), when the contour is open (the Python reference never derives
 * open contours, so neither may the gesture), or when the curve side is not
 * a single cubic segment. The mirrored orientation (the curve arrives) is
 * resolved here by control-point reversal, exactly like the scan above.
 *
 * @param {VarPackedPath} path
 * @param {number} pointIndex
 * @returns {{A: object, P: object, Y: object, hC: object, C: object} | null}
 */
export function findLineCurveJoin(path, pointIndex) {
  if (path.pointTypes[pointIndex] & VarPackedPath.POINT_TYPE_MASK) {
    return null; // off-curve
  }
  const [contourIndex, contourPointIndex] = path.getContourAndPointIndex(pointIndex);
  const contourInfo = path.contourInfo[contourIndex];
  if (!contourInfo?.isClosed) {
    return null; // open contours are never derived (Python-reference parity)
  }
  const startPoint =
    contourIndex > 0 ? path.contourInfo[contourIndex - 1].endPoint + 1 : 0;
  const count = contourInfo.endPoint - startPoint + 1;
  if (count < 4) {
    return null; // too few points to host a straight run plus a cubic
  }
  const wrap = (rel) => startPoint + (((rel % count) + count) % count);
  const point = (index) => {
    const p = path.getPoint(index);
    return { x: p.x, y: p.y };
  };
  const P = point(pointIndex);
  const inHandles = offCurveRun(path, wrap, contourPointIndex, -1);
  const outHandles = offCurveRun(path, wrap, contourPointIndex, +1);
  if (inHandles === 0 && outHandles === 2) {
    // canonical: straight run in, cubic [P, Y, hC, C] out
    if (contourPointIndex + 3 > count - 1) {
      return null; // the curve would wrap; a flat splice cannot express it
    }
    return {
      A: point(wrap(contourPointIndex - 1)),
      P,
      Y: point(wrap(contourPointIndex + 1)),
      hC: point(wrap(contourPointIndex + 2)),
      C: point(wrap(contourPointIndex + 3)),
    };
  }
  if (outHandles === 0 && inHandles === 2) {
    // mirrored: cubic [C, h2, h1, P] in, straight run out; the solver sees
    // the control-point-reversed curve [P, h1, h2, C]
    if (contourPointIndex - 3 < 0) {
      return null;
    }
    return {
      A: point(wrap(contourPointIndex + 1)),
      P,
      Y: point(wrap(contourPointIndex - 1)),
      hC: point(wrap(contourPointIndex - 2)),
      C: point(wrap(contourPointIndex - 3)),
    };
  }
  return null; // not a line-to-curve join
}

export { OFF_CURVE_CUBIC };

