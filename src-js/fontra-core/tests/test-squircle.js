// Verifies that makeSquircle actually produces a curvature-continuous (G2)
// join in the real path model -- not just that the flag got set.
//
// The check is the same one the solver's own tests use: build the two cubic
// segments meeting at the node, evaluate the curvature VECTOR on each side,
// and compare. A plain smooth node has matching tangents (G1) but a real
// curvature jump; a squircle node must have essentially none.
import { VarPackedPath } from "../src/var-path.js";
import {
  advanceNodeKind,
  makeSquircle,
  toggleSmooth,
} from "../src/path-functions.js";
import * as G from "../src/path-curvature.js";
import {
  deriveLineCurveTransition,
  deriveSquircleTransitions,
  findLineCurveJoin,
} from "../src/squircle-transition.js";

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    failures.push(msg);
  }
}

const SMOOTH_FLAG = 0x08;
const SQUIRCLE_FLAG = 0x10;

// Build a path from a flat point list: {x,y,type?}
function makePath(points, isClosed = false) {
  const coordinates = [];
  const pointTypes = [];
  for (const p of points) {
    coordinates.push(p.x, p.y);
    pointTypes.push(p.type === "cubic" ? 0x02 : 0x00);
  }
  return new VarPackedPath(coordinates, pointTypes, [
    { endPoint: points.length - 1, isClosed },
  ]);
}

// Find the on-curve point sitting at (x, y). Conversions INSERT handles, which
// shifts the node's own index, so tests must re-locate it by position rather
// than reusing the index they started with.
function findOnCurveIndexAt(path, x, y) {
  for (let i = 0; i < path.pointTypes.length; i++) {
    if (path.pointTypes[i] & 0x07) continue; // off-curve
    const pos = path.getPointPosition(i);
    if (pos[0] === x && pos[1] === y) return i;
  }
  return -1;
}

// Describe the two cubic segments meeting at on-curve index `nodeIndex`, in the
// solver's convention:
//   left  = [farOnCurve, farHandle, nodeHandle, node]   (the arriving side)
//   right = [node, nodeHandle, farHandle, farOnCurve]   (the leaving side)
//
// A side carries 0, 1 or 2 off-curve points, so walk outward from the node and
// collect them; a missing handle is placed at the third-point of the segment,
// which is exactly what makes that side a straight line (curvature 0). Getting
// this wrong silently degenerates the segment and makes every curvature check
// vacuously pass, so it deliberately mirrors collectSegmentSide().
function sideAt(path, nodeIndex, dir, isClosed = false) {
  const total = path.coordinates.length / 2;
  const step = (i) => (isClosed ? (i + total) % total : i);
  const handles = [];
  let i = step(nodeIndex + dir);
  let guard = 0;
  while (guard++ < 4 && i >= 0 && i < total) {
    const p = path.getPoint(i);
    if (!p || !p.type) break;
    handles.push({ x: p.x, y: p.y });
    i = step(i + dir);
  }
  const far = i >= 0 && i < total ? path.getPoint(i) : undefined;
  return { handles, far };
}

function segmentsAround(path, nodeIndex, isClosed = false) {
  const node = path.getPoint(nodeIndex);
  const nodeP = { x: node.x, y: node.y };
  const third = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  const inSide = sideAt(path, nodeIndex, -1, isClosed);
  const outSide = sideAt(path, nodeIndex, +1, isClosed);

  const farIn = inSide.far ? { x: inSide.far.x, y: inSide.far.y } : nodeP;
  const farOut = outSide.far ? { x: outSide.far.x, y: outSide.far.y } : nodeP;

  // handles[0] is the one nearest the node; handles[1] is the far one
  const nodeIn = inSide.handles[0] ?? third(farIn, nodeP, 2 / 3);
  const farInH = inSide.handles[1] ?? third(farIn, nodeP, 1 / 3);
  const nodeOut = outSide.handles[0] ?? third(nodeP, farOut, 1 / 3);
  const farOutH = outSide.handles[1] ?? third(nodeP, farOut, 2 / 3);

  return {
    left: [farIn, farInH, nodeIn, nodeP],
    right: [nodeP, nodeOut, farOutH, farOut],
    node: nodeP,
  };
}
function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ---- TEST 1: a curve-curve join goes from a curvature jump to none ----------
{
  // deliberately ASYMMETRIC: equal handle lengths on both sides give G1 but a
  // real curvature jump, which is exactly what squircle should fix
  const path = makePath([
    { x: -300, y: 0 },
    { x: -120, y: 60, type: "cubic" },
    { x: -80, y: 0, type: "cubic" }, // node handle, incoming
    { x: 0, y: 0 }, // NODE
    { x: 80, y: 0, type: "cubic" }, // node handle, outgoing
    { x: 140, y: 30, type: "cubic" },
    { x: 300, y: 0 },
  ]);
  path.pointTypes[3] = SMOOTH_FLAG;

  let seg = segmentsAround(path, 3);
  const before = G.curvatureReport(seg.left, seg.right);
  ok(before.vectorJump > 1e-6, `T1: before, there IS a curvature jump (${before.vectorJump})`);

  const target = makeSquircle(path, [3]);
  ok(target === true, "T1: makeSquircle reports squircle=true");

  const typeAfter = path.pointTypes[3];
  ok(
    (typeAfter & SQUIRCLE_FLAG) !== 0,
    "T1: SQUIRCLE_FLAG set on the node"
  );
  ok(
    (typeAfter & SMOOTH_FLAG) !== 0,
    "T1: squircle node is also smooth (G1)"
  );
  ok(
    (path.getPoint(3).smooth === true) &&
      (path.getPoint(3).squircle === true),
    "T1: getPoint() reports smooth + squircle"
  );

  seg = segmentsAround(path, 3);
  const after = G.curvatureReport(seg.left, seg.right);
  ok(
    after.vectorJump < 1e-6,
    `T1: after, curvature is continuous (${after.vectorJump})`
  );
  console.log(
    `T1 curve-curve: jump ${before.vectorJump.toExponential(3)} -> ${after.vectorJump.toExponential(3)}`
  );
}

