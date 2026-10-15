import { Bezier } from "bezier-js";
import { fitCubic } from "./fit-cubic.js";
import {
  arrayExtend,
  assert,
  enumerate,
  isObjectEmpty,
  modulo,
  pointCompareFunc,
  range,
  reversed,
  uniqueID,
  zip,
} from "./utils.ts";
import {
  POINT_TYPE_OFF_CURVE_CUBIC,
  POINT_TYPE_OFF_CURVE_QUAD,
  VarPackedPath,
  arePathsCompatible,
} from "./var-path.js";
import * as vector from "./vector.js";
import {
  makeSuperSmooth,
  makeSuperSmoothWithNodeDrift,
  curvatureAt,
} from "./path-curvature.js";
import {
  deriveLineCurveTransition,
  findLineCurveJoin,
} from "./squircle-transition.js";

export function insertPoint(path, intersection, ...additionalSameSegmentIntersections) {
  assert(
    additionalSameSegmentIntersections.every(
      (additionalIntersection) =>
        intersection.contourIndex == additionalIntersection.contourIndex &&
        intersection.segmentIndex == additionalIntersection.segmentIndex
    ),
    "segments should be the same"
  );
  const ts = [
    intersection.t,
    ...additionalSameSegmentIntersections.map(
      (additionalIntersection) => additionalIntersection.t
    ),
  ];

  ts.sort((a, b) => {
    assert(a >= b, "segments must be sorted by t");
    return 1;
  });

  const numPointsPath = path.numPoints;
  let numPointsInserted = 0;
  let selectedPointIndices = [];
  const segment = intersection.segment;
  const [contourIndex, contourPointIndex] = path.getContourAndPointIndex(
    segment.parentPointIndices[0]
  );
  const numContourPoints = path.getNumPointsOfContour(contourIndex);
  const absToRel = contourPointIndex - segment.parentPointIndices[0];
  let insertIndex = segment.pointIndices.at(-1) + absToRel;
  if (segment.points.length === 2) {
    // insert point in line
    const points = segment.pointIndices.map((i) => path.getPoint(i));
    if (insertIndex <= 0) {
      insertIndex = numContourPoints;
    }
    path.insertPoint(
      contourIndex,
      insertIndex,
      vector.roundVector(vector.interpolateVectors(...points, intersection.t))
    );
    selectedPointIndices.push(path.getAbsolutePointIndex(contourIndex, insertIndex));
    numPointsInserted = 1;
  } else {
    // insert point in curve
    const segments = [...path.iterContourDecomposedSegments(contourIndex)];
    const segment = segments[intersection.segmentIndex];
    const bezier = new Bezier(...segment.points);
    const firstOffCurve = path.getPoint(segment.parentPointIndices[1]);
    const splitBeziers = bezierSplitMultiple(bezier, ts);
    if (firstOffCurve.type === "cubic") {
      const points = [];
      let localIndices = [];
      let localIndex = 0;
      for (const bezierElement of splitBeziers) {
        const pointsTemp = [...bezierElement.points.slice(1)].map(vector.roundVector);
        pointsTemp[0].type = "cubic";
        pointsTemp[1].type = "cubic";
        pointsTemp[2].smooth = true;
        points.push(...pointsTemp);
        localIndices.push(localIndex);
        localIndex += 3;
      }
      points.pop(); // remove last on-curve point
      localIndices.pop(); // remove last index

      const deleteIndices = segment.parentPointIndices.slice(1, -1);
      if (insertIndex < deleteIndices.length) {
        insertIndex = numContourPoints;
      }

      for (const point of reversed(points)) {
        path.insertPoint(contourIndex, insertIndex, point);
        numPointsInserted++;
      }

      deleteIndices.sort((a, b) => b - a); // reverse sort
      deleteIndices.forEach((pointIndex) => {
        path.deletePoint(contourIndex, pointIndex + absToRel);
        numPointsInserted--;
      });

      const startPointIndex = path.getAbsolutePointIndex(contourIndex, 0);
      selectedPointIndices = localIndices.map((i) => startPointIndex + insertIndex + i);
    } else {
      // quad
      const points = [];
      let localIndices = [];
      let localIndex = 0;
      for (const bezierElement of splitBeziers) {
        const pointsTemp = [bezierElement.points[1], bezierElement.points[2]].map(
          vector.roundVector
        );
        pointsTemp[0].type = "quad";
        pointsTemp[1].smooth = true;
        points.push(...pointsTemp);

        localIndices.push(localIndex);
        localIndex += 2;
      }
      points.pop(); // remove last on-curve point
      localIndices.pop(); // remove last index

      const point1 = path.getPoint(segment.pointIndices[0]);
      const point2 = path.getPoint(segment.pointIndices[1]);
      const point3 = path.getPoint(segment.pointIndices[2]);
      insertIndex = segment.pointIndices[1] + absToRel;
      if (point3.type) {
        path.insertPoint(contourIndex, insertIndex + 1, impliedPoint(point2, point3));
      }
      if (point1.type) {
        path.insertPoint(contourIndex, insertIndex, impliedPoint(point1, point2));
        insertIndex++;
      }

      // Delete off-curve
      path.deletePoint(contourIndex, insertIndex);

      // Insert split
      for (const point of reversed(points)) {
        path.insertPoint(contourIndex, insertIndex, point);
      }

      const startPointIndex = path.getAbsolutePointIndex(contourIndex, 0);
      selectedPointIndices = localIndices.map(
        (i) => startPointIndex + insertIndex + i + 1
      );
      numPointsInserted = path.numPoints - numPointsPath;
    }
  }

  return { numPointsInserted, selectedPointIndices };
}

function impliedPoint(pointA, pointB) {
  return {
    x: Math.round((pointA.x + pointB.x) / 2),
    y: Math.round((pointA.y + pointB.y) / 2),
    smooth: true,
  };
}

function bezierSplitMultiple(bezier, ts) {
  // it's possible to have 3 ts
  ts = [0, ...ts, 1];
  const splitBeziers = [];
  for (const i of range(ts.length - 1)) {
    const bezierElement = bezier.split(ts[i], ts[i + 1]);
    splitBeziers.push(bezierElement);
  }
  return splitBeziers;
}

export function insertHandles(path, segmentPoints, insertIndex, type = "cubic") {
  let [contourIndex, contourPointIndex] = path.getContourAndPointIndex(insertIndex);
  if (!contourPointIndex) {
    contourPointIndex = path.getNumPointsOfContour(contourIndex);
  }
  insertIndex = path.getAbsolutePointIndex(contourIndex, contourPointIndex, true);
  const handlePoints = [
    vector.interpolateVectors(...segmentPoints, 1 / 3),
    vector.interpolateVectors(...segmentPoints, 2 / 3),
  ].map((pt) => {
    return { ...vector.roundVector(pt), type: type };
  });
  path.insertPoint(contourIndex, contourPointIndex, handlePoints[1]);
  path.insertPoint(contourIndex, contourPointIndex, handlePoints[0]);
  return new Set([`point/${insertIndex}`, `point/${insertIndex + 1}`]);
}

export function filterPathByPointIndices(path, pointIndices, doCut = false) {
  const selectionByContour = getSelectionByContour(path, pointIndices);
  const filteredUnpackedContours = [];
  const remainingUnpackedContours = doCut ? new Map() : null;
  for (const [contourIndex, contourPointIndices] of selectionByContour.entries()) {
    const contour = path.getUnpackedContour(contourIndex);
    const numContourPoints = contour.points.length;
    const startPoint = path.getAbsolutePointIndex(contourIndex, 0);
    const indexSet = makeExpandedIndexSet(
      path,
      contourPointIndices,
      contourIndex,
      startPoint
    );
    if (indexSet.size === numContourPoints) {
      // Easy: the whole contour is copied
      filteredUnpackedContours.push(contour);
      remainingUnpackedContours?.set(contourIndex, []);
      continue;
    }
    // Split
    const filteredIndices = [...indexSet];
    filteredIndices.sort((a, b) => a - b);
    const filteredRanges = splitContourPointRanges(
      filteredIndices,
      contour.isClosed,
      numContourPoints
    );
    filteredUnpackedContours.push(
      ...rangesToContours(path, startPoint, filteredRanges)
    );
    if (doCut) {
      const remainingRanges = invertContourPointRanges(
        filteredRanges,
        contour.isClosed,
        numContourPoints
      );
      remainingUnpackedContours.set(contourIndex, [
        ...rangesToContours(path, startPoint, remainingRanges),
      ]);
    }
  }
  if (doCut) {
    // replace selected contours with remainingUnpackedContours
    const remainingContourIndices = [...remainingUnpackedContours.keys()];
    // Reverse-sort the contour indices, so we can replace contours
    // with multiple split contours without invalidating the prior
    // contour indices
    remainingContourIndices.sort((a, b) => b - a);
    for (const contourIndex of remainingContourIndices) {
      path.deleteContour(contourIndex);
      for (const contour of reversed(remainingUnpackedContours.get(contourIndex))) {
        path.insertUnpackedContour(contourIndex, contour);
      }
    }
  }
  return VarPackedPath.fromUnpackedContours(filteredUnpackedContours);
}

function makeExpandedIndexSet(
  path,
  contourPointIndices,
  contourIndex,
  startPoint,
  greedy = true
) {
  // Given a "sparse" selection, fill in the gaps by adding all off-curve points
  // that are included in selected segments
  const indexSet = new Set(contourPointIndices);
  for (const segment of path.iterContourSegmentPointIndices(contourIndex)) {
    const indices = segment.pointIndices.map((i) => i - startPoint);
    const firstPointIndex = indices[0];
    const lastPointIndex = indices.at(-1);
    if (
      (greedy &&
        indices.length > 2 &&
        indices.slice(1, -1).some((i) => indexSet.has(i))) ||
      (indexSet.has(firstPointIndex) && indexSet.has(lastPointIndex))
    ) {
      indices.forEach((i) => indexSet.add(i));
    }
  }
  return indexSet;
}

export function splitPathAtPointIndices(path, pointIndices) {
  let numSplits = 0;
  const selectionByContour = getSelectionByContour(path, pointIndices);
  const selectedContours = [...selectionByContour.keys()];
  // Reverse-sort the contour indices, so we can replace contours
  // with multiple split contours without invalidating the prior
  // contour indices
  selectedContours.sort((a, b) => b - a);

  for (const contourIndex of selectedContours) {
    const contour = path.getUnpackedContour(contourIndex);
    const isClosed = path.contourInfo[contourIndex].isClosed;
    const points = contour.points;
    // Filter out off-curve points, as well as start and end points of open paths
    const contourPointIndices = selectionByContour
      .get(contourIndex)
      .filter((i) => !points[i].type && (isClosed || (i > 0 && i < points.length - 1)));
    if (!contourPointIndices.length) {
      continue;
    }
    numSplits += contourPointIndices.length;

    const pointArrays = [points];
    let pointIndexBias = 0;
    if (isClosed) {
      const splitPointIndex = contourPointIndices.pop();
      pointArrays[0] = splitClosedPointsArray(points, splitPointIndex);
      pointIndexBias = points.length - splitPointIndex;
    }

    for (const splitPointIndex of reversed(contourPointIndices)) {
      const points = pointArrays.pop();
      const [points1, points2] = splitOpenPointsArray(
        points,
        splitPointIndex + pointIndexBias
      );
      pointArrays.push(points2);
      pointArrays.push(points1);
    }

    path.deleteContour(contourIndex);
    // Insert the split contours in reverse order
    for (const points of pointArrays) {
      // Ensure the end points are not smooth
      delete points[0].smooth;
      delete points[points.length - 1].smooth;
      path.insertUnpackedContour(contourIndex, { points: points, isClosed: false });
    }
  }
  return numSplits;
}

function splitClosedPointsArray(points, splitPointIndex) {
  return points.slice(splitPointIndex).concat(points.slice(0, splitPointIndex + 1));
}

