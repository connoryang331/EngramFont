// Squircle line-to-curve derived transition -- JS mirror of the Python
// reference implementation.
//
// The cross-language guarantee lives in the shared truth table
// `test-common/squircle-line-curve-vectors.json` (written by the Python side):
// both implementations run these vectors, so any drift between what the canvas
// draws and what the exporter writes turns the suite red (AGENTS.md:
// "屏幕所见必须等于导出所得").
//
// Assumed truth-table schema (one entry per case):
//   { "name": ..., "A": {x,y}, "P": {x,y}, "Y": {x,y}, "hC": {x,y}, "C": {x,y},
//     "setback": <optional>,
//     "expected": { "status": "ok" | "refused",
//                   "E": {x,y}, "c1": {x,y}, "c2": {x,y}, "M": {x,y}, "Q": {x,y},
//                   "g1": {x,y}, "g2": {x,y},
//                   "q": <number>, "s": <number>, "v": <number> } }
// A bare array, or a "cases" key, is accepted as well.

import { expect } from "chai";
import fs from "fs";

import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { VarPackedPath } from "@fontra/core/var-path.js";
import {
  SETBACK_RATIO,
  deriveLineCurveTransition,
  deriveSquircleTransitions,
  polylineSelfIntersects,
  splitCubic,
} from "@fontra/core/squircle-transition.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const POINT_TOLERANCE = 1e-9;
const CURVATURE_TOLERANCE = 1e-9;

const POINT_KEYS = ["E", "c1", "c2", "M", "Q", "g1", "g2"];

const pt = (p) => ({ x: p.x, y: p.y });

function expectPointClose(actual, expected, label) {
  expect(actual, `${label}: missing point`).to.be.an("object");
  expect(actual.x, `${label}.x`).to.be.closeTo(expected.x, POINT_TOLERANCE);
  expect(actual.y, `${label}.y`).to.be.closeTo(expected.y, POINT_TOLERANCE);
}

// Signed curvature of the cubic (p0,p1,p2,p3) at parameter t.
function curvatureAt(seg, t) {
  const [p0, p1, p2, p3] = seg;
  const u = 1 - t;
  const v = {
    x: 3 * (u * u * (p1.x - p0.x) + 2 * u * t * (p2.x - p1.x) + t * t * (p3.x - p2.x)),
    y: 3 * (u * u * (p1.y - p0.y) + 2 * u * t * (p2.y - p1.y) + t * t * (p3.y - p2.y)),
  };
  const a = {
    x: 6 * (u * (p2.x - 2 * p1.x + p0.x) + t * (p3.x - 2 * p2.x + p1.x)),
    y: 6 * (u * (p2.y - 2 * p1.y + p0.y) + t * (p3.y - 2 * p2.y + p1.y)),
  };
  const q = v.x * v.x + v.y * v.y;
  if (!(q > 0)) {
    return 0;
  }
  return (v.x * a.y - v.y * a.x) / Math.pow(q, 1.5);
}

// A straight run A...P meeting the cubic [P, Y, hC, C] -- the prototype's
// "convex quarter-arc" fixture.
const CONVEX_ARC = {
  A: { x: -400, y: 0 },
  P: { x: 0, y: 0 },
  Y: { x: 132, y: 0 },
  hC: { x: 268, y: 132 },
  C: { x: 400, y: 268 },
};