// ---- TEST 2: two G2 mechanisms, both exact --------------------------------
// There are two ways to buy curvature continuity at a node:
//   H  re-solve the handle LENGTHS with the node where the user put it -- the
//      closed form, handle ratio = sqrt(C_/A_) -- selected with
//      {allowNodeDrift:false};
//   S  slide the node along its tangent and keep both handles -- FontLab's
//      Harmonize / Glyphs' "effective node" -- the default, chosen when it is
//      the cheaper way (ADR-0010).
// Whichever runs, the join must come out genuinely G2.
{
  const build = () => {
    const p = makePath([
      { x: -300, y: 0 },
      { x: -120, y: 60, type: "cubic" },
      { x: -80, y: 0, type: "cubic" },
      { x: 0, y: 0 },
      { x: 80, y: 0, type: "cubic" },
      { x: 140, y: 30, type: "cubic" },
      { x: 300, y: 0 },
    ]);
    p.pointTypes[3] = SMOOTH_FLAG;
    return p;
  };
  const jumpOf = (path) => {
    const seg = segmentsAround(path, 3);
    return G.curvatureReport(seg.left, seg.right).vectorJump;
  };

  // (a) the in-place closed form
  const inPlace = build();
  makeSquircle(inPlace, [3], undefined, { allowNodeDrift: false });
  const nodeIn = inPlace.getPoint(3);
  ok(
    Math.abs(nodeIn.x) < 1e-9 && Math.abs(nodeIn.y) < 1e-9,
    "T2a: the in-place solve leaves the node where the user put it"
  );
  const pIn = inPlace.getPoint(2);
  const pOut = inPlace.getPoint(4);
  const n = G.norm(G.sub(pOut, nodeIn));
  const hA = { x: -120, y: 60 }; // far handle on the incoming side
  const hC = { x: 140, y: 30 }; // far handle on the outgoing side
  const A_ = G.cross(n, G.sub(hA, nodeIn));
  const C_ = G.cross(n, G.sub(hC, nodeIn));
  const expected = Math.sqrt(C_ / A_);
  const lenIn = G.dist(pIn, nodeIn);
  const lenOut = G.dist(pOut, nodeIn);
  const actual = lenOut / lenIn;
  ok(
    Math.abs(actual - expected) < 1e-6,
    `T2a: handle ratio ${actual.toFixed(6)} == sqrt(C_/A_) ${expected.toFixed(6)}`
  );
  ok(jumpOf(inPlace) < 1e-9, `T2a: the in-place solve is G2 (${jumpOf(inPlace).toExponential(2)})`);

  // (b) the default, whatever mechanism it picks
  const drifted = build();
  makeSquircle(drifted, [3]);
  ok(
    (drifted.pointTypes[3] & SQUIRCLE_FLAG) !== 0,
    "T2b: squircle flag set by the default solve"
  );
  ok(jumpOf(drifted) < 1e-9, `T2b: the default solve is G2 (${jumpOf(drifted).toExponential(2)})`);
}