function splitOpenPointsArray(points, splitPointIndex) {
  if (!splitPointIndex || splitPointIndex >= points.length - 1) {
    throw new Error(`assert -- invalid point index ${splitPointIndex}`);
  }
  return [points.slice(0, splitPointIndex + 1), points.slice(splitPointIndex)];
}

export function connectContours(path, sourcePointIndex, targetPointIndex) {
  let selectedPointIndex;
  const [sourceContourIndex, sourceContourPointIndex] =
    path.getContourAndPointIndex(sourcePointIndex);
  const [targetContourIndex, targetContourPointIndex] =
    path.getContourAndPointIndex(targetPointIndex);
  if (sourceContourIndex == targetContourIndex) {
    // Close contour
    path.contourInfo[sourceContourIndex].isClosed = true;
    if (sourceContourPointIndex) {
      path.deletePoint(sourceContourIndex, sourceContourPointIndex);
    } else {
      // Ensure the target point becomes the start point
      path.setPoint(sourcePointIndex, path.getPoint(targetPointIndex));
      path.deletePoint(sourceContourIndex, targetContourPointIndex);
    }
    selectedPointIndex = sourceContourPointIndex ? targetPointIndex : sourcePointIndex;
  } else {
    // Connect contours
    const sourceContour = path.getUnpackedContour(sourceContourIndex);
    const targetContour = path.getUnpackedContour(targetContourIndex);
    if (!!sourceContourPointIndex == !!targetContourPointIndex) {
      targetContour.points.reverse();
    }
    sourceContour.points.splice(
      sourceContourPointIndex ? -1 : 0,
      1,
      ...targetContour.points
    );
    path.deleteContour(sourceContourIndex);
    path.insertUnpackedContour(sourceContourIndex, sourceContour);
    path.deleteContour(targetContourIndex);

    selectedPointIndex = path.getAbsolutePointIndex(
      targetContourIndex < sourceContourIndex
        ? sourceContourIndex - 1
        : sourceContourIndex,
      sourceContourPointIndex
        ? sourceContourPointIndex
        : targetContour.points.length - 1
    );
  }
  return new Set([`point/${selectedPointIndex}`]);
}

export function deleteSelectedPoints(path, pointIndices) {
  // `pointIndices` must be sorted
  const contourFragmentsToDelete = preparePointDeletion(path, pointIndices);
  const contoursToDelete = [];
  for (const { contourIndex, fragmentsToDelete, startPoint } of reversed(
    contourFragmentsToDelete
  )) {
    if (!fragmentsToDelete) {
      contoursToDelete.push(contourIndex);
      continue;
    }
    let indexBias = 0;
    for (const fragment of reversed(fragmentsToDelete)) {
      const indices = fragment.indices.map((i) => i + indexBias);

      if (!fragment.contour) {
        // Start or end fragment of an open path: just delete points
        for (const index of reversed(indices)) {
          path.deletePoint(contourIndex, index);
        }
        continue;
      }

      const points = fragment.contour.points;
      const { curveType, onlyOffCurvePoints } = determineDominantCurveType(
        points.slice(1, -1)
      );
      const firstIndex = indices[0];
      const lastIndex = indices.at(-1);
      const wraps = lastIndex < firstIndex;
      if (wraps && indexBias) {
        throw new Error("assert -- unexpected index bias");
      }
      let insertIndex = firstIndex + 1;

      let newPoints;

      if (curveType && !onlyOffCurvePoints) {
        newPoints = computeHandlesFromFragment(curveType, fragment.contour);
      } else {
        newPoints = [];
        path.setPointType(indices[0] + startPoint + 0, points[0].type, false);
        path.setPointType(indices.at(-1) + startPoint + 0, points.at(-1).type, false);
      }
      for (const newPoint of newPoints) {
        path.insertPoint(contourIndex, insertIndex, newPoint);
        insertIndex++;
      }

      const delIndices = indices.slice(1, -1);
      delIndices.sort((a, b) => b - a); // reverse sort
      for (const index of delIndices) {
        let adjustedIndex;
        if (wraps && index < lastIndex) {
          adjustedIndex = index;
          indexBias--;
        } else {
          adjustedIndex = index + newPoints.length;
        }
        path.deletePoint(contourIndex, adjustedIndex);
      }
    }
  }

  contoursToDelete.sort((a, b) => b - a); // reverse sort
  contoursToDelete.forEach((i) => path.deleteContour(i));
}

function preparePointDeletion(path, pointIndices) {
  const contourFragmentsToDelete = [];
  const selectionByContour = getSelectionByContour(path, pointIndices);
  for (const [contourIndex, contourPointIndices] of selectionByContour.entries()) {
    contourFragmentsToDelete.push(
      findContourFragments(path, contourIndex, contourPointIndices)
    );
  }
  return contourFragmentsToDelete;
}

function findContourFragments(path, contourIndex, contourPointIndices) {
  const contour = path.getUnpackedContour(contourIndex);
  const startPoint = path.getAbsolutePointIndex(contourIndex, 0);

  const fragmentsToDelete = [];
  let allSelected = true;
  let previousSegment = null;
  for (const segment of iterSelectedSegments(
    path,
    contourPointIndices,
    contourIndex,
    startPoint
  )) {
    if (segment.selected) {
      if (previousSegment && segment.firstPointSelected) {
        fragmentsToDelete.at(-1).push(segment);
      } else {
        fragmentsToDelete.push([segment]);
      }
      previousSegment = segment.lastPointSelected ? segment : null;
      if (!segment.firstPointSelected || !segment.lastPointSelected) {
        allSelected = false;
      }
    } else {
      allSelected = false;
      previousSegment = null;
    }
  }

  if (
    fragmentsToDelete.length > 1 &&
    contour.isClosed &&
    previousSegment &&
    fragmentsToDelete[0]?.[0].firstPointSelected
  ) {
    // Wrap around
    fragmentsToDelete.at(-1).push(...fragmentsToDelete[0]);
    fragmentsToDelete.shift();
  }

  const { firstOnCurveIndex, lastOnCurveIndex } = findBoundaryOnCurvePoints(contour);

  const contourFragments = !allSelected
    ? fragmentsToDelete.map((segments) =>
        segmentsToContour(
          segments,
          path,
          contourIndex,
          startPoint,
          contour.isClosed,
          firstOnCurveIndex,
          lastOnCurveIndex
        )
      )
    : null;

  const { deleteLeadingOffCurves, deleteTrailingOffCurves } =
    shouldDeleteDanglingOffCurves(
      contour,
      contourPointIndices,
      firstOnCurveIndex,
      lastOnCurveIndex
    );

  if (deleteLeadingOffCurves) {
    contourFragments.unshift({ indices: [...range(0, firstOnCurveIndex)] });
  }
  if (deleteTrailingOffCurves) {
    contourFragments.push({
      indices: [...range(lastOnCurveIndex + 1, contour.points.length)],
    });
  }

  return {
    contourIndex,
    fragmentsToDelete: contourFragments,
    startPoint,
  };
}

function* iterSelectedSegments(path, contourPointIndices, contourIndex, startPoint) {
  const indexSet = new Set(contourPointIndices);
  for (const segment of path.iterContourSegmentPointIndices(contourIndex)) {
    const indices = segment.pointIndices.map((i) => i - startPoint);
    const firstPointSelected = indexSet.has(indices[0]);
    const lastPointSelected = indexSet.has(indices.at(-1));
    const selected =
      firstPointSelected ||
      lastPointSelected ||
      (indices.length > 2 && indices.slice(1, -1).some((i) => indexSet.has(i)));
    yield { selected, firstPointSelected, lastPointSelected, ...segment };
  }
}

function segmentsToContour(
  segments,
  path,
  contourIndex,
  startPoint,
  isClosed,
  firstOnCurveIndex,
  lastOnCurveIndex
) {
  let indices = [segments[0].pointIndices[0]];
  for (const segment of segments) {
    indices.push(...segment.pointIndices.slice(1));
  }
  indices = indices.map((i) => i - startPoint);

  if (!isClosed) {
    if (indices[0] === firstOnCurveIndex && segments[0].firstPointSelected) {
      // Delete entire leading fragment
      return { indices: [...range(0, indices.at(-1))] };
    } else if (
      indices.at(-1) === lastOnCurveIndex &&
      segments.at(-1).lastPointSelected
    ) {
      // Delete entire trailing fragment
      return {
        indices: [...range(indices[1], path.getNumPointsOfContour(contourIndex))],
      };
    }
  }

  return {
    indices,
    contour: {
      isClosed: false,
      points: indices.map((i) => path.getPoint(i + startPoint)),
    },
  };
}

function findBoundaryOnCurvePoints(contour) {
  let firstOnCurveIndex, lastOnCurveIndex;
  if (!contour.isClosed) {
    for (const [index, point] of enumerate(contour.points)) {
      if (!point.type) {
        if (firstOnCurveIndex === undefined) {
          firstOnCurveIndex = index;
        }
        lastOnCurveIndex = index;
      }
    }
  }
  return { firstOnCurveIndex, lastOnCurveIndex };
}

function shouldDeleteDanglingOffCurves(
  contour,
  contourPointIndices,
  firstOnCurveIndex,
  lastOnCurveIndex
) {
  const deleteLeadingOffCurves = firstOnCurveIndex
    ? contourPointIndices.some((i) => i < firstOnCurveIndex) &&
      contourPointIndices.indexOf(firstOnCurveIndex) < 0
    : false;
  const deleteTrailingOffCurves =
    lastOnCurveIndex !== contour.points.length - 1
      ? contourPointIndices.some((i) => i > lastOnCurveIndex) &&
        contourPointIndices.indexOf(lastOnCurveIndex) < 0
      : false;

  return { deleteLeadingOffCurves, deleteTrailingOffCurves };
}

function determineDominantCurveType(points) {
  const numOffCurvePoints = points.reduce((acc, pt) => acc + (pt.type ? 1 : 0), 0);
  const numQuadPoints = points.reduce(
    (acc, pt) => acc + (pt.type == POINT_TYPE_OFF_CURVE_QUAD ? 1 : 0),
    0
  );
  const curveType = numOffCurvePoints
    ? numQuadPoints > numOffCurvePoints / 2
      ? POINT_TYPE_OFF_CURVE_QUAD
      : POINT_TYPE_OFF_CURVE_CUBIC
    : null;
  return { curveType, onlyOffCurvePoints: numOffCurvePoints === points.length };
}

function computeHandlesFromFragment(curveType, contour) {
  const betweenOffCurvePoints = simpleTangentDeletion(contour.points);
  if (betweenOffCurvePoints) {
    // Don't refit the curve, this is more intuitive in most cases
    return betweenOffCurvePoints;
  }

  const path = VarPackedPath.fromUnpackedContours([contour]);
  const samplePoints = [contour.points[0]];
  for (const segment of path.iterContourDecomposedSegments(0)) {
    const points = segment.points;
    if (points.length >= 3) {
      const bezier = new Bezier(...points);
      const ts = [0.2, 0.4, 0.6, 0.8];
      ts.forEach((t) => samplePoints.push(bezier.compute(t)));
    }
    samplePoints.push(points.at(-1));
  }
  const leftTangent = getEndTangent(contour.points, true);
  const rightTangent = getEndTangent(contour.points, false);

  const bezier = fitCubic(samplePoints, leftTangent, rightTangent, 0.5);
  let handle1, handle2;
  handle1 = bezier.points[1];
  handle2 = bezier.points[2];
  if (curveType === POINT_TYPE_OFF_CURVE_QUAD) {
    handle1 = scalePoint(contour.points[0], handle1, 0.75);
    handle2 = scalePoint(contour.points.at(-1), handle2, 0.75);
  }
  return [
    { ...handle1, type: curveType },
    { ...handle2, type: curveType },
  ];
}

