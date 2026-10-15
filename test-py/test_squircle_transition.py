import copy
import json
import pathlib

import pytest

from fontra.core.path import PackedPath, PointType
from fontra.core.squircle_transition import (
    LineCurveJoin,
    curvature,
    derive_line_curve_transition,
    derive_squircle_transitions,
    polyline_self_intersects,
    split_cubic,
)

vectorsPath = (
    pathlib.Path(__file__).parent.parent
    / "test-common"
    / "squircle-line-curve-vectors.json"
)
vectors = json.loads(vectorsPath.read_text(encoding="utf-8"))
cases = vectors["cases"]
okCases = [case for case in cases if case["expected"]["status"] == "ok"]


def joinFromCase(case) -> LineCurveJoin:
    data = case["input"]
    return LineCurveJoin(
        node=tuple(data["node"]),
        line_far=tuple(data["lineFar"]),
        curve_near=tuple(data["curve"]["near"]),
        curve_far=tuple(data["curve"]["far"]),
        curve_end=tuple(data["curve"]["end"]),
        setback=data["setback"],
    )


def makeLineCurvePath(closed: bool = True, squircle: bool = True) -> PackedPath:
    """A --straight-- P --curve--> C, with P flagged as a squircle node."""
    points = [
        {"x": -400.0, "y": 0.0},
        {"x": 0.0, "y": 0.0},
        {"x": 132.0, "y": 0.0, "type": "cubic"},
        {"x": 268.0, "y": 132.0, "type": "cubic"},
        {"x": 400.0, "y": 268.0},
    ]
    if squircle:
        points[1]["squircle"] = True
    else:
        points[1]["smooth"] = True
    return PackedPath.fromUnpackedContours(
        [{"points": points, "isClosed": closed}]
    )


def snapshot(path: PackedPath):
    return (
        list(path.coordinates),
        list(path.pointTypes),
        copy.deepcopy(path.contourInfo),
        copy.deepcopy(path.pointAttributes),
    )


# ---------------------------------------------------------------------------
# 1. the shared truth table, case by case
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("case", cases, ids=lambda case: case["name"])
def test_truth_table(case):
    data = case["input"]
    result = derive_line_curve_transition(joinFromCase(case), setback=data["setback"])
    expected = case["expected"]

    assert result.status == expected["status"]
    if expected["status"] != "ok":
        # a refusal must carry a reason and must not invent a transition
        assert result.reason == expected["reason"]
        assert result.transition is None
        return

    transition = result.transition
    for key in ("E", "c1", "c2", "M", "Q", "g1", "g2"):
        point = getattr(transition, key)
        assert point[0] == pytest.approx(expected[key][0], abs=1e-9), key
        assert point[1] == pytest.approx(expected[key][1], abs=1e-9), key
    for key in ("q", "mFrac", "s", "v", "kE", "k1m", "k2m", "k2q", "kh"):
        assert getattr(transition, key) == pytest.approx(
            expected[key], rel=1e-9, abs=1e-15
        ), key


# ---------------------------------------------------------------------------
# 2. G1 + G2 hold at E, M and Q of every solved case
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("case", okCases, ids=lambda case: case["name"])
def test_derived_joins_are_g1_and_g2(case):
    transition = derive_line_curve_transition(joinFromCase(case)).transition

    # E: zero curvature (the straight side has none) and its tangent follows the
    # line -- the tangent of [E, c1, c2, M] at E is along (c1 - E)
    assert transition.kE == pytest.approx(0.0, abs=1e-12)
    join = joinFromCase(case)
    lineDirection = (
        join.node[0] - join.line_far[0],
        join.node[1] - join.line_far[1],
    )
    tangentAtE = (
        transition.c1[0] - transition.E[0],
        transition.c1[1] - transition.E[1],
    )
    cross = lineDirection[0] * tangentAtE[1] - lineDirection[1] * tangentAtE[0]
    assert abs(cross) <= 1e-9 * (
        abs(lineDirection[0] * tangentAtE[1])
        + abs(lineDirection[1] * tangentAtE[0])
        + 1e-12
    )

    # M and Q: G1 residuals are dimensionless ~0, G2 needs equal magnitudes AND
    # the same bend sense (equal magnitude with opposite sense is a cusp)
    assert abs(transition.g1_residual_at_m) < 1e-9
    assert abs(transition.g1_residual_at_q) < 1e-9
    for left, right in ((transition.k1m, transition.k2m), (transition.k2q, transition.kh)):
        assert left * right > 0, "curvature senses must agree (no cusp)"
        assert abs(abs(left) - abs(right)) < 1e-9


# ---------------------------------------------------------------------------
# 3. the input path is never modified
# ---------------------------------------------------------------------------


def test_input_path_is_not_modified():
    for path in (makeLineCurvePath(), makeLineCurvePath(closed=False)):
        before = snapshot(path)
        derive_squircle_transitions(path)
        assert snapshot(path) == before