// ---- TEST 3: the gesture is an ESCALATION (idempotent), not a toggle -------
{
  const path = makePath([
    { x: -300, y: 0 },
    { x: -120, y: 60, type: "cubic" },
    { x: -80, y: 0, type: "cubic" },
    { x: 0, y: 0 },
    { x: 80, y: 0, type: "cubic" },
    { x: 140, y: 30, type: "cubic" },
    { x: 300, y: 0 },
  ]);
  path.pointTypes[3] = SMOOTH_FLAG;
  makeSquircle(path, [3]);
  ok((path.pointTypes[3] & SQUIRCLE_FLAG) !== 0, "T3: on");
  const geometryAfterFirst = Array.from(path.coordinates);

  // Repeating the gesture must be a true no-op: still squircle, geometry
  // untouched. (Shift+double-click means "make this a squircle node", so it may
  // not de-escalate.)
  const again = makeSquircle(path, [3]);
  ok(again === true, "T3: repeating the gesture still reports squircle");
  ok(
    (path.pointTypes[3] & SQUIRCLE_FLAG) !== 0,
    "T3: still a squircle node after repeating"
  );
  ok(
    JSON.stringify(Array.from(path.coordinates)) === JSON.stringify(geometryAfterFirst),
    "T3: repeating the gesture does not touch the geometry"
  );

  // De-escalation is explicit here (the gesture path for it is plain
  // double-click, covered by the transition matrix).
  const off = makeSquircle(path, [3], false);
  ok(off === false, "T3: makeSquircle(force=false) reports squircle=false");
  ok(
    (path.pointTypes[3] & SQUIRCLE_FLAG) === 0,
    "T3: SQUIRCLE_FLAG cleared"
  );
  ok(
    (path.pointTypes[3] & SMOOTH_FLAG) !== 0,
    "T3: still a smooth node after clearing squircle"
  );
  const p = path.getPoint(3);
  ok(p.smooth === true && p.squircle === undefined, "T3: getPoint reflects it");
}

// ---- TEST 4: a line-to-curve join cannot honestly be G2 -------------------
// The straight side has curvature 0, so G2 demands zero curvature at the node on
// the curve side too, which forces that side's handle to the midpoint of
// (node, far handle) -- and that direction is NOT the line's direction. For a
// single pair of cubic segments G1 and G2 are therefore mutually exclusive here.
// Glyphs escapes the contradiction by moving the "effective node" and creating
// points on export; we do not, so the honest answer is: no squircle flag, the node
// stays smooth. ADR-0009 §4 -- the icon must not lie.
{
  const path = makePath([
    { x: -200, y: 0 },
    { x: 0, y: 0 }, // NODE, arriving on a straight line (no handles)
    { x: 40, y: 30, type: "cubic" },
    { x: 90, y: 90, type: "cubic" },
    { x: 60, y: 180 },
  ]);
  path.pointTypes[1] = SMOOTH_FLAG;
  const T4before = JSON.stringify(Array.from(path.coordinates));

  makeSquircle(path, [1]);
  ok(
    (path.pointTypes[1] & SQUIRCLE_FLAG) === 0,
    "T4: no squircle flag where G1 and G2 cannot both hold"
  );
  // and a refused conversion must not damage anything either
  ok(
    JSON.stringify(Array.from(path.coordinates)) === T4before,
    "T4: the refused conversion writes nothing at all"
  );
  console.log("T4 line-curve: G2 refused, geometry untouched");
}

// ---- TEST 4b/4c: ADR-0012 -- a line<->curve join on a CLOSED contour ------
// The stored outline is NOT touched (line meets curve at the node); the G2
// transition is derived at render/export. The gesture therefore only verifies
// the derivation and sets the flag. Both orientations must behave the same
// (the mirrored one is the same join, traversed the other way).
{
  const mkCanonical = () => {
    const p = makePath(
      [
        { x: -400, y: 0 },
        { x: 0, y: 0 }, // NODE: straight in, curve out (the truth-table arc)
        { x: 132, y: 30 - 30, type: "cubic" },
        { x: 268, y: 132, type: "cubic" },
        { x: 400, y: 268 },
        { x: 200, y: 400 },
      ],
      true
    );
    p.pointTypes[1] = SMOOTH_FLAG;
    return p;
  };
  const mkMirrored = () => {
    // the same contour, traversed the other way: the curve ARRIVES at the node
    const p = makePath(
      [
        { x: 400, y: 268 },
        { x: 268, y: 132, type: "cubic" },
        { x: 132, y: 0, type: "cubic" },
        { x: 0, y: 0 }, // NODE: curve in, straight out
        { x: -400, y: 0 },
        { x: 200, y: 400 },
      ],
      true
    );
    p.pointTypes[3] = SMOOTH_FLAG;
    return p;
  };

  for (const [name, mk, nodeIndex] of [
    ["T4b canonical", mkCanonical, 1],
    ["T4c mirrored", mkMirrored, 3],
  ]) {
    const path = mk();
    const before = JSON.stringify(Array.from(path.coordinates));
    const verdict =
      deriveLineCurveTransition(findLineCurveJoin(path, nodeIndex)).status === "ok";
    const result = makeSquircle(path, [nodeIndex]);
    ok(result === verdict, `${name}: makeSquircle reports the derivation verdict`);
    ok(
      (path.pointTypes[nodeIndex] & SQUIRCLE_FLAG) !== 0 === verdict,
      `${name}: the flag tracks the derivation`
    );
    ok(
      JSON.stringify(Array.from(path.coordinates)) === before,
      `${name}: the stored outline is untouched either way (ADR-0012)`
    );
    if (verdict) {
      const { transitions } = deriveSquircleTransitions(path);
      ok(
        transitions.some(
          (t) => t.status === "ok" && t.pointIndex === nodeIndex
        ),
        `${name}: the canvas/export derivation accepts the flagged node`
      );
    }
    console.log(`${name}: verdict=${verdict}, flag tracks it, file untouched`);
  }
}