function simpleTangentDeletion(points) {
  // See if either end segment is a straight line, and there are no other on-curve
  // points. Just delete the tangent(s) in that case.
  const betweenPoints = points.slice(1, -1);
  const numOnCurvePoints = betweenPoints.reduce(
    (acc, pt) => acc + (!pt.type ? 1 : 0),
    0
  );

  // If the first/last in-between point is either an on-curve that coincides with
  // the first/last point, or it is a smooth on-curve point, then we can delete it
  // without refitting the curve
  const canDeleteFirstBetween =
    !betweenPoints[0].type &&
    (betweenPoints[0].smooth || pointsEqual(points[0], betweenPoints[0]));
  const canDeleteLastBetween =
    !betweenPoints.at(-1).type &&
    (betweenPoints.at(-1).smooth || pointsEqual(points.at(-1), betweenPoints.at(-1)));

  if (numOnCurvePoints === 2 && canDeleteFirstBetween && canDeleteLastBetween) {
    return betweenPoints.slice(1, -1);
  } else if (numOnCurvePoints === 1) {
    if (canDeleteFirstBetween) {
      return betweenPoints.slice(1);
    } else if (canDeleteLastBetween) {
      return betweenPoints.slice(0, -1);
    }
  }
}

function getEndTangent(points, isStart) {
  return vector.normalizeVector(
    vector.subVectors(points.at(isStart ? 1 : -2), points.at(isStart ? 0 : -1))
  );
}

export function scalePoint(pinPoint, point, factor) {
  return vector.addVectors(
    pinPoint,
    vector.mulVectorScalar(vector.subVectors(point, pinPoint), factor)
  );
}

function pointsEqual(point1, point2) {
  return point1.x === point2.x && point1.y === point2.y;
}

export function getSelectionByContour(path, pointIndices) {
  const selectionByContour = new Map();
  for (const pointIndex of pointIndices) {
    if (pointIndex >= path.numPoints) {
      // Ignore out-of-bounds indices
      continue;
    }
    const [contourIndex, contourPointIndex] = path.getContourAndPointIndex(pointIndex);
    if (!selectionByContour.has(contourIndex)) {
      selectionByContour.set(contourIndex, []);
    }
    selectionByContour.get(contourIndex).push(contourPointIndex);
  }
  return selectionByContour;
}

function splitContourPointRanges(indices, isClosed, numContourPoints) {
  const ranges = [];
  let currentRange;
  for (const i of indices) {
    if (currentRange && currentRange.at(-1) + 1 === i) {
      currentRange.push(i);
    } else {
      currentRange = [i];
      ranges.push(currentRange);
    }
  }
  _wrapStartRange(ranges, isClosed, numContourPoints);
  return ranges;
}

function invertContourPointRanges(ranges, isClosed, numContourPoints) {
  const invRanges = [];
  let prevEnd = isClosed ? undefined : 0;
  for (const rng of ranges) {
    if (prevEnd !== undefined && prevEnd !== rng[0]) {
      invRanges.push([...range(prevEnd, rng[0] + 1)]);
    }
    prevEnd = rng.at(-1);
  }
  if (isClosed) {
    const firstIndex = ranges[0][0];
    const lastIndex = ranges.at(-1).at(-1);
    let remainingIndex = lastIndex;
    const closingRange = [remainingIndex];
    do {
      remainingIndex = (remainingIndex + 1) % numContourPoints;
      closingRange.push(remainingIndex);
    } while (remainingIndex !== firstIndex);
    invRanges.push(closingRange);
  } else {
    if (!invRanges.length || (prevEnd && prevEnd !== numContourPoints - 1)) {
      invRanges.push([...range(prevEnd, numContourPoints)]);
    }
    _wrapStartRange(invRanges, isClosed, numContourPoints);
  }
  return invRanges;
}

function _wrapStartRange(ranges, isClosed, numContourPoints) {
  if (
    ranges.length > 1 &&
    isClosed &&
    ranges[0][0] === 0 &&
    ranges.at(-1).at(-1) + 1 === numContourPoints
  ) {
    const firstRange = ranges.shift();
    ranges.at(-1).push(...firstRange);
  }
}

function* rangesToContours(path, startPoint, ranges) {
  for (const contourPointIndices of ranges) {
    const points = contourPointIndices.map((i) => path.getPoint(i + startPoint));
    delete points[0].smooth;
    delete points.at(-1).smooth;
    yield { points: points, isClosed: false };
  }
}

// `opts.geometry === false` makes a downgrade flag-only (no corner
// reconstruction): that is the Alt+double-click gesture.
export function toggleSmooth(path, pointIndices, newPointType, opts = {}) {
  // pass 1: collect the toggleable points (open-path endpoints have nothing
  // to smooth against; off-curve nodes never toggle) and determine the
  // target type from the first of them
  const items = [];
  for (const pointIndex of pointIndices) {
    const pointType = path.pointTypes[pointIndex];
    // Use the mask, not an exact comparison: a squircle point carries
    // SMOOTH_FLAG | SQUIRCLE_FLAG (0x18), and testing `=== SMOOTH_FLAG` would
    // make plain double-click do nothing at all on it.
    const isOnCurve =
      (pointType & VarPackedPath.POINT_TYPE_MASK) === VarPackedPath.ON_CURVE;
    if (!isOnCurve) {
      continue; // off-curve handles never toggle
    }
    const isSmooth = (pointType & VarPackedPath.SMOOTH_FLAG) !== 0;
    const [prevIndex, prevPoint, nextIndex, nextPoint] = neighborPoints(
      path,
      pointIndex
    );
    if ((!prevPoint || !nextPoint) && !isSmooth) {
      continue;
    }
    const [contourIndex, relIndex] = path.getContourAndPointIndex(pointIndex);
    items.push({
      pointIndex,
      prevIndex,
      prevPoint,
      nextIndex,
      nextPoint,
      previousType: pointType,
      wasSmooth: isSmooth,
      anchorPoint: path.getPoint(pointIndex),
      contourIndex,
      anchorRel: relIndex,
    });
    if (newPointType === undefined) {
      // Toggling smoothness: a smooth node -- including a squircle node, which
      // is smooth by definition -- becomes a corner, and a corner becomes a
      // smooth node. Assigning ON_CURVE clears BOTH flags, so a squircle node
      // goes straight back to a plain corner.
      newPointType = isSmooth
        ? VarPackedPath.ON_CURVE
        : VarPackedPath.SMOOTH_FLAG;
    }
  }
  if (newPointType === undefined) {
    return newPointType;
  }

  // pass 2: toggle the flags. Handle fix-up happens in pass 3 from the pass-1
  // snapshots (never from the already-mutated path), so a multi-point or
  // multi-contour operation can't corrupt positions.
  const smoothItems = [];
  for (const item of items) {
    path.pointTypes[item.pointIndex] = newPointType;
    if (newPointType !== VarPackedPath.SMOOTH_FLAG) {
      continue;
    }
    smoothItems.push(item);
  }

  // pass 3 (fork patch, R4-T4.22 -> R4-T4.28): Glyphs/FontLab-style convert.
  // The adjacent straight segments become real cubics: each corner getting
  // smoothed receives an incoming and an outgoing handle, and every side that
  // has no handle yet gets a far-end handle too, so both segments curve.
  //
  // Handle placement (true tangent continuity at the node):
  //   - direction: the tangent through the node, i.e. the normalized sum of
  //     the incoming (anchor -> prev) and outgoing (anchor -> next) segment
  //     directions;
  //   - length: 1/3 of the respective segment, measured along that tangent.
  //     With collinear neighbors (straight continuation) this reduces to the
  //     points at 1/3 of each segment, so a straight-through node keeps its
  //     original shape; at a genuine corner the handles swing onto the shared
  //     tangent -- the line curves, as expected from "convert to curve".
  //
  // Every insertion is derived from the pass-1 snapshot and applied in
  // descending absolute-index order, so positions stay valid regardless of
  // how many points, on how many contours, are converted at once.
  if (newPointType === VarPackedPath.SMOOTH_FLAG && smoothItems.length) {
    const smoothSet = new Set(smoothItems.map((item) => item.pointIndex));
    const fraction = 1 / 3;
    const offCurve = (vector) => ({
      x: Math.round(vector.x),
      y: Math.round(vector.y),
      type: "cubic",
    });
    const insertions = [];
    // Each entry: abs = the original absolute index whose slot the new point
    // belongs in; priority breaks ties at the same slot. Two points can target
    // the same slot (the far handle of one segment and the near handle of the
    // next share the anchor's index); the far one must be inserted first so
    // the near one lands after it -- i.e. in cubic order
    // (start, far, near, end).
    const pushInsertion = (contourIndex, abs, rel, point, priority) => {
      insertions.push({ contourIndex, abs, rel, point, priority });
    };

    for (const item of smoothItems) {
      const { anchorPoint, prevPoint, nextPoint } = item;
      if (!prevPoint || !nextPoint) {
        continue;
      }
      // `prevPoint`/`nextPoint` above are simply whatever sits next to the node
      // -- a handle on an already-smooth node, the neighbouring on-curve point on
      // a corner -- so read the real slots to tell the cases apart.
      const inSlots = sideHandleSlots(path, item.pointIndex, -1);
      const outSlots = sideHandleSlots(path, item.pointIndex, +1);
      const prevStraight = sideIsStraightThroughNode(path, item.pointIndex, -1);
      const nextStraight = sideIsStraightThroughNode(path, item.pointIndex, +1);

      // Curved on both sides: nothing to bend, only G1 to restore. That is
      // upstream's alignHandles -- rotate each handle onto the common tangent,
      // keeping its own length.
      if (!prevStraight && !nextStraight) {
        if (
          item.wasSmooth &&
          handlesCollinearThrough(
            anchorPoint,
            inSlots.near && inSlots.near.point,
            outSlots.near && outSlots.near.point
          )
        ) {
          // Nothing to do, and deliberately nothing WRITTEN: re-aligning would
          // round coordinates that were written unrounded on purpose (the G2
          // solve), which silently re-introduces a curvature jump -- measured
          // 0.07% -> 1.1%.
          continue;
        }
        const [newPrevPoint, newNextPoint] = alignHandles(
          inSlots.near.point,
          anchorPoint,
          outSlots.near.point
        );
        path.setPointPosition(inSlots.near.index, newPrevPoint.x, newPrevPoint.y);
        path.setPointPosition(outSlots.near.index, newNextPoint.x, newNextPoint.y);
        continue;
      }
      // tangent through the node (sum of the two segment directions)
      const inLen = Math.hypot(
        anchorPoint.x - prevPoint.x,
        anchorPoint.y - prevPoint.y
      );
      const outLen = Math.hypot(
        nextPoint.x - anchorPoint.x,
        nextPoint.y - anchorPoint.y
      );
      if (inLen < 1e-6 || outLen < 1e-6) {
        continue;
      }
      let tangentX =
        (anchorPoint.x - prevPoint.x) / inLen +
        (nextPoint.x - anchorPoint.x) / outLen;
      let tangentY =
        (anchorPoint.y - prevPoint.y) / inLen +
        (nextPoint.y - anchorPoint.y) / outLen;
      const tangentLen = Math.hypot(tangentX, tangentY);
      if (tangentLen < 1e-6) {
        // segments fold back on themselves: no sensible tangent, skip
        continue;
      }
      tangentX /= tangentLen;
      tangentY /= tangentLen;

      // near handles, on the shared tangent at 1/3 of each segment
      const nearPrev = {
        x: anchorPoint.x - tangentX * (inLen * fraction),
        y: anchorPoint.y - tangentY * (inLen * fraction),
      };
      const nearNext = {
        x: anchorPoint.x + tangentX * (outLen * fraction),
        y: anchorPoint.y + tangentY * (outLen * fraction),
      };
      // An existing near handle is ROTATED onto that tangent keeping its own
      // length; only a side without one gets a handle inserted at 1/3 of the
      // segment. Keeping the length is what makes one rule cover both sides:
      //
      //   - a straight run's handle already sits at 1/3 of the chord, so
      //     rotating it onto the tangent bends the line through the node (the
      //     "convert to curve" behaviour ADR-0006 is about) instead of leaving
      //     a smooth icon on top of two straight lines;
      //   - a curved side's handle is simply realigned, exactly as upstream did.
      //
      // Either way G1 becomes true in the geometry, not just in the icon.
      const rotateOntoTangent = (slot, sign) => {
        if (!slot) {
          return false;
        }
        const handle = slot.point;
        const handleLength = Math.hypot(
          handle.x - anchorPoint.x,
          handle.y - anchorPoint.y
        );
        path.setPointPosition(
          slot.index,
          anchorPoint.x + sign * tangentX * handleLength,
          anchorPoint.y + sign * tangentY * handleLength
        );
        return true;
      };
      if (!rotateOntoTangent(inSlots.near, -1)) {
        pushInsertion(item.contourIndex, item.pointIndex, item.anchorRel, offCurve(nearPrev), 1);
      }
      if (!rotateOntoTangent(outSlots.near, +1)) {
        pushInsertion(item.contourIndex, item.pointIndex + 1, item.anchorRel + 1, offCurve(nearNext), 2);
      }
      // far-end handles, so the whole segment becomes a cubic; skipped when
      // that far end is itself being converted in this operation (it places
      // its own handle there)
      if (!prevPoint.type && !smoothSet.has(item.prevIndex)) {
        const prevRel = path.getContourAndPointIndex(item.prevIndex)[1];
        pushInsertion(item.contourIndex, item.prevIndex + 1, prevRel + 1, offCurve({
            x: prevPoint.x + (anchorPoint.x - prevPoint.x) * fraction,
            y: prevPoint.y + (anchorPoint.y - prevPoint.y) * fraction,
          }),
          2
        );
      }
      if (!nextPoint.type && !smoothSet.has(item.nextIndex)) {
        const nextRel = path.getContourAndPointIndex(item.nextIndex)[1];
        pushInsertion(item.contourIndex, item.nextIndex, nextRel, offCurve({
            x: nextPoint.x + (anchorPoint.x - nextPoint.x) * fraction,
            y: nextPoint.y + (anchorPoint.y - nextPoint.y) * fraction,
          }),
          1
        );
      }
    }

    insertions.sort((a, b) => b.abs - a.abs || b.priority - a.priority);
    const applied = [];
    for (const ins of insertions) {
      const shift = applied.filter((p) => p <= ins.abs).length;
      path.insertPoint(ins.contourIndex, ins.rel + shift, ins.point);
      applied.push(ins.abs);
    }
  }

  // pass 4 (downgrade): a corner must BE a corner.
  //
  // Flipping the flag alone would leave a square node icon sitting on top of a
  // curve -- the same "the icon lies" failure ADR-0009 forbids for G2. So the
  // geometry follows the state: see reconstructCornerGeometry().
  // `opts.geometry === false` keeps the flag-only behaviour, which is what the
  // Alt+double-click gesture asks for ("I only want the icon").
  if (newPointType === VarPackedPath.ON_CURVE && opts.geometry !== false) {
    reconstructCornerGeometry(path, items, opts);
  }
  return newPointType;
}