function checkJoinConditions(result, join, label) {
  const { E, c1, c2, M, g1, g2, Q, seg1, seg2, half } = result;
  const segLine = [join.A, join.A, E]; // degenerate stand-in, only its length matters
  void segLine;
  // E: tangent along the line and zero curvature (by construction)
  const d = {
    x: join.P.x - join.A.x,
    y: join.P.y - join.A.y,
  };
  const tangent = { x: c1.x - E.x, y: c1.y - E.y };
  const cross = d.x * tangent.y - d.y * tangent.x;
  expect(Math.abs(cross), `${label}: E tangent along the line`).to.be.lessThan(1e-9);
  expect(
    Math.abs(curvatureAt([E, c1, c2, M], 0)),
    `${label}: zero curvature at E`
  ).to.be.lessThan(CURVATURE_TOLERANCE);
  // M: G1 collinear + equal curvature magnitude, same sense
  const v1 = { x: M.x - c2.x, y: M.y - c2.y };
  const v2 = { x: g1.x - M.x, y: g1.y - M.y };
  expect(
    Math.abs(v1.x * v2.y - v1.y * v2.x) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)),
    `${label}: G1 at M`
  ).to.be.lessThan(1e-9);
  const kM1 = curvatureAt(seg1, 1);
  const kM2 = curvatureAt(seg2, 0);
  expect(Math.abs(Math.abs(kM1) - Math.abs(kM2)), `${label}: curvature magnitude at M`).to.be.lessThan(
    CURVATURE_TOLERANCE
  );
  expect(kM1 * kM2, `${label}: curvature sense at M`).to.be.greaterThan(0);
  // Q: same, against the remaining half of the original curve
  const v3 = { x: Q.x - g2.x, y: Q.y - g2.y };
  const v4 = { x: half[1].x - Q.x, y: half[1].y - Q.y };
  expect(
    Math.abs(v3.x * v4.y - v3.y * v4.x) / (Math.hypot(v3.x, v3.y) * Math.hypot(v4.x, v4.y)),
    `${label}: G1 at Q`
  ).to.be.lessThan(1e-9);
  const kQ2 = curvatureAt(seg2, 1);
  const kQh = curvatureAt(half, 0);
  expect(Math.abs(Math.abs(kQ2) - Math.abs(kQh)), `${label}: curvature magnitude at Q`).to.be.lessThan(
    CURVATURE_TOLERANCE
  );
  expect(kQ2 * kQh, `${label}: curvature sense at Q`).to.be.greaterThan(0);
}

describe("squircle-transition: derived geometry", () => {
  it("derives a G2 transition for a convex arc, exactly at all three joins", () => {
    const result = deriveLineCurveTransition(CONVEX_ARC);
    expect(result.status, `expected a derivation, got: ${result.reason}`).to.equal("ok");
    checkJoinConditions(result, CONVEX_ARC, "convex arc");
  });

  it("is deterministic: the same input gives bit-identical output", () => {
    const a = deriveLineCurveTransition(CONVEX_ARC);
    const b = deriveLineCurveTransition(CONVEX_ARC);
    expect(JSON.stringify(a)).to.equal(JSON.stringify(b));
  });

  it("honours an explicit setback", () => {
    const a = deriveLineCurveTransition(CONVEX_ARC);
    const b = deriveLineCurveTransition(CONVEX_ARC, { setback: 80 });
    expect(b.status).to.equal("ok");
    // the default happens to be 40 on this fixture (SETBACK_RATIO * 400), so use a
    // value that cannot collide with it
    expectPointClose(b.E, { x: -80, y: 0 }, "explicit setback E");
    expect(b.E.x).to.not.equal(a.E.x);
    checkJoinConditions(b, CONVEX_ARC, "setback 80");
  });

  it("splits a cubic exactly (de Casteljau)", () => {
    const [first, second] = splitCubic(
      { x: 0, y: 0 },
      { x: 132, y: 0 },
      { x: 268, y: 132 },
      { x: 400, y: 268 },
      0.5
    );
    expect(second[3]).to.eql({ x: 400, y: 268 });
    expect(first[0]).to.eql({ x: 0, y: 0 });
    expect(second[0]).to.eql(first[3]); // the halves share the split point
  });

  it("detects a self-intersecting polyline", () => {
    // goes right, dips below, then comes back UP through the first run
    const crossing = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 3, y: -3 },
      { x: 3, y: 3 },
    ];
    expect(polylineSelfIntersects(crossing, 2), "crossing polyline").to.be.an("array");
    const straight = [];
    for (let i = 0; i <= 10; i++) straight.push({ x: i, y: 0 });
    expect(polylineSelfIntersects(straight, 2), "straight polyline").to.equal(null);
  });

  it("leaves a path without squircle line/curve joins untouched", () => {
    // A...P...C with P flagged squircle but BOTH sides straight -> not a join we
    // derive. Like the Python reference, the scan reports the refusal as
    // "not-a-line-to-curve-join", and the path comes back unchanged.
    const path = new VarPackedPath(
      [-400, 0, 0, 0, 400, 0],
      [0x00, VarPackedPath.SMOOTH_FLAG | VarPackedPath.SQUIRCLE_FLAG, 0x00],
      [{ endPoint: 2, isClosed: true }]
    );
    const { derivedPath, transitions } = deriveSquircleTransitions(path);
    expect(transitions.map((t) => [t.status, t.reason])).to.eql([
      ["refused", "not-a-line-to-curve-join"],
    ]);
    expect(derivedPath).to.equal(path);
  });

  it("derives through the path API and never mutates its input", () => {
    // straight run into a cubic, node flagged squircle
    const coordinates = [
      -400, 0, //
      0, 0, // node
      132, 0, // near handle
      268, 132, // far handle
      400, 268, // curve end
      200, 400, // back to the start
    ];
    const pointTypes = [
      0x00,
      VarPackedPath.SMOOTH_FLAG | VarPackedPath.SQUIRCLE_FLAG,
      0x02,
      0x02,
      0x00,
      0x00,
    ];
    const path = new VarPackedPath(coordinates, pointTypes, [
      { endPoint: 5, isClosed: true },
    ]);
    const before = JSON.stringify(path.coordinates);
    const { derivedPath, transitions } = deriveSquircleTransitions(path);
    expect(JSON.stringify(path.coordinates), "input path must not be mutated").to.equal(before);
    const ok = transitions.filter((t) => t.status === "ok");
    expect(ok, "expected one derived join in the fixture").to.have.length.greaterThan(0);
    // the derived path has the transition points in place of P, Y, hC
    expect(derivedPath.pointTypes.length).to.equal(pointTypes.length + 6);
    for (let i = 0; i < derivedPath.coordinates.length; i++) {
      expect(Number.isFinite(derivedPath.coordinates[i]), "finite coordinates").to.equal(true);
    }
  });

  it("refuses rather than half-derives: no squircle flag, no transition", () => {
    const path = new VarPackedPath(
      [-400, 0, 0, 0, 132, 0, 268, 132, 400, 268, 200, 400],
      [0x00, VarPackedPath.SMOOTH_FLAG, 0x02, 0x02, 0x00, 0x00],
      [{ endPoint: 5, isClosed: true }]
    );
    const { derivedPath, transitions } = deriveSquircleTransitions(path);
    expect(transitions).to.have.length(0);
    expect(derivedPath).to.equal(path);
  });
});