// ---- TEST 5: degenerate inputs never produce NaN --------------------------
{
  const cases = [
    {
      name: "two-point contour",
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      noEligibleNode: true,
    },
    {
      name: "coincident neighbours",
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 50, y: 0, type: "cubic" },
        { x: 100, y: 0 },
      ],
      nodeIndex: 2,
    },
    {
      name: "opposite bend senses",
      points: [
        { x: -100, y: 10 },
        { x: 0, y: 30, type: "cubic" },
        { x: -40, y: 0, type: "cubic" },
        { x: 0, y: 0 },
        { x: 56, y: 0, type: "cubic" },
        { x: 0, y: -60, type: "cubic" },
        { x: 150, y: 40 },
      ],
      nodeIndex: 3,
      // the two sides bend in opposite senses (an inflection), so G2 is
      // mathematically impossible: the node must be left unflagged rather
      // than displaying a squircle icon for geometry that is not G2
      infeasible: true,
    },
  ];
  for (const c of cases) {
    const path = makePath(c.points);
    const idx = c.nodeIndex ?? 1;
    path.pointTypes[idx] = SMOOTH_FLAG;
    const beforeTypes = Array.from(path.pointTypes);
    const beforeCoords = Array.from(path.coordinates);
    const result = makeSquircle(path, [idx]);

    // A 2-point contour has no node with neighbours on BOTH sides, so nothing
    // is eligible and the call must be a complete no-op. makeSquircle reports
    // false in that case (makeSquircle is an escalation, so it has no
    // "undefined = nothing to do" convention to fall back on).
    if (c.noEligibleNode) {
      ok(result === false, `${c.name}: reports false (nothing eligible)`);
      ok(
        JSON.stringify(Array.from(path.pointTypes)) === JSON.stringify(beforeTypes) &&
          JSON.stringify(Array.from(path.coordinates)) === JSON.stringify(beforeCoords),
        `${c.name}: path left completely untouched`
      );
    } else if (c.infeasible) {
      ok(result === false, `${c.name}: reports false (G2 not achievable)`);
      ok(
        (path.pointTypes[idx] & SQUIRCLE_FLAG) === 0,
        `${c.name}: squircle flag NOT set on an infeasible join`
      );
      ok(
        JSON.stringify(Array.from(path.coordinates)) === JSON.stringify(beforeCoords),
        `${c.name}: geometry left untouched`
      );
    } else {
      ok(typeof result === "boolean", `${c.name}: returns a boolean`);
    }
    // every coordinate must still be finite
    let finite = true;
    for (let i = 0; i < path.coordinates.length; i++) {
      if (!Number.isFinite(path.coordinates[i])) finite = false;
    }
    ok(finite, `${c.name}: no NaN/Infinity in coordinates`);
    console.log(`T5 ${c.name}: -> ${result}`);
  }
}