// Statuses that mean "this point now satisfies what the squircle flag claims".
const SQUIRCLE_APPLIED_STATUSES = new Set([
  "ok",
  "inserted-handles",
  "no-change",
  "ok-no-room",
]);

// ---------------------------------------------------------------------------
// corner reconstruction (downgrade: a corner must BE a corner)
//
// A square node icon drawn on top of a curve is a lie, so downgrading to a
// corner changes the geometry too: the run through the node is rebuilt as a
// straight line, which makes both adjacent sides straight and moves the kink to
// the NEIGHBOURING nodes. That is what a corner is -- the bend belongs to the
// neighbours, not to this node.
//
// Two deliberate choices:
//
// 1. The handles are KEPT, sitting on the chord, instead of being deleted. A
//    handle may be shared with the neighbouring segment, so deleting it would
//    silently straighten a side the user never touched, with no way back except
//    undo. Keeping them also makes the cycle reversible: corner -> smooth reuses
//    exactly these handles.
//
// 2. Coordinates are written UNROUNDED. Rounding would leave the control points
//    a fraction of a unit off the chord and keep a small but real curvature at
//    the node -- the same trap documented in applySquircleAtPoint().
//
// Because a side's far handle belongs to the neighbouring node, straightening a
// side moves that neighbour's tangent. A neighbour that claimed G1/G2 would
// quietly stop being true, so it is repaired here (one level deep), the way
// FontLab's Genius behaves as a live constraint.
// Describe the join at `pointIndex` as the solver sees it, and measure what the
// geometry actually satisfies. `collectSegmentSide` fills in a chord handle for a
// straight side, so a line reads back as zero curvature instead of vanishing.
function measureJoin(path, pointIndex) {
  const node = path.getPoint(pointIndex);
  const P = { x: node.x, y: node.y };
  const inSide = collectSegmentSide(path, pointIndex, -1);
  const outSide = collectSegmentSide(path, pointIndex, +1);
  if (!inSide || !outSide) {
    return null;
  }
  const left = [inSide.far, inSide.farHandle, inSide.nodeHandle, P];
  const right = [P, outSide.nodeHandle, outSide.farHandle, outSide.far];
  const kL = curvatureAt(left, 1);
  const kR = curvatureAt(right, 0);
  const inVec = {
    x: P.x - inSide.nodeHandle.x,
    y: P.y - inSide.nodeHandle.y,
  };
  const outVec = {
    x: outSide.nodeHandle.x - P.x,
    y: outSide.nodeHandle.y - P.y,
  };
  const scale = Math.hypot(inVec.x, inVec.y) * Math.hypot(outVec.x, outVec.y);
  const g1 =
    scale > 0 && Math.abs(inVec.x * outVec.y - inVec.y * outVec.x) / scale < 1e-4;
  const bothStraight = kL.mag < 1e-12 && kR.mag < 1e-12;
  // Curvature continuity is about the curvature VECTOR, not just its magnitude:
  // equal magnitudes with opposite senses (an inflection) leave the tangent of
  // curvature jumping, so the join is NOT G2 and must not be called squircle.
  const sameSense = kL.vec.x * kR.vec.x + kL.vec.y * kR.vec.y > 0;
  const larger = Math.max(kL.mag, kR.mag);
  const magnitudesMatch = larger > 0 && Math.abs(kL.mag - kR.mag) / larger < 1e-3;
  const g2 = bothStraight || (sameSense && magnitudesMatch);
  return { g1, g2, kL: kL.mag, kR: kR.mag };
}

// Does this node's geometry match what its flags claim? A corner makes no claim
// beyond "not smooth"; a smooth node must really have collinear handles; a
// squircle node must really have continuous curvature.
function nodeFlagsAreHonest(path, pointIndex) {
  const type = path.pointTypes[pointIndex];
  // ADR-0012: a line<->curve squircle node does NOT claim curvature
  // continuity at the node itself -- the stored join deliberately keeps the
  // line meeting the curve (the derived transition replaces the whole corner
  // region at render/export). Its honesty claim is "the region derives", so
  // measure the derivation, not the raw join.
  if (type & VarPackedPath.SQUIRCLE_FLAG) {
    const lineCurveJoin = findLineCurveJoin(path, pointIndex);
    if (lineCurveJoin) {
      return deriveLineCurveTransition(lineCurveJoin).status === "ok";
    }
  }
  const join = measureJoin(path, pointIndex);
  if (!join) {
    return true; // open path endpoint: nothing measurable to claim
  }
  if (!(type & VarPackedPath.SMOOTH_FLAG)) {
    // A corner claims more than "not smooth": with "the state IS the geometry" it
    // claims that BOTH of its runs are straight. The flag-only Alt gesture is the
    // documented way to get a square icon on a curve.
    return join.kL < 1e-9 && join.kR < 1e-9;
  }
  if (!join.g1) {
    return false;
  }
  if ((type & VarPackedPath.SQUIRCLE_FLAG) && !join.g2) {
    return false;
  }
  return true;
}

// The on-curve point nearest (x, y), within `tolerance`. Repairs may insert points
// (which shift indices) and may slide a node, so anything that has to be tracked
// across a repair is tracked by POSITION -- the same discipline the editor's own
// code follows.
function findOnCurveNear(path, x, y, tolerance) {
  let best = -1;
  let bestDistance = tolerance;
  for (let i = 0; i < path.pointTypes.length; i++) {
    if (path.pointTypes[i] & VarPackedPath.POINT_TYPE_MASK) {
      continue; // off-curve
    }
    const p = path.getPoint(i);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
}

// Rebuild both runs through every downgraded node, then repair what that broke.
function reconstructCornerGeometry(path, items, opts = {}) {
  // descending absolute index, the same discipline as pass 3, so a multi-node
  // downgrade cannot invalidate an index a later item still needs
  const ordered = [...items].sort((a, b) => b.pointIndex - a.pointIndex);
  for (const item of ordered) {
    // NB: item.prevPoint/prevIndex are the ADJACENT points (often handles), so
    // the neighbour node has to be found by walking outward over the handles.
    const inSlots = sideHandleSlots(path, item.pointIndex, -1);
    const outSlots = sideHandleSlots(path, item.pointIndex, +1);
    if (!inSlots.farPoint || !outSlots.farPoint) {
      continue; // open path endpoint: nothing to reconstruct
    }
    straightenRunThroughNode(path, item.pointIndex, -1, inSlots.farPoint);
    straightenRunThroughNode(path, item.pointIndex, +1, outSlots.farPoint);
    repairBrokenNeighbours(path, item.pointIndex, opts);
  }
  // Settle the contours we touched. Straightening a node, repairing a neighbour and
  // re-straightening all move control points that neighbouring nodes also depend
  // on, so this runs in rounds: sweep the smooth/squircle claims, then re-check the
  // nodes this gesture downgraded (putting their runs back if a repair bent them
  // again), and repeat while anything is still moving.
  const contours = [
    ...new Set(
      ordered.map((item) => path.getContourAndPointIndex(item.pointIndex)[0])
    ),
  ];
  for (let round = 0; round < 4; round++) {
    let changed = false;
    // 1. the nodes this gesture downgraded must really be corners ...
    for (const item of ordered) {
      if (nodeFlagsAreHonest(path, item.pointIndex)) {
        continue;
      }
      const slots = [
        sideHandleSlots(path, item.pointIndex, -1),
        sideHandleSlots(path, item.pointIndex, +1),
      ];
      if (slots[0].farPoint) {
        straightenRunThroughNode(path, item.pointIndex, -1, slots[0].farPoint);
      }
      if (slots[1].farPoint) {
        straightenRunThroughNode(path, item.pointIndex, +1, slots[1].farPoint);
      }
      changed = true;
    }
    // 2. ... and the neighbours get the last word on their own claims, because
    // every repair moves control points they also depend on. Order matters:
    // straightening last would immediately re-break them.
    for (const contourIndex of contours) {
      changed = enforceContourHonesty(path, contourIndex, opts, 2) || changed;
    }
    if (!changed) {
      break;
    }
  }
}

// The guarantee, enforced rather than hoped for: after a node-kind gesture, no
// node on a touched contour may claim a continuity its geometry does not have.
// Whatever an intermediate step got wrong -- a neighbour repair that bent an
// edge another node needed, a second repair of the same node after an earlier one
// moved its handles -- this settles it: re-solve where possible, otherwise drop
// the claim and leave an honest corner. Bounded passes, and the sweep also mends
// pre-existing lies on the contour it touches, which is the price of the
// invariant "the icon never lies" (ADR-0009 §4).
function enforceContourHonesty(path, contourIndex, opts = {}, maxPasses = 3) {
  let changedAnything = false;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    const count = path.getNumPointsOfContour(contourIndex);
    for (let rel = 0; rel < count; rel++) {
      const index = path.getAbsolutePointIndex(contourIndex, rel);
      if (path.pointTypes[index] & VarPackedPath.POINT_TYPE_MASK) {
        continue; // off-curve
      }
      // Only smooth/squircle claims are swept here. A corner's two straight runs
      // are the user's to shape -- if they hand-drew a corner with slightly curved
      // sides, that is a legitimate drawing, and a node-kind gesture elsewhere on
      // the contour must not straighten it behind their back. The corner THIS
      // gesture downgraded is verified separately, right where it is written.
      if (!(path.pointTypes[index] & VarPackedPath.SMOOTH_FLAG)) {
        continue;
      }
      if (nodeFlagsAreHonest(path, index)) {
        continue;
      }
      repairNeighbourContinuity(path, index, opts);
      if (!nodeFlagsAreHonest(path, index)) {
        path.pointTypes[index] = VarPackedPath.ON_CURVE;
      }
      changed = true;
    }
    changedAnything = changedAnything || changed;
    if (!changed) {
      return changedAnything;
    }
  }
  return changedAnything;
}