describe("squircle-transition: shared truth table (screen === export)", () => {
  const vectorsPath = join(
    dirname(__dirname),
    "..",
    "..",
    "test-common",
    "squircle-line-curve-vectors.json"
  );
  const hasVectors = fs.existsSync(vectorsPath);

  it("mirrors the Python reference implementation on every shared vector", function () {
    if (!hasVectors) {
      // The table is written by the Python side; its absence must not make this
      // suite red (it would make `npm test` depend on another agent's progress).
      this.skip();
      return;
    }
    const raw = JSON.parse(fs.readFileSync(vectorsPath, "utf8"));
    const cases = Array.isArray(raw) ? raw : raw.cases || raw.tests || [];
    expect(cases.length, "the truth table should not be empty").to.be.greaterThan(0);

    // the shared schema: points are [x, y] arrays, the join lives under "input"
    const asPoint = (a) => ({ x: a[0], y: a[1] });

    let derivedCount = 0;
    let refusedCount = 0;
    for (const testCase of cases) {
      const label = testCase.name || "vector";
      const input = testCase.input || testCase;
      const curve = input.curve || { near: input.Y, far: input.hC, end: input.C };
      const join = {
        A: asPoint(input.lineFar || input.A),
        P: asPoint(input.node || input.P),
        Y: asPoint(curve.near || curve.Y),
        hC: asPoint(curve.far || curve.hC),
        C: asPoint(curve.end || curve.C),
      };
      const setback = input.setback === undefined ? testCase.setback : input.setback;
      const options = setback === undefined ? {} : { setback };
      const result = deriveLineCurveTransition(join, options);
      const expected = testCase.expected || testCase;
      expect(result.status, `${label}: status`).to.equal(expected.status);
      if (result.status !== "ok") {
        refusedCount++;
        continue;
      }
      derivedCount++;
      for (const key of POINT_KEYS) {
        expectPointClose(pt(result[key]), asPoint(expected[key]), `${label}/${key}`);
      }
      expect(result.q, `${label}/q`).to.be.closeTo(expected.q, POINT_TOLERANCE);
      if (expected.mFrac !== undefined) {
        expect(result.mFrac, `${label}/mFrac`).to.be.closeTo(expected.mFrac, POINT_TOLERANCE);
      }
      expect(result.s, `${label}/s`).to.be.closeTo(expected.s, POINT_TOLERANCE);
      expect(result.v, `${label}/v`).to.be.closeTo(expected.v, POINT_TOLERANCE);
      // the three joins, measured against the Python reference's own numbers
      const kE = curvatureAt([result.E, result.c1, result.c2, result.M], 0);
      const k1m = curvatureAt(result.seg1, 1);
      const k2m = curvatureAt(result.seg2, 0);
      const k2q = curvatureAt(result.seg2, 1);
      if (expected.kE !== undefined) {
        expect(kE, `${label}/kE`).to.be.closeTo(expected.kE, CURVATURE_TOLERANCE);
      }
      if (expected.k1m !== undefined) {
        expect(k1m, `${label}/k1m`).to.be.closeTo(expected.k1m, CURVATURE_TOLERANCE);
      }
      if (expected.k2m !== undefined) {
        expect(k2m, `${label}/k2m`).to.be.closeTo(expected.k2m, CURVATURE_TOLERANCE);
      }
      if (expected.k2q !== undefined) {
        expect(k2q, `${label}/k2q`).to.be.closeTo(expected.k2q, CURVATURE_TOLERANCE);
      }
      checkJoinConditions(result, join, label);
    }
    // a truth table that only ever derives (or only ever refuses) would not
    // exercise the accept/reject logic at all
    expect(derivedCount, "truth table should contain derived cases").to.be.greaterThan(0);
    expect(refusedCount, "truth table should contain refused cases").to.be.greaterThan(0);
  });

  it("exposes the setback rule the vectors were generated with", () => {
    // If the Python reference uses a different setback ratio, the numbers above
    // cannot match; this is the one knob to reconcile.
    expect(SETBACK_RATIO).to.be.a("number");
  });

  it("mirrors the Python reference on every shared path case", function () {
    if (!hasVectors) {
      this.skip();
      return;
    }
    const raw = JSON.parse(fs.readFileSync(vectorsPath, "utf8"));
    const pathCases = raw.pathCases || [];
    expect(pathCases.length, "the path-level table should not be empty").to.be.greaterThan(
      0
    );

    for (const pathCase of pathCases) {
      const label = pathCase.name || "path case";
      const contour = pathCase.input.contour;
      const path = new VarPackedPath(
        contour.flatMap((p) => [p.x, p.y]),
        contour.map((p) => p.pointType),
        [{ endPoint: contour.length - 1, isClosed: pathCase.input.isClosed }]
      );
      const before = JSON.stringify(path.coordinates);
      const { derivedPath, transitions } = deriveSquircleTransitions(path);
      const expected = pathCase.expected;

      // deriving must never touch the path it was handed
      expect(JSON.stringify(path.coordinates), `${label}: input untouched`).to.equal(
        before
      );

      if (expected.status !== "ok") {
        expect(
          transitions.map((t) => [t.status, t.reason]),
          `${label}: refusal diagnostics`
        ).to.eql([["refused", expected.reason]]);
        // a refusal must draw exactly the stored outline
        expect(derivedPath, `${label}: draws the stored outline`).to.equal(path);
        continue;
      }

      const okTransitions = transitions.filter((t) => t.status === "ok");
      expect(okTransitions, `${label}: one derived join`).to.have.lengthOf(1);
      expect(okTransitions[0].pointIndex, `${label}: flagged point`).to.equal(
        expected.pointIndex
      );
      expect(derivedPath.pointTypes.length, `${label}: derived point count`).to.equal(
        expected.contour.length
      );
      expected.contour.forEach((p, i) => {
        expect(derivedPath.coordinates[i * 2], `${label}: x[${i}]`).to.be.closeTo(
          p.x,
          POINT_TOLERANCE
        );
        expect(derivedPath.coordinates[i * 2 + 1], `${label}: y[${i}]`).to.be.closeTo(
          p.y,
          POINT_TOLERANCE
        );
        expect(derivedPath.pointTypes[i], `${label}: pointType[${i}]`).to.equal(
          p.pointType
        );
      });
    }
  });
});