// ---- TEST 7: a plain square corner becomes a real G1+G2 node --------------
//
// This is the case the user hit: a rectangle corner (two straight lines) is
// shift-double-clicked. Curvature is 0 on BOTH sides there, so a naive solver
// reports "already G2" and would leave a hard corner wearing a squircle icon.
// The conversion must first establish G1 (bending the two straight sides onto a
// shared tangent, which is what a plain double-click does) and then make the
// curvature continuous.
{
  const path = makePath([
    { x: 100, y: 300 }, // A
    { x: 300, y: 300 }, // NODE: a square corner, both sides straight
    { x: 300, y: 100 }, // C
  ]);
  path.pointTypes[1] = 0x00; // a plain corner

  const before = Array.from(path.coordinates);
  const result = makeSquircle(path, [1]);
  ok(result === true, "T7: corner -> squircle reports success");

  // The conversion INSERTS handles, so the node is no longer at index 1 --
  // find it again by position, which is what the editor's own code does too.
  const idx = findOnCurveIndexAt(path, 300, 300);
  ok(idx >= 0, "T7: the node is still present after conversion");
  ok(
    (path.pointTypes[idx] & SQUIRCLE_FLAG) !== 0,
    "T7: squircle flag set"
  );
  ok(
    (path.pointTypes[idx] & SMOOTH_FLAG) !== 0,
    "T7: the node is smooth as well (G2 implies G1)"
  );

  // handles must now exist on both sides (the straight sides became curves)
  const added = path.coordinates.length - before.length;
  ok(added > 0, `T7: handles were created (added ${added / 2} points)`);

  // and the outline must be genuinely tangent + curvature continuous
  const seg = segmentsAround(path, idx);
  const rep = G.curvatureReport(seg.left, seg.right);
  ok(
    rep.vectorJump < 1e-6,
    `T7: curvature is continuous at the converted corner (${rep.vectorJump})`
  );
  // G1 check: the two handles at the node must be collinear through it
  const n = { x: path.getPoint(idx).x, y: path.getPoint(idx).y };
  const vL = G.sub(seg.left[2], n);
  const vR = G.sub(seg.right[1], n);
  const sin2 =
    (G.cross(vL, vR) ** 2) / Math.max(G.len2(vL) * G.len2(vR), 1e-30);
  ok(sin2 < 1e-12, `T7: tangents are collinear (sin^2 = ${sin2})`);
  console.log(
    `T7 corner->squircle: added ${added / 2} pt, curvature jump ${rep.vectorJump.toExponential(3)}, sin^2 ${sin2.toExponential(3)}`
  );
}

// ---- TEST 6: a squircle node survives a serialization round-trip ----------
{
  const path = makePath([
    { x: -300, y: 0 },
    { x: -120, y: 60, type: "cubic" },
    { x: -80, y: 0, type: "cubic" },
    { x: 0, y: 0 },
    { x: 80, y: 0, type: "cubic" },
    { x: 140, y: 30, type: "cubic" },
    { x: 300, y: 0 },
  ]);
  path.pointTypes[3] = SMOOTH_FLAG;
  makeSquircle(path, [3]);

  const copy = new VarPackedPath(
    Array.from(path.coordinates),
    Array.from(path.pointTypes),
    path.contourInfo.map((c) => ({ ...c })),
    null
  );
  ok(
    (copy.pointTypes[3] & SQUIRCLE_FLAG) !== 0,
    "T6: squircle flag survives a round-trip"
  );
  ok(copy.getPoint(3).squircle === true, "T6: getPoint agrees after copy");
}

// ---------------------------------------------------------------------------
// TEST 8: the node-kind state machine, exhaustively.
//
// Two gestures, three states:
//
//   plain double-click   CYCLES  corner -> smooth -> squircle -> corner -> ...
//   Shift + double-click JUMPS to squircle from anywhere, and is a no-op when
//                        already there (it never de-escalates)
//
// The cycle order is increasing continuity, so repeatedly double-clicking walks
// "up" through the kinds. Every step below checks the resulting STATE *and* the
// resulting GEOMETRY, because flags alone can lie: a "smooth" node whose handles
// are not collinear, or a "squircle" node that still has a curvature jump, would
// both be wrong while looking right in the flags.
// ---------------------------------------------------------------------------
const STATE = { corner: 0x00, smooth: 0x08, squircle: 0x18 };

function stateOf(path, idx) {
  const t = path.pointTypes[idx];
  if (t & SQUIRCLE_FLAG) return "squircle";
  if (t & SMOOTH_FLAG) return "smooth";
  return "corner";
}

// build a path whose node at (300,300) starts in the requested state, joining a
// horizontal side to a vertical side (the rectangle-corner situation)
function makeStatePath(state) {
  const A = { x: 100, y: 300 };
  const N = { x: 300, y: 300 };
  const Cnode = { x: 300, y: 100 };
  if (state === "corner") {
    const p = makePath([A, N, Cnode]);
    p.pointTypes[1] = STATE.corner;
    return p;
  }
  // smooth / squircle: give the node collinear handles along the bisector so
  // the starting geometry really is G1 (not a fake-smooth corner)
  const bis = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
  const hIn = { x: N.x - bis.x * 60, y: N.y - bis.y * 60, type: "cubic" };
  const hOut = { x: N.x + bis.x * 60, y: N.y + bis.y * 60, type: "cubic" };
  const p = makePath([
    A,
    { x: 166, y: 300, type: "cubic" },
    hIn,
    N,
    hOut,
    { x: 300, y: 166, type: "cubic" },
    Cnode,
  ]);
  p.pointTypes[3] = STATE[state];
  return p;
}

// the two real gesture entry points
const OPS = {
  dbl: (path, idx) => advanceNodeKind(path, [idx]),
  "shift+dbl": (path, idx) => makeSquircle(path, [idx]),
};