// Straightening a side moves the far handle of that side, which belongs to the
// NEIGHBOUR -- so the neighbour's tangent changes, and repairing the neighbour
// moves handles of its own. Walk outward along the contour in both directions and
// repair while the next node's claims are false; the first honest node ends the
// walk. Only what we actually broke gets touched, and the walk is bounded.
function repairBrokenNeighbours(path, fromIndex, opts = {}, maxWalk = 64) {
  const scale = contourScale(path, path.getContourAndPointIndex(fromIndex)[0]);
  const tolerance = 0.01 * scale;
  for (const dir of [-1, +1]) {
    let cursor = fromIndex;
    for (let step = 0; step < maxWalk; step++) {
      const slots = sideHandleSlots(path, cursor, dir);
      const next = slots.farIndex;
      if (next === undefined || next < 0) {
        break;
      }
      cursor = next;
      if (cursor === fromIndex) {
        break; // wrapped all the way around a closed contour
      }
      if (!(path.pointTypes[cursor] & VarPackedPath.SMOOTH_FLAG)) {
        break; // a corner has nothing to restore
      }
      if (nodeFlagsAreHonest(path, cursor)) {
        break; // our damage does not reach this far
      }
      const before = path.getPoint(cursor);
      const beforeX = before.x;
      const beforeY = before.y;
      repairNeighbourContinuity(path, cursor, opts);
      // the repair may have inserted points (index shift) and may have slid the
      // node, so re-locate it by position before continuing
      const relocated = findOnCurveNear(path, beforeX, beforeY, tolerance);
      if (relocated < 0) {
        break;
      }
      cursor = relocated;
    }
  }
}

// A rough size for the contour, used to scale the re-location tolerance.
function contourScale(path, contourIndex) {
  const start = path.getAbsolutePointIndex(contourIndex, 0);
  const count = path.getNumPointsOfContour(contourIndex);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = start; i < start + count; i++) {
    const p = path.getPoint(i);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return Math.max(Math.hypot(maxX - minX, maxY - minY), 1);
}

// Walk outward from `pointIndex` collecting up to two off-curve points plus the
// far on-curve point that closes the side. `dir` is -1 for the arriving side and
// +1 for the leaving one. Mirrors collectSegmentSide(), but reports empty slots
// instead of synthesising handles: straightening has to know what is really there.
function sideHandleSlots(path, pointIndex, dir) {
  const [contourIndex, contourPointIndex] =
    path.getContourAndPointIndex(pointIndex);
  const contourStartIndex = path.getAbsolutePointIndex(contourIndex, 0);
  const numPoints = path.getNumPointsOfContour(contourIndex);
  const isClosed = path.contourInfo[contourIndex].isClosed;
  const at = (rel) => {
    let r = rel;
    if (isClosed) {
      r = modulo(r, numPoints);
    } else if (r < 0 || r >= numPoints) {
      return undefined;
    }
    return contourStartIndex + r;
  };
  const slots = [];
  for (let step = 1; step <= 2; step++) {
    const idx = at(contourPointIndex + dir * step);
    if (idx === undefined) break;
    const pt = path.getPoint(idx);
    if (pt && pt.type) {
      slots.push({ index: idx, point: { x: pt.x, y: pt.y } });
    } else {
      break;
    }
  }
  const farIndex = at(contourPointIndex + dir * (slots.length + 1));
  const farPoint = farIndex !== undefined ? path.getPoint(farIndex) : undefined;
  return { near: slots[0], far: slots[1], farIndex, farPoint };
}

// Put this side's handles on the chord node -> farOnCurve, so the side becomes
// an exactly straight run. Nothing to do when the side carries no handle at all:
// a bare pair of on-curve points already IS a line.
// Is this side a STRAIGHT run through the node (zero curvature there)?
//
// That is the question "is this side a line?", and the honest answer decides
// whether smoothing has anything to bend: a smooth node with two straight sides
// is just a corner wearing an eye icon. Tests the actual second derivative:
// for a cubic, curvature at an endpoint vanishes exactly when
// B''=6*(P3-2P2+P1) is parallel to the tangent there.
function sideIsStraightThroughNode(path, pointIndex, dir) {
  const slots = sideHandleSlots(path, pointIndex, dir);
  const far = slots.farPoint;
  if (!far) {
    return false; // open end: no geometry to speak of
  }
  if (!slots.near) {
    return true; // a bare pair of on-curve points already IS a line
  }
  const node = path.getPoint(pointIndex);
  if (!slots.far) {
    // a single-handle (quadratic-ish) side: straight iff the handle is on the chord
    const chordX = far.x - node.x;
    const chordY = far.y - node.y;
    const chordLen = Math.hypot(chordX, chordY);
    if (!(chordLen > 0)) {
      return true;
    }
    const h = slots.near.point;
    return (
      Math.abs(chordX * (h.y - node.y) - chordY * (h.x - node.x)) <=
      1e-6 * chordLen * chordLen
    );
  }
  const h1 = slots.far.point;
  const h2 = slots.near.point;
  const tangentLength = Math.hypot(node.x - h2.x, node.y - h2.y);
  if (!(tangentLength > 0)) {
    return false; // degenerate handle
  }
  const ddx = node.x - 2 * h2.x + h1.x;
  const ddy = node.y - 2 * h2.y + h1.y;
  const ddLength = Math.hypot(ddx, ddy);
  if (!(ddLength > 0)) {
    return true;
  }
  return (
    Math.abs((node.x - h2.x) * ddy - (node.y - h2.y) * ddx) <=
    1e-6 * tangentLength * ddLength
  );
}

// Are the two node handles collinear through the node (G1 holds)?
function handlesCollinearThrough(anchorPoint, handleIn, handleOut) {
  if (!handleIn || !handleOut) {
    return false;
  }
  const inVec = {
    x: anchorPoint.x - handleIn.x,
    y: anchorPoint.y - handleIn.y,
  };
  const outVec = {
    x: handleOut.x - anchorPoint.x,
    y: handleOut.y - anchorPoint.y,
  };
  const scale = Math.hypot(inVec.x, inVec.y) * Math.hypot(outVec.x, outVec.y);
  return (
    scale > 0 &&
    Math.abs(inVec.x * outVec.y - inVec.y * outVec.x) / scale < 1e-4
  );
}

function straightenRunThroughNode(path, pointIndex, dir, farOnCurve) {
  const slots = sideHandleSlots(path, pointIndex, dir);
  if (!slots.near || !farOnCurve) return false;
  const node = path.getPoint(pointIndex);
  const along = (t) => ({
    x: node.x + (farOnCurve.x - node.x) * t,
    y: node.y + (farOnCurve.y - node.y) * t,
  });
  if (slots.far) {
    const nearPt = along(1 / 3);
    const farPt = along(2 / 3);
    path.setPointPosition(slots.near.index, nearPt.x, nearPt.y);
    path.setPointPosition(slots.far.index, farPt.x, farPt.y);
  } else {
    // a lone handle belongs at the midpoint: still a straight run, and it keeps
    // the side a legal cubic
    const mid = along(0.5);
    path.setPointPosition(slots.near.index, mid.x, mid.y);
  }
  return true;
}

// The same placement as upstream alignHandles(), but without its rounding: we
// are repairing somebody else's node here, and nudging its fractional handles
// for no reason is not acceptable.
function alignHandlesExact(handleIn, anchorPoint, handleOut) {
  const place = (handle, direction) => {
    const length = vector.vectorLength(
      vector.subVectors(handle, anchorPoint)
    );
    const v = vector.mulVectorScalar(
      vector.normalizeVector(direction),
      length
    );
    return { x: anchorPoint.x + v.x, y: anchorPoint.y + v.y };
  };
  const inVec = vector.subVectors(anchorPoint, handleIn);
  const outVec = vector.subVectors(handleOut, anchorPoint);
  return [
    place(handleIn, vector.subVectors(outVec, inVec)),
    place(handleOut, vector.subVectors(inVec, outVec)),
  ];
}

// Re-establish a neighbour's continuity after we moved one of its handles.
// A squircle neighbour is re-solved (FontLab's Genius is a live constraint); if
// G2 has become impossible we drop the flag rather than let the icon lie, and
// then re-align for G1. A plain smooth neighbour just gets its tangent back.
function repairNeighbourContinuity(path, neighbourIndex, opts = {}) {
  if (neighbourIndex === undefined || neighbourIndex < 0) return;
  let type = path.pointTypes[neighbourIndex];
  const inSlots = sideHandleSlots(path, neighbourIndex, -1);
  const outSlots = sideHandleSlots(path, neighbourIndex, +1);
  if (!(type & VarPackedPath.SMOOTH_FLAG)) {
    // A corner has nothing to re-solve, but its two runs may have been bent by
    // whoever touched this contour -- put them straight again.
    if (inSlots.farPoint) {
      straightenRunThroughNode(path, neighbourIndex, -1, inSlots.farPoint);
    }
    if (outSlots.farPoint) {
      straightenRunThroughNode(path, neighbourIndex, +1, outSlots.farPoint);
    }
    return;
  }
  const handleIn = inSlots.near && inSlots.near.point;
  const handleOut = outSlots.near && outSlots.near.point;
  if (!handleIn || !handleOut) {
    path.pointTypes[neighbourIndex] = VarPackedPath.ON_CURVE;
    return;
  }
  if (type & VarPackedPath.SQUIRCLE_FLAG) {
    const status = applySquircleAtPoint(path, neighbourIndex, {
      ...opts,
      _inNeighbourRepair: true,
    });
    // verify the geometry, not the reported status -- see makeSquircle
    if (SQUIRCLE_APPLIED_STATUSES.has(status) && nodeFlagsAreHonest(path, neighbourIndex)) {
      return;
    }
    // can no longer be G2 here -- stop claiming it
    path.pointTypes[neighbourIndex] &= ~VarPackedPath.SQUIRCLE_FLAG;
    type = path.pointTypes[neighbourIndex];
    if (!(type & VarPackedPath.SMOOTH_FLAG)) {
      return;
    }
  }
  const node = path.getPoint(neighbourIndex);
  const prevStraight = sideIsStraightThroughNode(path, neighbourIndex, -1);
  const nextStraight = sideIsStraightThroughNode(path, neighbourIndex, +1);
  if (prevStraight || nextStraight) {
    // A neighbouring corner is holding one of our sides as a straight run, so the
    // shared tangent IS that line: put both handles on it, keeping their lengths.
    // That is the straight-through smooth node -- and, crucially, it leaves the
    // corner's straight side straight. (Aligning onto the bisector instead would
    // bend an edge a neighbour depends on, and the corner's icon would start
    // lying all over again.)
    const straightSlots = prevStraight ? inSlots : outSlots;
    const farPoint = prevStraight ? inSlots.farPoint : outSlots.farPoint;
    if (farPoint) {
      const dirLen = Math.hypot(farPoint.x - node.x, farPoint.y - node.y);
      if (dirLen > 1e-9) {
        const dirX = (farPoint.x - node.x) / dirLen;
        const dirY = (farPoint.y - node.y) / dirLen;
        for (const [slot, sign] of [
          [inSlots, -1],
          [outSlots, 1],
        ]) {
          const length = Math.hypot(
            slot.near.point.x - node.x,
            slot.near.point.y - node.y
          );
          path.setPointPosition(
            slot.near.index,
            node.x + sign * dirX * length,
            node.y + sign * dirY * length
          );
        }
      }
    }
  } else if (!(prevStraight && nextStraight)) {
    // Both sides curve: put the tangent back on their bisector, keeping lengths.
    const [alignedIn, alignedOut] = alignHandlesExact(
      handleIn,
      { x: node.x, y: node.y },
      handleOut
    );
    path.setPointPosition(inSlots.near.index, alignedIn.x, alignedIn.y);
    path.setPointPosition(outSlots.near.index, alignedOut.x, alignedOut.y);
  }
  // (both sides straight: the node is a straight-through node or an honest
  // corner -- never align, that would bend a straight side)
  // last word to the geometry: if the tangent still does not line up, the node is
  // honestly a corner now
  if (!nodeFlagsAreHonest(path, neighbourIndex)) {
    path.pointTypes[neighbourIndex] = VarPackedPath.ON_CURVE;
  }
}