# ---------------------------------------------------------------------------
# 4. determinism
# ---------------------------------------------------------------------------


def test_derivation_is_deterministic():
    case = okCases[0]
    first = derive_line_curve_transition(joinFromCase(case))
    second = derive_line_curve_transition(joinFromCase(case))
    assert first.attempts == second.attempts
    assert first.failure_reasons == second.failure_reasons
    assert first.transition.as_vector_dict() == second.transition.as_vector_dict()

    path = makeLineCurvePath()
    derivedA, diagnosticsA = derive_squircle_transitions(path)
    derivedB, diagnosticsB = derive_squircle_transitions(path)
    assert derivedA.coordinates == derivedB.coordinates
    assert derivedA.pointTypes == derivedB.pointTypes
    assert len(diagnosticsA) == len(diagnosticsB)


# ---------------------------------------------------------------------------
# 5. the shape filter must actually bite
# ---------------------------------------------------------------------------


def test_shape_filter_catches_a_bowtie():
    bowtie = [(0.0, 0.0), (10.0, 10.0), (10.0, 0.0), (0.0, 10.0)]
    assert polyline_self_intersects(bowtie) is not None


def test_shape_filter_accepts_an_l_shape():
    lshape = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0)]
    assert polyline_self_intersects(lshape) is None


def test_shape_filter_accepts_a_monotone_curve():
    seg = ((-400.0, 0.0), (0.0, 0.0), (100.0, 20.0), (200.0, 60.0))
    samples = [split_cubic(*seg, i / 40.0)[0][3] for i in range(41)]
    assert polyline_self_intersects(samples) is None


# ---------------------------------------------------------------------------
# path level behaviour
# ---------------------------------------------------------------------------


def test_path_level_derives_the_expected_join():
    """The path-level scan must pick the same join and produce the same geometry
    as the pure function called with that join and the default setback.

    (The truth table pins the SOLVER for a given setback; the path level picks
    the setback by its own documented rule, so it is checked against the pure
    function rather than against the table's numbers.)
    """
    from fontra.core.squircle_transition import default_setback

    path = makeLineCurvePath()
    derived, diagnostics = derive_squircle_transitions(path)

    assert [(d.status, d.pointIndex) for d in diagnostics] == [("ok", 1)]
    join = LineCurveJoin(
        node=(0.0, 0.0),
        line_far=(-400.0, 0.0),
        curve_near=(132.0, 0.0),
        curve_far=(268.0, 132.0),
        curve_end=(400.0, 268.0),
        setback=0.0,
    )
    expected = derive_line_curve_transition(join, setback=default_setback(join))
    assert expected.status == "ok"
    assert diagnostics[0].setback == pytest.approx(default_setback(join))

    # the stored node and its two controls are consumed; the run gains E, M and Q
    assert len(path.pointTypes) == 5
    assert len(derived.pointTypes) == 5 - 3 + 9
    assert PointType.ON_CURVE_SQUIRCLE not in derived.pointTypes
    # ... starting with A, E (the derived points follow the unchanged A)
    assert (derived.coordinates[0], derived.coordinates[1]) == (-400.0, 0.0)
    assert (derived.coordinates[2], derived.coordinates[3]) == pytest.approx(
        expected.transition.E
    )
    assert (derived.coordinates[4], derived.coordinates[5]) == pytest.approx(
        expected.transition.c1
    )


def test_path_level_leaves_an_open_contour_alone():
    path = makeLineCurvePath(closed=False)
    derived, diagnostics = derive_squircle_transitions(path)
    assert [d.reason for d in diagnostics] == ["open-contour"]
    assert derived.coordinates == path.coordinates
    assert derived.pointTypes == path.pointTypes


def test_path_level_ignores_a_curve_to_curve_join():
    points = [
        {"x": -400.0, "y": 0.0},
        {"x": -200.0, "y": 120.0, "type": "cubic"},
        {"x": -60.0, "y": 0.0, "type": "cubic"},
        {"x": 0.0, "y": 0.0, "squircle": True},
        {"x": 60.0, "y": 0.0, "type": "cubic"},
        {"x": 200.0, "y": 120.0, "type": "cubic"},
        {"x": 400.0, "y": 0.0},
    ]
    path = PackedPath.fromUnpackedContours(
        [{"points": points, "isClosed": True}]
    )
    derived, diagnostics = derive_squircle_transitions(path)
    assert [(d.status, d.reason) for d in diagnostics] == [
        ("refused", "not-a-line-to-curve-join")
    ]
    assert derived.coordinates == path.coordinates
    assert derived.pointTypes == path.pointTypes