const EXPECTED = {
  corner: { dbl: "smooth", "shift+dbl": "squircle" },
  smooth: { dbl: "squircle", "shift+dbl": "squircle" },
  squircle: { dbl: "corner", "shift+dbl": "squircle" },
};

// a state is only real if its geometry backs it up
function checkGeometry(path, idx, claimed, label) {
  const seg = segmentsAround(path, idx);
  const rep = G.curvatureReport(seg.left, seg.right);
  const n = { x: path.getPoint(idx).x, y: path.getPoint(idx).y };
  const vL = G.sub(seg.left[2], n);
  const vR = G.sub(seg.right[1], n);
  const sin2 =
    (G.cross(vL, vR) ** 2) / Math.max(G.len2(vL) * G.len2(vR), 1e-30);
  if (claimed === "corner") {
    ok(
      (path.pointTypes[idx] & (SMOOTH_FLAG | SQUIRCLE_FLAG)) === 0,
      `${label}: corner carries no smooth/squircle flags`
    );
  }
  if (claimed === "smooth") {
    ok(sin2 < 1e-9, `${label}: smooth handles are collinear (sin^2=${sin2})`);
  }
  if (claimed === "squircle") {
    ok(sin2 < 1e-9, `${label}: squircle is tangent continuous (sin^2=${sin2})`);
    ok(
      rep.vectorJump < 1e-6,
      `${label}: squircle is curvature continuous (${rep.vectorJump})`
    );
  }
  let finite = true;
  for (const c of path.coordinates) if (!Number.isFinite(c)) finite = false;
  ok(finite, `${label}: finite coordinates`);
  return rep;
}

console.log("\n--- single-step transitions ---");
for (const from of ["corner", "smooth", "squircle"]) {
  for (const op of Object.keys(OPS)) {
    const path = makeStatePath(from);
    const idx0 = findOnCurveIndexAt(path, 300, 300);
    ok(idx0 >= 0, `T8 ${from}: node found at the start`);
    ok(stateOf(path, idx0) === from, `T8 ${from}: path really starts as "${from}"`);
    OPS[op](path, idx0);
    const idx = findOnCurveIndexAt(path, 300, 300);
    ok(idx >= 0, `T8 ${from} --${op}--> ?: node still exists`);
    const got = stateOf(path, idx);
    const want = EXPECTED[from][op];
    ok(got === want, `T8 ${from} --${op}--> ${got} (expected ${want})`);
    checkGeometry(path, idx, got, `T8 ${from} --${op}--> ${got}`);
    console.log(`  ${from.padEnd(8)} --${op.padEnd(9)}--> ${got}`);
  }
}

// --- the exact multi-step sequences the product spec calls out ---
const SEQUENCES = [
  { name: "corner: dbl walks up to squircle", start: "corner", steps: ["dbl", "dbl"], want: "squircle" },
  { name: "smooth: dbl once -> squircle", start: "smooth", steps: ["dbl"], want: "squircle" },
  { name: "squircle: dbl -> corner", start: "squircle", steps: ["dbl"], want: "corner" },
  { name: "squircle: dbl x2 -> smooth", start: "squircle", steps: ["dbl", "dbl"], want: "smooth" },
  { name: "squircle: dbl x3 back to squircle", start: "squircle", steps: ["dbl", "dbl", "dbl"], want: "squircle" },
  { name: "corner: full cycle x3 -> corner", start: "corner", steps: ["dbl", "dbl", "dbl"], want: "corner" },
  { name: "smooth: full cycle x3 -> smooth", start: "smooth", steps: ["dbl", "dbl", "dbl"], want: "smooth" },
  { name: "corner: shift+dbl -> squircle", start: "corner", steps: ["shift+dbl"], want: "squircle" },
  { name: "smooth: shift+dbl -> squircle", start: "smooth", steps: ["shift+dbl"], want: "squircle" },
  { name: "squircle: shift+dbl stays squircle", start: "squircle", steps: ["shift+dbl"], want: "squircle" },
  { name: "squircle: shift+dbl x2 stays squircle", start: "squircle", steps: ["shift+dbl", "shift+dbl"], want: "squircle" },
  { name: "corner: shift+dbl then dbl -> corner", start: "corner", steps: ["shift+dbl", "dbl"], want: "corner" },
];

console.log("\n--- gesture sequences ---");
for (const seq of SEQUENCES) {
  const path = makeStatePath(seq.start);
  for (const op of seq.steps) {
    const idx = findOnCurveIndexAt(path, 300, 300);
    OPS[op](path, idx);
  }
  const idx = findOnCurveIndexAt(path, 300, 300);
  const got = stateOf(path, idx);
  ok(
    got === seq.want,
    `T8 seq "${seq.name}": ${seq.start} +[${seq.steps.join(",")}] -> ${got} (expected ${seq.want})`
  );
  checkGeometry(path, idx, got, `T8 seq "${seq.name}"`);
  console.log(
    `  ${seq.name.padEnd(38)} ${seq.start} +[${seq.steps.join(", ")}] -> ${got}`
  );
}