// ---------------------------------------------------------------------------
// squircle nodes (curvature-continuous / G2 joins)
//
// See ADR-0009 and docs/字体设计图例符号系统设计说明.md §3.2. Glyphs calls this
// "super-smooth" and draws a five-pointed star; we use the name and the icon
// "squircle" because the icon is itself a curve of continuously varying
// curvature -- shape equals meaning.
//
// The maths lives in path-curvature.js (makeSuperSmooth etc.), which is
// verified separately. This function only adapts between the path's point
// model and the solver's segment model, and writes the result back.
// ---------------------------------------------------------------------------

// Collect the (up to) four points that describe one side of `pointIndex` as a
// cubic segment [farOnCurve, farHandle, nodeHandle, node] in the solver's
// convention, plus the absolute indices needed to write results back.
//
// A side may have 0, 1 or 2 off-curve points between the far on-curve point
// and the node. The solver expects a full cubic, so a missing handle is filled
// in with the trivial collinear placement (which makes the side a straight
// line, i.e. curvature 0 -- exactly the case the solver treats as "line").
function collectSegmentSide(path, pointIndex, direction) {
  // direction: -1 = the side arriving at the node (prev), +1 = leaving (next)
  const [contourIndex, contourPointIndex] =
    path.getContourAndPointIndex(pointIndex);
  const contourStartIndex = path.getAbsolutePointIndex(contourIndex, 0);
  const numPoints = path.getNumPointsOfContour(contourIndex);
  const isClosed = path.contourInfo[contourIndex].isClosed;

  const at = (rel) => {
    let r = rel;
    if (isClosed) {
      r = modulo(r, numPoints);
    } else if (r < 0 || r >= numPoints) {
      return undefined;
    }
    return contourStartIndex + r;
  };

  const nodePoint = path.getPoint(pointIndex);
  const node = { x: nodePoint.x, y: nodePoint.y };

  // walk outward from the node collecting up to 2 off-curve points
  const nodeHandles = [];
  const farIndices = [];
  for (let step = 1; step <= 2; step++) {
    const idx = at(contourPointIndex + direction * step);
    if (idx === undefined) {
      break;
    }
    const pt = path.getPoint(idx);
    if (pt.type) {
      nodeHandles.push({ x: pt.x, y: pt.y });
      farIndices.push(idx);
    } else {
      break; // reached the far on-curve point
    }
  }
  const farIndex = at(contourPointIndex + direction * (nodeHandles.length + 1));
  const farPoint = farIndex !== undefined ? path.getPoint(farIndex) : undefined;
  if (!farPoint) {
    return undefined; // open path with no neighbour on this side
  }

  const nodeHandle =
    nodeHandles.length >= 1
      ? nodeHandles[0]
      : // no handle: place it 1/3 along the way, making the side a straight line
        {
          x: Math.round((farPoint.x + node.x) / 3 + (node.x * 2) / 3),
          y: Math.round((farPoint.y + node.y) / 3 + (node.y * 2) / 3),
        };
  const farHandle =
    nodeHandles.length >= 2
      ? nodeHandles[1]
      : {
          x: Math.round((farPoint.x * 2 + node.x) / 3),
          y: Math.round((farPoint.y * 2 + node.y) / 3),
        };

  return {
    // segment in the solver's orientation: always starts at the node
    nodeHandle,
    farHandle,
    far: { x: farPoint.x, y: farPoint.y },
    nodeHandleIndex: nodeHandles.length >= 1 ? farIndices[0] : undefined,
    farHandleIndex: nodeHandles.length >= 2 ? farIndices[1] : undefined,
    farIndex,
    hasNodeHandle: nodeHandles.length >= 1,
    hasFarHandle: nodeHandles.length >= 2,
  };
}

// Solve the G2 join at `pointIndex` and write the handles (and, when the solve
// drifted the node, the node itself) back into the path.
// Returns a short status string for diagnostics/tests.
//
// `opts.allowNodeDrift` (default ON) lets the solver slide the node a little
// and rotate the tangent to find the least-distorted G2 join -- Glyphs' star
// node / FontLab's Harmonize. It is the in-place closed form when
// `allowNodeDrift:false`, which is what the pure-geometry tests pin.
function applySquircleAtPoint(path, pointIndex, opts = {}) {
  const nodePoint = path.getPoint(pointIndex);
  const node = { x: nodePoint.x, y: nodePoint.y };

  const inSide = collectSegmentSide(path, pointIndex, -1);
  const outSide = collectSegmentSide(path, pointIndex, +1);
  if (!inSide || !outSide) {
    return "open-end";
  }

  // solver convention: left = [A, hA, X, P], right = [P, Y, hC, C]
  // left  = the side ARRIVING at the node, reversed
  // right = the side LEAVING the node
  const left = [inSide.far, inSide.farHandle, inSide.nodeHandle, node];
  const right = [node, outSide.nodeHandle, outSide.farHandle, outSide.far];

  const allowNodeDrift = opts.allowNodeDrift !== false;
  const result = allowNodeDrift
    ? makeSuperSmoothWithNodeDrift(node, left, right, opts)
    : makeSuperSmooth(node, left, right, opts);

  if (result.status === "invalid-input" || result.status === "infeasible") {
    return result.status;
  }

  // `handleLeft` belongs to the LEFT segment's node end = our incoming side
  // `handleRight` belongs to the RIGHT segment's node end = our outgoing side
  //
  // NOTE: these positions are deliberately NOT rounded to integers. The whole
  // point of a squircle node is curvature continuity, and rounding each handle
  // independently re-introduces a curvature jump (measured: 6.4e-5 instead of
  // ~1e-19 at rounding, i.e. only a 48x improvement rather than an exact
  // match). Fontra stores fractional coordinates natively -- dragging a node
  // produces them too -- so there is nothing to gain by rounding here.
  const writeHandle = (index, point) => {
    // `index === undefined`, NOT a falsy test: absolute index 0 is a legitimate
    // handle (a contour may start with one) and a falsy check silently skipped
    // writing it -- reporting success while leaving the join unsolved.
    if (index === undefined || !point) {
      return true; // nothing to write on this side
    }
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return false;
    }
    path.setPointPosition(index, point.x, point.y);
    return true;
  };

  // The node itself may have slid (Glyphs-style "effective node"). Writing it is
  // an ordinary point move -- same index, new coordinates -- so the selection and
  // the undo step are unaffected.
  const writeNode = () => {
    if (
      !result.node ||
      !Number.isFinite(result.node.x) ||
      !Number.isFinite(result.node.y)
    ) {
      return true;
    }
    if (result.node.x !== node.x || result.node.y !== node.y) {
      path.setPointPosition(pointIndex, result.node.x, result.node.y);
    }
    return true;
  };

  // A handle may only be inserted on a side that is actually a CURVE. A side
  // with no handle is a straight line, and the G2 solution for line-curve
  // deliberately keeps the zero curvature on the LINE side -- adding a handle
  // there would bend a straight segment that must stay straight, and would
  // push the node itself out of position.
  const kind = result.kind || "curve-curve";
  const insertIn = !inSide.hasNodeHandle && kind !== "line-curve";
  const insertOut = !outSide.hasNodeHandle && kind !== "curve-line";

  if (insertIn || insertOut) {
    // Insert as cubic off-curve points adjacent to the node. The OUTGOING
    // handle goes in at rel+1 and the INCOMING at rel, so inserting the
    // outgoing one FIRST keeps the incoming insertion index valid (same
    // descending-index discipline as toggleSmooth).
    const [contourIndex, contourPointIndex] =
      path.getContourAndPointIndex(pointIndex);
    if (insertOut) {
      path.insertPoint(
        contourIndex,
        contourPointIndex + 1,
        {
          x: result.handleRight.x,
          y: result.handleRight.y,
          type: "cubic",
        }
      );
    }
    if (insertIn) {
      path.insertPoint(
        contourIndex,
        contourPointIndex,
        {
          x: result.handleLeft.x,
          y: result.handleLeft.y,
          type: "cubic",
        }
      );
    }
    writeNode();
    return result.status === "ok" ? "inserted-handles" : result.status;
  }

  let ok = true;
  // Which sides the solver actually re-placed depends on the join kind. For a
  // line-curve G2 the STRAIGHT side must be left exactly as it is -- its handle
  // belongs to a neighbouring node's side, and moving it bends a line that has
  // to stay straight (which is how a corner next door would silently stop being
  // a corner). The solver returns the line's far handle there as a "don't touch"
  // sentinel, so only the curve side may be written.
  if (kind !== "curve-line") {
    ok = writeHandle(inSide.nodeHandleIndex, result.handleLeft) && ok;
  }
  if (kind !== "line-curve") {
    ok = writeHandle(outSide.nodeHandleIndex, result.handleRight) && ok;
  }
  ok = writeNode() && ok;
  return ok ? result.status : "write-failed";
}