def test_path_level_refuses_when_there_is_no_room():
    # a straight run far shorter than the setback the curve's scale would want
    points = [
        {"x": -20.0, "y": 0.0},
        {"x": 0.0, "y": 0.0, "squircle": True},
        {"x": 132.0, "y": 0.0, "type": "cubic"},
        {"x": 268.0, "y": 132.0, "type": "cubic"},
        {"x": 400.0, "y": 268.0},
    ]
    path = PackedPath.fromUnpackedContours(
        [{"points": points, "isClosed": True}]
    )
    derived, diagnostics = derive_squircle_transitions(path)
    assert [(d.status, d.reason) for d in diagnostics] == [("refused", "no-room")]
    # refused means "draw exactly what is stored"
    assert derived.coordinates == path.coordinates
    assert derived.pointTypes == path.pointTypes


def test_export_helper_falls_back_on_failure(monkeypatch):
    from fontra.core import squircle_transition
    from fontra.filesystem import exportmanager

    path = makeLineCurvePath()

    def boom(_path):
        raise RuntimeError("derivation exploded")

    # _drawablePath imports the function inside itself, so patch the module it
    # imports from
    monkeypatch.setattr(squircle_transition, "derive_squircle_transitions", boom)
    assert exportmanager._drawablePath(path, "A") is path


# ---------------------------------------------------------------------------
# 6. the path-level truth table: BOTH orientations plus the refusals
# ---------------------------------------------------------------------------

pathCases = vectors["pathCases"]


@pytest.mark.parametrize("case", pathCases, ids=lambda case: case["name"])
def test_path_truth_table(case):
    from fontra.core.squircle_transition import path_from_points

    path = path_from_points(case["input"]["contour"], case["input"]["isClosed"])
    before = snapshot(path)
    derived, diagnostics = derive_squircle_transitions(path)
    expected = case["expected"]

    # deriving must never touch the path it was handed
    assert snapshot(path) == before

    if expected["status"] != "ok":
        assert [(d.status, d.reason) for d in diagnostics] == [
            ("refused", expected["reason"])
        ]
        # a refusal must draw exactly the stored outline -- never half a transition
        assert derived.coordinates == path.coordinates
        assert derived.pointTypes == path.pointTypes
        return

    assert [(d.status, d.pointIndex) for d in diagnostics] == [
        ("ok", expected["pointIndex"])
    ]
    assert diagnostics[0].setback == pytest.approx(expected["setback"])
    assert len(derived.pointTypes) == len(expected["contour"])
    for index, point in enumerate(expected["contour"]):
        assert derived.coordinates[index * 2] == pytest.approx(point["x"], abs=1e-9)
        assert derived.coordinates[index * 2 + 1] == pytest.approx(point["y"], abs=1e-9)
        assert int(derived.pointTypes[index]) == point["pointType"]


def test_mirrored_case_is_the_reverse_of_the_canonical_one():
    """Both orientations must produce the SAME transition, traversed the other way.

    This is the case that was missing: the mirrored orientation worked but
    nothing pinned it, so a peer implementation could ship only the canonical
    half and still pass every test.
    """
    canonical = next(
        case for case in pathCases if case["name"] == "path-convex-quarter-arc"
    )
    mirrored = next(
        case for case in pathCases if case["name"] == "path-convex-quarter-arc-mirrored"
    )
    assert canonical["expected"]["status"] == "ok"
    assert mirrored["expected"]["status"] == "ok"
    forward = [
        (p["x"], p["y"], p["pointType"]) for p in canonical["expected"]["contour"]
    ]
    backward = [
        (p["x"], p["y"], p["pointType"]) for p in mirrored["expected"]["contour"]
    ]
    assert backward == list(reversed(forward))


# ---------------------------------------------------------------------------
# 7. the room rule is data in the table, not a threshold to guess
# ---------------------------------------------------------------------------


def test_room_rule_is_pinned_by_the_truth_table():
    from fontra.core.squircle_transition import (
        MAX_SETBACK_ROOM_RATIO,
        SETBACK_CURVE_FACTOR,
        room_rule,
    )

    assert vectors["roomRule"] == room_rule()
    assert vectors["roomRule"]["maxSetbackRoomRatio"] == MAX_SETBACK_ROOM_RATIO
    assert vectors["roomRule"]["setbackCurveFactor"] == SETBACK_CURVE_FACTOR
    for case in cases + pathCases:
        assert case["expected"]["roomRule"] == vectors["roomRule"], case["name"]


def test_room_rule_case_discriminates_a_looser_threshold():
    """A peer using 'refuse when setback >= room' must fail this case.

    The case sits at setback/room = 0.95, inside the (0.05, 1.0] band such a
    looser rule would accept, and this implementation refuses it at the room
    check with reason "no-room" and zero solver attempts.
    """
    from fontra.core.squircle_transition import MAX_SETBACK_ROOM_RATIO

    case = next(
        case for case in cases if case["name"] == "room-rule-setback-095-of-room"
    )
    ratio = case["input"]["setback"] / case["input"]["room"]
    assert 0.05 < ratio <= 1.0, "a looser rule would accept this setback"
    assert ratio >= MAX_SETBACK_ROOM_RATIO
    assert case["expected"]["status"] == "refused"
    assert case["expected"]["reason"] == "no-room"
    assert case["expected"]["attempts"] == 0