// repeating Shift+double-click must not drift the geometry
{
  const path = makeStatePath("smooth");
  let idx = findOnCurveIndexAt(path, 300, 300);
  makeSquircle(path, [idx]);
  idx = findOnCurveIndexAt(path, 300, 300);
  const once = Array.from(path.coordinates);
  makeSquircle(path, [idx]);
  ok(
    JSON.stringify(Array.from(path.coordinates)) === JSON.stringify(once),
    "T8: Shift+double-click twice does not move the geometry"
  );
}

// ===========================================================================
// TESTS 9-11 -- "the state IS the geometry" (ADR-0011) and the node slide
// (ADR-0010)
// ===========================================================================

// Conversions insert handles AND the G2 solve may slide a node, so a node has to
// be re-located by proximity -- never by a remembered index or an exact
// coordinate. (This is the same discipline the editor follows; the comment in
// findOnCurveIndexAt above is about the pre-drift code path.)
function findOnCurveIndexNear(path, x, y, tolerance = 60) {
  let best = -1;
  let bestDistance = tolerance;
  for (let i = 0; i < path.pointTypes.length; i++) {
    if (path.pointTypes[i] & 0x07) continue; // off-curve
    const p = path.getPoint(i);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
}

// The endpoint curvature magnitude on each side of the join at `idx`.
function curvatureMagnitudes(path, idx, isClosed = false) {
  const seg = segmentsAround(path, idx, isClosed);
  return {
    left: G.curvatureAt(seg.left, 1).mag,
    right: G.curvatureAt(seg.right, 0).mag,
  };
}

// Every node whose icon claims more than its geometry actually delivers.
function honestyProblems(path, isClosed = false) {
  const problems = [];
  for (let i = 0; i < path.pointTypes.length; i++) {
    if (path.pointTypes[i] & 0x07) continue;
    const type = path.pointTypes[i];
    const seg = segmentsAround(path, i, isClosed);
    const n = { x: seg.node.x, y: seg.node.y };
    const vL = G.sub(seg.left[2], n);
    const vR = G.sub(seg.right[1], n);
    const sin2 = (G.cross(vL, vR) ** 2) / Math.max(G.len2(vL) * G.len2(vR), 1e-30);
    if (type & SQUIRCLE_FLAG) {
      const rep = G.curvatureReport(seg.left, seg.right);
      if (rep.vectorJump > 1e-6) {
        problems.push(`point ${i} claims G2 (vectorJump ${rep.vectorJump.toExponential(2)})`);
      }
      if (sin2 > 1e-9) {
        problems.push(`point ${i} claims G2 but not even G1 (sin^2 ${sin2.toExponential(2)})`);
      }
    } else if (type & SMOOTH_FLAG) {
      if (sin2 > 1e-9) {
        problems.push(`point ${i} claims G1 (sin^2 ${sin2.toExponential(2)})`);
      }
    }
  }
  return problems;
}

// ---- TEST 9: the node may slide -- and it slides honestly -----------------
{
  const build = () => {
    const p = makePath([
      { x: -300, y: 0 },
      { x: -120, y: 60, type: "cubic" },
      { x: -80, y: 0, type: "cubic" },
      { x: 0, y: 0 },
      { x: 80, y: 0, type: "cubic" },
      { x: 140, y: 30, type: "cubic" },
      { x: 300, y: 0 },
    ]);
    p.pointTypes[3] = SMOOTH_FLAG;
    return p;
  };
  const path = build();
  const nodeBefore = { ...path.getPoint(3) };
  const handlesBefore = [{ ...path.getPoint(2) }, { ...path.getPoint(4) }];
  makeSquircle(path, [3]);
  const nodeAfter = { ...path.getPoint(3) };
  const handlesAfter = [{ ...path.getPoint(2) }, { ...path.getPoint(4) }];
  const slide = G.dist(nodeBefore, nodeAfter);

  ok(slide > 1e-6, `T9: the node slid (${slide.toFixed(3)} units)`);
  ok(
    G.dist(handlesBefore[0], handlesAfter[0]) < 1e-9 &&
      G.dist(handlesBefore[1], handlesAfter[1]) < 1e-9,
    "T9: both handles stayed exactly where the user drew them"
  );
  // "a slight move": bounded by 10% of the shorter adjacent chord
  const chord = Math.min(
    G.dist(nodeAfter, { x: -300, y: 0 }),
    G.dist(nodeAfter, { x: 300, y: 0 })
  );
  ok(
    slide <= 0.1 * chord + 1e-6,
    `T9: the slide stays a slight move (${slide.toFixed(2)} <= ${(0.1 * chord).toFixed(2)})`
  );
  const seg = segmentsAround(path, 3);
  const rep = G.curvatureReport(seg.left, seg.right);
  ok(rep.vectorJump < 1e-9, `T9: the join is G2 after the slide (${rep.vectorJump.toExponential(2)})`);

  // deterministic, and repeating the gesture is still a no-op
  const twin = build();
  makeSquircle(twin, [3]);
  ok(
    JSON.stringify(Array.from(twin.coordinates)) ===
      JSON.stringify(Array.from(path.coordinates)),
    "T9: the slide is deterministic"
  );
  const afterFirst = JSON.stringify(Array.from(path.coordinates));
  makeSquircle(path, [3]);
  ok(
    JSON.stringify(Array.from(path.coordinates)) === afterFirst,
    "T9: repeating the gesture changes nothing"
  );
  console.log(`T9 node slide: ${slide.toFixed(3)} units, handles untouched, G2 exact`);
}

// ---- TEST 10: downgrading to a corner makes it a REAL corner --------------
{
  const rectangle = () =>
    makePath(
      [
        { x: 150, y: 600 },
        { x: 750, y: 600 },
        { x: 750, y: 200 },
        { x: 150, y: 200 },
      ],
      true
    );

  const path = rectangle();
  advanceNodeKind(path, [1]); // corner -> smooth (inserts handles, bends the line)
  const idx = findOnCurveIndexNear(path, 750, 600);
  advanceNodeKind(path, [idx]); // -> squircle (may slide the node)
  const idx2 = findOnCurveIndexNear(path, 750, 600);
  advanceNodeKind(path, [idx2]); // -> corner

  ok(
    (path.pointTypes[idx2] & (SMOOTH_FLAG | SQUIRCLE_FLAG)) === 0,
    "T10: the node is a corner again"
  );
  const straight = curvatureMagnitudes(path, idx2, true);
  ok(
    straight.left < 1e-9 && straight.right < 1e-9,
    `T10: and BOTH of its runs really are straight (kL=${straight.left.toExponential(2)}, kR=${straight.right.toExponential(2)})`
  );

  // and the next step bends them again, so neither icon lies in either state
  advanceNodeKind(path, [idx2]);
  const bent = curvatureMagnitudes(path, findOnCurveIndexNear(path, 750, 600), true);
  ok(
    bent.left > 1e-9 || bent.right > 1e-9,
    `T10: corner -> smooth bends the line again (kL=${bent.left.toExponential(2)}, kR=${bent.right.toExponential(2)})`
  );

  // Alt+double-click is the flag-only escape hatch: nothing may move
  const alt = rectangle();
  advanceNodeKind(alt, [1]);
  const altIdx = findOnCurveIndexNear(alt, 750, 600);
  advanceNodeKind(alt, [altIdx]);
  const altIdx2 = findOnCurveIndexNear(alt, 750, 600);
  const altBefore = JSON.stringify(Array.from(alt.coordinates));
  advanceNodeKind(alt, [altIdx2], { geometry: false });
  ok(
    (alt.pointTypes[altIdx2] & (SMOOTH_FLAG | SQUIRCLE_FLAG)) === 0,
    "T10: Alt+double-click drops the flags..."
  );
  ok(
    JSON.stringify(Array.from(alt.coordinates)) === altBefore,
    "T10: ...and leaves every single coordinate untouched"
  );
  console.log("T10 corner is a real corner; Alt is flag-only");
}

// ---- TEST 11: downgrading a corner must not leave neighbours lying ---------
{
  const path = makePath(
    [
      { x: 150, y: 600 },
      { x: 750, y: 600 },
      { x: 750, y: 200 },
      { x: 150, y: 200 },
    ],
    true
  );
  for (const [x, y] of [
    [750, 600],
    [150, 600],
    [750, 200],
    [150, 200],
  ]) {
    makeSquircle(path, [findOnCurveIndexNear(path, x, y)]);
  }
  ok(
    honestyProblems(path, true).length === 0,
    "T11: making every corner a squircle leaves every icon honest"
  );

  // a side's far handle belongs to the neighbour, so straightening this corner
  // moves the neighbours' tangents -- they must be repaired, not left claiming
  advanceNodeKind(path, [findOnCurveIndexNear(path, 750, 600)]);
  const problems = honestyProblems(path, true);
  ok(
    problems.length === 0,
    `T11: no neighbour keeps a claim its geometry lost (${problems.join("; ") || "clean"})`
  );
  console.log(
    `T11 neighbour repair: ${problems.length ? problems.join("; ") : "all icons honest"}`
  );
}

console.log("\n===== RESULTS =====");
console.log("pass", pass, "fail", fail);
if (failures.length) {
  console.log("\nFAILURES:");
  failures.forEach((f) => console.log("  -", f));
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED");
}