// Convert the given on-curve points into squircle nodes (curvature-continuous /
// G2 joins), solving the geometry as needed. Returns true when at least one
// point ended up as a squircle node.
//
// This is an ESCALATION, not a toggle: an already-squircle point is left exactly
// as it is, so repeating the gesture is a harmless no-op the user can rely on.
// De-escalation goes through toggleSmooth (plain double-click), which turns a
// squircle node into a corner and drops both flags -- and a second plain
// double-click then makes it a plain smooth node:
//
//   squircle --dbl--> corner --dbl--> smooth
//
// `force` may be passed as false to explicitly clear the flag; the gesture
// itself always escalates.
//
// `opts.allowNodeDrift` (default true) lets the G2 solve slide the node a
// little to find the least-distorted join -- see ADR-0010. Pass
// `{allowNodeDrift:false}` for the pure in-place closed form.
export function makeSquircle(path, pointIndices, force, opts = {}) {
  const squircleFlag = VarPackedPath.SQUIRCLE_FLAG;
  const smoothFlag = VarPackedPath.SMOOTH_FLAG;

  // pass 1: collect the points that can carry the flag
  const eligible = [];
  for (const pointIndex of pointIndices) {
    const pointType = path.pointTypes[pointIndex];
    if ((pointType & VarPackedPath.POINT_TYPE_MASK) !== VarPackedPath.ON_CURVE) {
      continue; // off-curve handles never carry the flag
    }
    const [prevIndex, , nextIndex] = neighborPoints(path, pointIndex);
    if (prevIndex === undefined || nextIndex === undefined) {
      continue; // open path endpoint
    }
    eligible.push(pointIndex);
  }

  if (force === false) {
    // explicit de-escalation: a squircle node becomes a plain smooth node
    for (const pointIndex of eligible) {
      path.pointTypes[pointIndex] &= ~squircleFlag;
    }
    return false;
  }

  // pass 2/3 (turning ON): solve the geometry FIRST and only set the flag where
  // the solve actually succeeded. Setting the flag on a join that cannot be made
  // curvature-continuous (e.g. an inflection, where the two sides bend in
  // opposite senses) would draw a squircle icon for geometry that is not G2 --
  // the icon would lie about the outline.
  //
  // Each solve can INSERT handle points, which shifts the indices of later
  // points in the same contour, so work in descending absolute-index order: a
  // lower-index point's index is never disturbed by a higher one's insertion.
  // (SQUIRCLE_APPLIED_STATUSES is the module-level list, shared with the
  // neighbour repair in reconstructCornerGeometry)
  const ordered = [...eligible].sort((a, b) => b - a);
  let anyApplied = false;
  for (const pointIndex of ordered) {
    const pointTypeBefore = path.pointTypes[pointIndex];
    if (pointTypeBefore & squircleFlag) {
      // already a squircle node -- leave its geometry exactly as it is, so
      // repeating the gesture is a true no-op
      anyApplied = true;
      continue;
    }
    let index = pointIndex;
    let establishedG1 = false;

    // ADR-0012: a line<->curve join keeps the stored outline -- the line and
    // the curve keep meeting at the node, and the G2 transition is derived at
    // render/export. The gesture therefore must NOT establish G1 here (that
    // would bend the straight side the whole feature is about): verify the
    // derivation and set the flag, or honestly refuse with zero geometry
    // change (不落标志、不派生、不改文件).
    const lineCurveJoin = findLineCurveJoin(path, pointIndex);
    if (lineCurveJoin) {
      if (deriveLineCurveTransition(lineCurveJoin).status === "ok") {
        path.pointTypes[pointIndex] |= smoothFlag | squircleFlag;
        anyApplied = true;
      }
      continue;
    }

    // A squircle node is by definition a SMOOTH node too (G2 implies G1). A
    // plain corner between two straight lines does not even have matching
    // tangents, so the solver would report "no-change" -- curvature is 0 on
    // both sides -- and the flag would end up set on a node that is still a
    // hard corner. The squircle icon would then lie about the outline.
    //
    // So establish G1 first, exactly as a plain double-click does: that bends
    // the two straight sides onto a shared tangent and creates their handles.
    // Then solve for G2 on the resulting curves.
    if (!(pointTypeBefore & smoothFlag)) {
      const nodePos = path.getPointPosition(pointIndex);
      toggleSmooth(path, [pointIndex], smoothFlag);
      establishedG1 = true;
      // toggleSmooth INSERTS handles around the node, which shifts the node's
      // own index (a corner becomes 1 far handle + 1 near handle on each side).
      // Re-locate it by position, otherwise the G2 solve below would be applied
      // to whatever point now happens to sit at the old index.
      for (let i = pointIndex; i < path.pointTypes.length; i++) {
        if (path.pointTypes[i] & VarPackedPath.POINT_TYPE_MASK) {
          continue; // off-curve
        }
        const pos = path.getPointPosition(i);
        if (pos[0] === nodePos[0] && pos[1] === nodePos[1]) {
          index = i;
          break;
        }
      }
    }

    const status = applySquircleAtPoint(path, index, opts);
    if (SQUIRCLE_APPLIED_STATUSES.has(status)) {
      // Trust the GEOMETRY, not the solver's status: re-measure the join we just
      // wrote. A status of "ok" only means a solution existed -- for a cusp
      // (the two sides curving opposite ways with equal magnitudes) the
      // curvature vector still jumps, and no icon may claim that. ADR-0009 §4:
      // the icon must not lie.
      if (nodeFlagsAreHonest(path, index)) {
        path.pointTypes[index] |= smoothFlag | squircleFlag;
        anyApplied = true;
        // This solve moved handles that belong to the NEIGHBOURING nodes, so their
        // tangents -- and possibly their own G2 -- may no longer hold. Repair what
        // we broke, unless we are already inside a repair (that would recurse).
        if (!opts._inNeighbourRepair) {
          repairBrokenNeighbours(path, index, opts);
          enforceContourHonesty(
            path,
            path.getContourAndPointIndex(index)[0],
            opts
          );
        }
      } else {
        // keep whatever smoothness was established, drop the G2 claim
        path.pointTypes[index] &=
          VarPackedPath.SMOOTH_FLAG | (establishedG1 ? 0 : ~VarPackedPath.SMOOTH_FLAG);
        if (!establishedG1 && (pointTypeBefore & VarPackedPath.SMOOTH_FLAG) === 0) {
          path.pointTypes[index] = pointTypeBefore;
        }
      }
    } else if (establishedG1) {
      // G2 could not be achieved, but the node has already been converted to a
      // smooth node (with its handles). Leave it as that valid plain-smooth
      // node rather than restoring "corner" on a point that now carries
      // handles -- that state would be inconsistent.
      path.pointTypes[index] |= smoothFlag;
    } else {
      // nothing was attempted beyond the solve; leave the node untouched
      path.pointTypes[index] = pointTypeBefore;
    }
  }

  return anyApplied;
}

// Advance on-curve points along the node-kind cycle, which is what a plain
// double-click does:
//
//     corner --> smooth --> squircle --> corner --> ...
//
// The order is increasing continuity (sharp, tangent-continuous,
// curvature-continuous), so repeatedly double-clicking walks "up" through the
// kinds and wraps around. Note this is deliberately NOT a two-state toggle:
// double-clicking is no longer its own inverse, and stepping from smooth to
// squircle genuinely reshapes the outline (that is what making a join
// curvature-continuous means). Use Shift+double-click for a direct jump to
// squircle from anywhere, and the undo stack to step back.
//
// The target is derived from the first eligible point and applied to all of
// them, matching toggleSmooth's convention for multi-point selections.
// Returns the target kind ("corner" | "smooth" | "squircle"), or undefined when
// nothing was eligible.
// `opts` is forwarded to makeSquircle (and thus to the G2 solve): by default
// the squircle step may slide the node a little -- see ADR-0010.
export function advanceNodeKind(path, pointIndices, opts = {}) {
  const onCurve = VarPackedPath.ON_CURVE;
  const smoothFlag = VarPackedPath.SMOOTH_FLAG;
  const squircleFlag = VarPackedPath.SQUIRCLE_FLAG;

  let target;
  for (const pointIndex of pointIndices) {
    const pointType = path.pointTypes[pointIndex];
    if ((pointType & VarPackedPath.POINT_TYPE_MASK) !== onCurve) {
      continue; // off-curve handles never carry a node kind
    }
    const [prevIndex, , nextIndex] = neighborPoints(path, pointIndex);
    if (prevIndex === undefined || nextIndex === undefined) {
      continue; // open path endpoint
    }
    if (pointType & squircleFlag) {
      target = "corner";
    } else if (pointType & smoothFlag) {
      target = "squircle";
    } else {
      target = "smooth";
    }
    break;
  }

  if (target === undefined) {
    return undefined;
  }
  if (target === "smooth") {
    toggleSmooth(path, pointIndices, smoothFlag, opts);
  } else if (target === "squircle") {
    makeSquircle(path, pointIndices, undefined, opts);
  } else {
    // corner: assigning ON_CURVE clears the smooth and squircle flags both, and
    // reconstructs the geometry so the node really is a corner (pass 4)
    toggleSmooth(path, pointIndices, onCurve, opts);
  }
  return target;
}

function neighborPoints(path, pointIndex) {
  const [contourIndex, contourPointIndex] = path.getContourAndPointIndex(pointIndex);
  const contourStartIndex = path.getAbsolutePointIndex(contourIndex, 0);
  const numPoints = path.getNumPointsOfContour(contourIndex);
  const isClosed = path.contourInfo[contourIndex].isClosed;
  let prevIndex = contourPointIndex - 1;
  let nextIndex = contourPointIndex + 1;
  if (path.contourInfo[contourIndex].isClosed) {
    prevIndex = modulo(prevIndex, numPoints);
    nextIndex = modulo(nextIndex, numPoints);
  }
  let prevPoint, nextPoint;
  if (prevIndex >= 0) {
    prevIndex += contourStartIndex;
    prevPoint = path.getPoint(prevIndex);
  } else {
    prevIndex = undefined;
  }
  if (nextIndex < numPoints) {
    nextIndex += contourStartIndex;
    nextPoint = path.getPoint(nextIndex);
  } else {
    nextIndex = undefined;
  }
  return [prevIndex, prevPoint, nextIndex, nextPoint];
}

function alignHandle(refPoint1, anchorPoint, handlePoint) {
  const direction = vector.subVectors(anchorPoint, refPoint1);
  return alignHandleAlongDirection(direction, anchorPoint, handlePoint);
}

function alignHandles(handleIn, anchorPoint, handleOut) {
  const handleVectorIn = vector.subVectors(anchorPoint, handleIn);
  const handleVectorOut = vector.subVectors(anchorPoint, handleOut);
  const directionIn = vector.subVectors(handleVectorOut, handleVectorIn);
  const directionOut = vector.subVectors(handleVectorIn, handleVectorOut);
  return [
    alignHandleAlongDirection(directionIn, anchorPoint, handleIn),
    alignHandleAlongDirection(directionOut, anchorPoint, handleOut),
  ];
}

function alignHandleAlongDirection(direction, anchorPoint, handlePoint) {
  const length = vector.vectorLength(vector.subVectors(handlePoint, anchorPoint));
  const handleVector = vector.mulVectorScalar(
    vector.normalizeVector(direction),
    length
  );
  return vector.roundVector(vector.addVectors(anchorPoint, handleVector));
}

export function slicePaths(intersections, ...paths) {
  assert(arePathsCompatible(paths), "paths must be compatible");

  intersections = intersections.map((intersection) => {
    return { ...intersection };
  });
  intersections.sort(pointCompareFunc);

  for (const [i, intersection] of enumerate(intersections)) {
    intersection.sortIndex = i; // Keep the original sort order
  }

  const sortedIntersections = [...intersections];
  sortedIntersections.sort((a, b) => {
    if (a.contourIndex != b.contourIndex) {
      return b.contourIndex - a.contourIndex; // descending sort
    } else if (a.segmentIndex != b.segmentIndex) {
      return b.segmentIndex - a.segmentIndex; // descending sort
    } else {
      return a.t - b.t; // ascending sort
    }
  });

  for (const path of paths) {
    sliceSinglePath(intersections, sortedIntersections, path);
  }
}

const intersectionIdentifierKey = "fontra.knife.tmp.intersection.identifier";

function sliceSinglePath(intersections, sortedIntersections, path) {
  // `intersections` is expected to be sorted by intersection point position (x, y).
  // `sortedIntersections` is expected to be reverse-sorted by contourIndex and
  // segmentIndex, but forward-sorted by t.
  // We insert points from the end of the path, so preceding indices stay valid.
  // Single segments with multiple intersections should be passed together to
  // insertPoint, but sorted by t.

  assert(intersections.length == sortedIntersections.length);

  const intersectionInfo = new Array(intersections.length);

  // Insert points
  let insertedPointIndices = [];
  for (const segmentIntersections of groupIntersectionsBySegment(sortedIntersections)) {
    const { numPointsInserted, selectedPointIndices } = insertPoint(
      path,
      ...segmentIntersections
    );

    // Link point(s) to intersection(s) info via temporary point attrs
    const firstIntersection = segmentIntersections[0];

    for (const [pointIndex, intersection] of zip(
      selectedPointIndices,
      segmentIntersections
    )) {
      const point = path.getPoint(pointIndex);
      assert(
        !intersectionInfo[intersection.sortIndex],
        `${intersection.sortIndex} ${intersectionInfo[intersection.sortIndex]}`
      );
      intersectionInfo[intersection.sortIndex] = {
        contourIndex: firstIntersection.contourIndex,
        contourIsClosed: path.contourInfo[firstIntersection.contourIndex].isClosed,
      };
      const attrs = {
        ...point.attrs,
        [intersectionIdentifierKey]: intersection.sortIndex,
      };
      path.setPointAttrs(pointIndex, attrs);
    }

    insertedPointIndices = insertedPointIndices.map(
      (pointIndex) => pointIndex + numPointsInserted
    );
    insertedPointIndices.splice(0, 0, ...selectedPointIndices);
  }

  // Split path at the insert points
  splitPathAtPointIndices(path, insertedPointIndices);

  // We will now determine which intersections can be connected to other intersections

  const connectableIntersections = filterSelfIntersectingContours(
    filterOpenContours(intersections, intersectionInfo)
  );

  if (connectableIntersections.length < 2 || connectableIntersections.length % 2) {
    // We're not going to try to make sense of an odd number of intersections,
    // or there's nothing to connect
    cleanupPointAttributes(path);
    return;
  }

  // Collect contours to be connected
  const contoursToConnect = collectContoursToConnect(path);

  // If the remaining intersections are a clean run with alternating winding directions,
  // join paths, taking all remaining intersections into account. Else, we join per
  // original contour.
  const intersectionsAreClean = areIntersectionsClean(connectableIntersections);

  if (!intersectionsAreClean) {
    connectableIntersections.sort((a, b) =>
      a.contourIndex != b.contourIndex
        ? a.contourIndex - b.contourIndex
        : a.sortIndex - b.sortIndex
    );
  }

  const chainedContourIndices = chainContours(
    intersectionsAreClean,
    connectableIntersections,
    contoursToConnect
  );

  // Build new contours
  const newContours = [];
  for (const contoursToBeConnected of chainedContourIndices) {
    const newContour = { points: [], isClosed: true };
    for (const contourIndex of contoursToBeConnected) {
      const contour = path.getUnpackedContour(contourIndex);
      arrayExtend(newContour.points, contour.points);
    }
    newContours.push(newContour);
  }

  const contoursToBeDeleted = [...new Set(chainedContourIndices.flat())].sort(
    (a, b) => b - a // Descending!
  );
  const contourInsertionIndex = Math.min(...chainedContourIndices.flat());

  contoursToBeDeleted.forEach((contourIndex) => path.deleteContour(contourIndex));
  newContours.reverse();
  newContours.forEach((contour) =>
    path.insertUnpackedContour(contourInsertionIndex, contour)
  );

  cleanupPointAttributes(path);
}

function* groupIntersectionsBySegment(intersections) {
  let currentGroup;
  for (const intersection of intersections) {
    if (
      currentGroup?.length &&
      intersection.contourIndex == currentGroup[0].contourIndex &&
      intersection.segmentIndex == currentGroup[0].segmentIndex
    ) {
      currentGroup.push(intersection);
    } else {
      if (currentGroup) {
        yield currentGroup;
      }
      currentGroup = [intersection];
    }
  }
  if (currentGroup) {
    yield currentGroup;
  }
}

function* groupIntersectionsByPair(intersections) {
  assert(!(intersections.length % 2), "number of intersections must be even");
  for (const i of range(0, intersections.length, 2)) {
    yield [intersections[i], intersections[i + 1]];
  }
}

function filterOpenContours(intersections, intersectionInfo) {
  return intersections.filter(
    (intersection) =>
      intersection.winding && intersectionInfo[intersection.sortIndex].contourIsClosed
  );
}

function filterSelfIntersectingContours(intersections) {
  const contourWindings = [];
  const contourSelfIntersects = [];
  for (const intersection of intersections) {
    const contourIndex = intersection.contourIndex;
    contourWindings[contourIndex] =
      (contourWindings[contourIndex] || 0) + intersection.winding;
    if (contourWindings[contourIndex] > 1 || contourWindings[contourIndex] < -1) {
      contourSelfIntersects[contourIndex] = true;
    }
  }
  return intersections.filter(
    (intersection) => !contourSelfIntersects[intersection.contourIndex]
  );
}

function collectContoursToConnect(path) {
  let firstPointIndex = 0;
  const intersectionContoursRight = [];
  const intersectionContoursLeft = [];
  for (const contourIndex of range(path.numContours)) {
    const lastPointIndex = path.contourInfo[contourIndex].endPoint;
    const firstPoint = path.getPoint(firstPointIndex);
    const lastPoint = path.getPoint(lastPointIndex);

    const firstIntersectionIndex = firstPoint.attrs?.[intersectionIdentifierKey];
    const lastIntersectionIndex = lastPoint.attrs?.[intersectionIdentifierKey];

    if (firstIntersectionIndex !== undefined && lastIntersectionIndex !== undefined) {
      intersectionContoursRight[firstIntersectionIndex] = contourIndex;
      intersectionContoursLeft[lastIntersectionIndex] = contourIndex;
    }
    firstPointIndex = lastPointIndex + 1;
  }
  return { intersectionContoursRight, intersectionContoursLeft };
}

function areIntersectionsClean(intersections) {
  let currentWindingDirection;
  for (const intersection of intersections) {
    if (!intersection.winding) {
      // Sanity check, shouldn't happen
      return false;
    }
    if (currentWindingDirection === intersection.winding) {
      return false;
    }
    currentWindingDirection = intersection.winding;
  }
  return true;
}

function chainContours(
  intersectionsAreClean,
  connectableIntersections,
  contoursToConnect
) {
  const { intersectionContoursRight, intersectionContoursLeft } = contoursToConnect;
  const contourLinks = [];
  for (const [int1, int2] of groupIntersectionsByPair(connectableIntersections)) {
    if (!intersectionsAreClean && int1.contourIndex !== int2.contourIndex) {
      continue;
    }
    contourLinks[intersectionContoursLeft[int1.sortIndex]] =
      intersectionContoursRight[int2.sortIndex];
    contourLinks[intersectionContoursLeft[int2.sortIndex]] =
      intersectionContoursRight[int1.sortIndex];
  }

  let firstIndex;
  const chainedContourIndices = [];
  while ((firstIndex = contourLinks.findIndex((item) => item != null)) >= 0) {
    assert(firstIndex >= 0);
    const contourIndices = [];
    let index = firstIndex;
    for (const i of range(contourLinks.length)) {
      const next = contourLinks[index];
      if (next == null) {
        break;
      }
      contourIndices.push(index);
      contourLinks[index] = null;
      index = next;
    }
    chainedContourIndices.push(contourIndices);
  }

  return chainedContourIndices;
}

function cleanupPointAttributes(path) {
  // Clean up temp point attrs
  assert(path.numPoints, path.numPoints);
  for (const pointIndex of range(path.numPoints)) {
    const point = path.getPoint(pointIndex);
    if (point.attrs && intersectionIdentifierKey in point.attrs) {
      point.attrs = { ...point.attrs };
      delete point.attrs[intersectionIdentifierKey];
      path.setPoint(pointIndex, point);
    }
  }
  if (
    path.pointAttributes &&
    !path.pointAttributes.some((attrs) => attrs && !isObjectEmpty(attrs))
  ) {
    path.pointAttributes = null;
  }
}

export function convertCurveType(
  path,
  selectedPointIndices,
  numQuadraticOffCurvePoints
) {
  const segments = convertCurveTypeSegments(
    path,
    selectedPointIndices,
    numQuadraticOffCurvePoints
  );

  if (numQuadraticOffCurvePoints) {
    convertSegmentsToQuadratic(path, segments, numQuadraticOffCurvePoints);
  } else {
    convertSegmentsToCubic(path, segments);
  }

  return path;
}

export function canConvertCurveType(
  path,
  selectedPointIndices,
  numQuadraticOffCurvePoints
) {
  return !!convertCurveTypeSegments(
    path,
    selectedPointIndices,
    numQuadraticOffCurvePoints
  ).length;
}

function convertCurveTypeSegments(
  path,
  selectedPointIndices,
  numQuadraticOffCurvePoints
) {
  const sel = new Set(selectedPointIndices);
  const sourceSegmentTypes = numQuadraticOffCurvePoints
    ? ["cubic"]
    : ["quad", "quadBlob"];
  const targetSegmentType = numQuadraticOffCurvePoints ? "quad" : "cubic";

  const segments = [];

  for (const contourIndex of range(path.numContours)) {
    for (const { type, pointIndices } of path.iterContourSegmentPointIndices(
      contourIndex
    )) {
      if (
        sourceSegmentTypes.includes(type) &&
        pointIndices.length > 2 &&
        ((sel.has(pointIndices[0]) && sel.has(pointIndices.at(-1))) ||
          pointIndices.slice(1, -1).some((i) => sel.has(i)))
      ) {
        const startPoint = path.getAbsolutePointIndex(contourIndex, 0);
        segments.push({
          type,
          contourIndex,
          pointIndices: pointIndices.map((i) => i - startPoint),
        });
      }
    }
  }

  segments.reverse(); // Change from the end, so we don't invalidate point indices

  return segments;
}

function convertSegmentsToCubic(path, segments) {
  for (const { type, contourIndex, pointIndices } of segments) {
    const contourFragment = {
      isClosed: false,
      points: getPoints(path, contourIndex, pointIndices),
    };
    const [h1, h2] = computeHandlesFromFragment("cubic", contourFragment);

    replaceOffCurvePoints(path, contourIndex, pointIndices, [h1, h2]);
  }
}

function convertSegmentsToQuadratic(path, segments, numQuadraticOffCurvePoints) {
  for (const { type, contourIndex, pointIndices } of segments) {
    if (type !== "cubic" || pointIndices.length !== 4) {
      continue;
    }
    // Maybe TODO if type == "quad" && pointIndices.length != numQuadraticOffCurvePoints:
    //   refit?

    const points = getPoints(path, contourIndex, pointIndices);
    const bez = new Bezier(...points);
    const ts = [...range(1, numQuadraticOffCurvePoints)].map(
      (i) => i / numQuadraticOffCurvePoints
    );

    const tangentLines = ts.map((t) => {
      const point1 = bez.compute(t);
      const point2 = vector.addVectors(point1, bez.derivative(t));
      return { point1, point2 };
    });

    tangentLines.splice(0, 0, { point1: points[0], point2: points[1] });
    tangentLines.push({ point1: points[2], point2: points[3] });

    assert(tangentLines.length === numQuadraticOffCurvePoints + 1);

    const offCurvePoints = [];

    for (const i of range(numQuadraticOffCurvePoints)) {
      const intersection = vector.intersect(
        tangentLines[i].point1,
        tangentLines[i].point2,
        tangentLines[i + 1].point1,
        tangentLines[i + 1].point2
      );

      if (!intersection) {
        // Edge case we can't handle, give up
        return;
      }

      offCurvePoints.push({ x: intersection.x, y: intersection.y, type: "quad" });
    }

    replaceOffCurvePoints(path, contourIndex, pointIndices, offCurvePoints);
  }
}

function getPoints(path, contourIndex, pointIndices) {
  return pointIndices.map((i) => path.getContourPoint(contourIndex, i));
}

function replaceOffCurvePoints(path, contourIndex, pointIndices, offCurvePoints) {
  let insertionIndex = pointIndices[0] + 1;
  for (const _ of range(pointIndices.length - 2)) {
    path.deletePoint(contourIndex, insertionIndex);
  }

  for (const point of offCurvePoints) {
    path.insertPoint(contourIndex, insertionIndex, point);
    insertionIndex++;
  }
}
