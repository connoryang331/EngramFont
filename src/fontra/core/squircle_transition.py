"""Line-to-curve squircle ("raindrop") transitions -- DERIVED geometry.

See docs/adr/0012-squircle-line-curve-derived-transition.md. A squircle node whose
one side is a straight run and whose other side is a curve cannot express
curvature continuity in a single cubic pair (G1 forces both controls onto the
line, G2 forces their midpoint -- together they make that segment a straight
line). So the transition needs two segments and two extra points.

The STORED outline is never touched: the transition is materialised here, in
memory, for rendering and export only. Callers get a derived copy plus
diagnostics; a join that cannot be solved is left exactly as it was, and the
caller draws the original path.

Derived outline (line A...P, curve P->Y->hC->C; P is smooth, so the curve's
tangent at P runs along the line):

    A --straight-- E --seg1--> M --seg2--> Q --second half of the curve--> C

`Q` is an exact de Casteljau split point of `[P, Y, hC, C]`; the first half and P
itself are dropped, so the direction of travel never reverses (an earlier
version that inherited the original handles made the outline turn back on itself
at P -- see the ADR for the numeric evidence).

Conditions (6):
  E: G1 (tangent along the line) + G2 (zero curvature) -- BY CONSTRUCTION
  M: G1 + G2 magnitude + G2 sense
  Q: G1 + G2 magnitude + G2 sense

The two G1 conditions at M and Q are also satisfied by construction:
    g1 = M + s * (M - c2)      seg2 leaves M along seg1's tangent
    g2 = Q - v * (half[1] - Q) seg2 arrives at Q along the rejoin tangent
so only the two magnitude conditions remain, and those are COUPLED (the
curvature at M depends on seg2's end handle g2 as well, via B''(0)), hence one
2x2 damped Newton on (s, v) rather than two sequential 1-D solves.

Everything here is deterministic: fixed grid order, fixed guesses, fixed
iteration caps, no randomness.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional, Sequence

from .path import ContourInfo, PackedPath, Point, PointType

Point2 = tuple[float, float]
Cubic = tuple[Point2, Point2, Point2, Point2]

# The deterministic search space, matching the validated prototype
# (qa/probe-raindrop-v2b.py): 23 x 16 x 6 = 2208 attempts per join.
Q_VALUES: tuple[float, ...] = tuple(round(0.08 + 0.04 * i, 10) for i in range(23))
M_FRACTIONS: tuple[float, ...] = tuple(round(0.10 + 0.05 * i, 10) for i in range(16))
INITIAL_GUESSES: tuple[tuple[float, float], ...] = (
    (1.0, 0.5),
    (0.4, 1.0),
    (2.0, 0.25),
    (0.7, 0.7),
    (1.5, 1.5),
    (0.25, 0.4),
)
#: The rescue sweep. The main grid covers the shapes the validated prototype
#: was tuned on; some feasible joins -- notably a right-angle corner whose
#: curve handle sits on the chord, exactly what smoothing a rectangle corner
#: produces -- have narrow convergence basins the main q steps step over.
#: Finer q steps plus wider Newton guesses recover them. Only consulted when
#: the main grid finds nothing, so fast paths and every existing result stay
#: unchanged.
FALLBACK_Q_VALUES: tuple[float, ...] = tuple(
    round(0.05 + 0.025 * i, 10) for i in range(37)
)
FALLBACK_INITIAL_GUESSES: tuple[tuple[float, float], ...] = INITIAL_GUESSES + (
    (0.1, 0.3),
    (0.1, 1.0),
    (0.1, 3.0),
    (0.3, 1.0),
)

MAX_NEWTON_ITERATIONS = 80
MAX_HALVINGS = 30
NEWTON_TOLERANCE = 1e-14
ACCEPT_RESIDUAL_TOLERANCE = 1e-9
NEWTON_STEP_TOLERANCE = 1e-7
MIN_SEGMENT_SCALE = 1e-3
#: How much of the straight run one setback may take. Beyond this there is no
#: straight part left to anchor the transition on -> "no room".
MAX_SETBACK_ROOM_RATIO = 0.9
#: The transition is sized like the curve it continues: this fraction of the
#: curve's handle length at the node.
SETBACK_CURVE_FACTOR = 0.5

OFF_CURVE_TYPES = frozenset({PointType.OFF_CURVE_CUBIC, PointType.OFF_CURVE_QUAD})


# --------------------------------------------------------------------------
# vector and cubic helpers
# --------------------------------------------------------------------------


def _add(a: Point2, b: Point2) -> Point2:
    return (a[0] + b[0], a[1] + b[1])


def _sub(a: Point2, b: Point2) -> Point2:
    return (a[0] - b[0], a[1] - b[1])


def _mul(a: Point2, s: float) -> Point2:
    return (a[0] * s, a[1] * s)


def _dot(a: Point2, b: Point2) -> float:
    return a[0] * b[0] + a[1] * b[1]


def _cross(a: Point2, b: Point2) -> float:
    return a[0] * b[1] - a[1] * b[0]


def _norm(a: Point2) -> float:
    return math.hypot(a[0], a[1])


def _unit(a: Point2) -> Point2:
    n = _norm(a)
    return (a[0] / n, a[1] / n) if n > 0 else (0.0, 0.0)


def _lerp(a: Point2, b: Point2, t: float) -> Point2:
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def _bezier_point(seg: Cubic, t: float) -> Point2:
    u = 1 - t
    p0, p1, p2, p3 = seg
    return (
        u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
        u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
    )


def _bezier_derivative(seg: Cubic, t: float) -> Point2:
    p0, p1, p2, p3 = seg
    u = 1 - t
    return (
        3
        * (
            u * u * (p1[0] - p0[0])
            + 2 * u * t * (p2[0] - p1[0])
            + t * t * (p3[0] - p2[0])
        ),
        3
        * (
            u * u * (p1[1] - p0[1])
            + 2 * u * t * (p2[1] - p1[1])
            + t * t * (p3[1] - p2[1])
        ),
    )


def _bezier_second_derivative(seg: Cubic, t: float) -> Point2:
    p0, p1, p2, p3 = seg
    u = 1 - t
    return (
        6 * (u * (p2[0] - 2 * p1[0] + p0[0]) + t * (p3[0] - 2 * p2[0] + p1[0])),
        6 * (u * (p2[1] - 2 * p1[1] + p0[1]) + t * (p3[1] - 2 * p2[1] + p1[1])),
    )


def curvature(seg: Cubic, t: float) -> tuple[float, Point2]:
    """Signed curvature and curvature VECTOR at ``t``.

    The vector is what a G2 join has to match: equal magnitudes with opposite
    senses (a cusp) are NOT curvature continuous, which is exactly the mistake
    the first solver revision made.
    """
    v = _bezier_derivative(seg, t)
    a = _bezier_second_derivative(seg, t)
    q = _dot(v, v)
    if not q > 0:
        return 0.0, (0.0, 0.0)
    k = _cross(v, a) / (q**1.5)
    inv = 1.0 / math.sqrt(q)
    return k, (k * -v[1] * inv, k * v[0] * inv)


def split_cubic(
    p0: Point2, p1: Point2, p2: Point2, p3: Point2, q: float
) -> tuple[Cubic, Cubic]:
    """Exact de Casteljau split into two cubics."""
    l0, l1, l2 = _lerp(p0, p1, q), _lerp(p1, p2, q), _lerp(p2, p3, q)
    l01, l12 = _lerp(l0, l1, q), _lerp(l1, l2, q)
    m = _lerp(l01, l12, q)
    return (p0, l0, l01, m), (m, l12, l2, p3)


# --------------------------------------------------------------------------
# shape sanity checks
# --------------------------------------------------------------------------


def _orient(a: Point2, b: Point2, c: Point2) -> int:
    v = _cross(_sub(b, a), _sub(c, a))
    return 0 if abs(v) < 1e-12 else (1 if v > 0 else -1)


def _segments_cross(p1: Point2, p2: Point2, p3: Point2, p4: Point2) -> bool:
    o1, o2 = _orient(p1, p2, p3), _orient(p1, p2, p4)
    o3, o4 = _orient(p3, p4, p1), _orient(p3, p4, p2)
    return o1 != o2 and o3 != o4 and 0 not in (o1, o2, o3, o4)


def polyline_self_intersects(
    points: Sequence[Point2], min_gap: int = 2
) -> Optional[tuple[int, int]]:
    """First crossing between non-adjacent stretches of a sampled outline.

    ``min_gap`` must stay small: it may only skip segments that share an
    endpoint. A bow-tie has three segments, and a larger gap silently skips
    every pair and reports it as clean.
    """
    count = len(points)
    for i in range(count - 1):
        for j in range(i + min_gap, count - 1):
            if _segments_cross(points[i], points[i + 1], points[j], points[j + 1]):
                return (i, j)
    return None


def _sample(seg: Cubic, steps: int = 40) -> list[Point2]:
    return [_bezier_point(seg, i / steps) for i in range(steps + 1)]


# --------------------------------------------------------------------------
# the join description and the derived transition
# --------------------------------------------------------------------------


@dataclass
class LineCurveJoin:
    """One line-to-curve squircle join, in the solver's own frame.

    ``line_far`` is the far on-curve point of the straight run, ``curve_*``
    describe the cubic leaving the node: ``curve_near`` is the control adjacent
    to the node, ``curve_far`` the other control, ``curve_end`` the next on-curve
    point. ``setback`` is how far E may retreat along the line.
    """

    node: Point2
    line_far: Point2
    curve_near: Point2
    curve_far: Point2
    curve_end: Point2
    setback: float


@dataclass
class Transition:
    """A solved transition: the derived points plus its measured residuals."""

    E: Point2
    c1: Point2
    c2: Point2
    M: Point2
    Q: Point2
    g1: Point2
    g2: Point2
    half_control_1: Point2
    half_control_2: Point2
    q: float
    mFrac: float
    s: float
    v: float
    kE: float
    k1m: float
    k2m: float
    k2q: float
    kh: float
    g1_residual_at_m: float
    g1_residual_at_q: float

    def derived_points(self) -> list[Point]:
        """The point list that replaces ``[node, curve_near, curve_far]``.

        Two new on-curve points (E on the line, M as the transition apex) plus a
        new on-curve split point Q, with four off-curve controls: c1, c2 for the
        ramp out of the line, g1, g2 for the run into the rejoin, and the second
        half's own two controls. ``node`` itself is consumed.
        """
        return [
            {"x": self.E[0], "y": self.E[1]},
            {"x": self.c1[0], "y": self.c1[1], "type": "cubic"},
            {"x": self.c2[0], "y": self.c2[1], "type": "cubic"},
            {"x": self.M[0], "y": self.M[1]},
            {"x": self.g1[0], "y": self.g1[1], "type": "cubic"},
            {"x": self.g2[0], "y": self.g2[1], "type": "cubic"},
            {"x": self.Q[0], "y": self.Q[1]},
            {"x": self.half_control_1[0], "y": self.half_control_1[1], "type": "cubic"},
            {"x": self.half_control_2[0], "y": self.half_control_2[1], "type": "cubic"},
        ]

    def residuals(self) -> dict[str, float]:
        return {
            "kE": self.kE,
            "k1m": self.k1m,
            "k2m": self.k2m,
            "k2q": self.k2q,
            "kh": self.kh,
            "g1M": self.g1_residual_at_m,
            "g1Q": self.g1_residual_at_q,
        }

    def as_vector_dict(self) -> dict:
        """Plain data for the shared truth table."""

        def pt(p: Point2) -> list[float]:
            return [p[0], p[1]]

        return {
            "E": pt(self.E),
            "c1": pt(self.c1),
            "c2": pt(self.c2),
            "M": pt(self.M),
            "Q": pt(self.Q),
            "g1": pt(self.g1),
            "g2": pt(self.g2),
            "q": self.q,
            "mFrac": self.mFrac,
            "s": self.s,
            "v": self.v,
            **self.residuals(),
        }


@dataclass
class DerivationResult:
    status: str  # "ok" | "refused"
    reason: str = ""
    transition: Optional[Transition] = None
    attempts: int = 0
    failure_reasons: dict[str, int] = field(default_factory=dict)


@dataclass
class _Candidate:
    transition: Transition
    score: float  # |M - node|: prefer the apex closest to the drawn corner


def _try_solve(
    join: LineCurveJoin,
    setback: float,
    q: float,
    m_frac: float,
    guess: tuple[float, float],
) -> tuple[Optional[Transition], str]:
    """One (setback, q, mFrac, guess) attempt.

    Returns ``(transition, "")`` or ``(None, refusal reason)``. The setback is
    passed in explicitly rather than read from ``join``: callers may resolve a
    default, so the join's own field can legitimately be stale (0.0).
    """
    node = join.node
    direction = _unit(_sub(node, join.line_far))
    if direction == (0.0, 0.0):
        return None, "degenerate-line"
    E = _add(node, _mul(direction, -setback))
    beta = setback / 2.0
    c2 = _add(E, _mul(direction, beta))
    c1 = _mul(_add(E, c2), 0.5)
    _first_half, half = split_cubic(
        node, join.curve_near, join.curve_far, join.curve_end, q
    )
    Q = half[0]
    M = _lerp(node, Q, m_frac)

    def seg1() -> Cubic:
        return (E, c1, c2, M)

    def seg2_of(s: float, v: float) -> Cubic:
        g1 = _add(M, _mul(_sub(M, c2), s))
        g2 = _sub(Q, _mul(_sub(half[1], Q), v))
        return (M, g1, g2, Q)

    k1 = curvature(seg1(), 1.0)[0]
    kh0 = curvature(half, 0.0)[0]

    def residuals(point: tuple[float, float]) -> list[float]:
        seg2 = seg2_of(point[0], point[1])
        return [
            abs(curvature(seg2, 0.0)[0]) - abs(k1),
            abs(curvature(seg2, 1.0)[0]) - abs(kh0),
        ]

    point = list(guess)
    converged = False
    for _ in range(MAX_NEWTON_ITERATIONS):
        r = residuals(point)
        cost0 = max(abs(z) for z in r)
        if cost0 < NEWTON_TOLERANCE:
            converged = True
            break
        jacobian = []
        for i in range(2):
            h = NEWTON_STEP_TOLERANCE * max(1.0, abs(point[i]))
            probe = list(point)
            probe[i] += h
            rp = residuals(probe)
            jacobian.append([(rp[j] - r[j]) / h for j in range(2)])
        det = jacobian[0][0] * jacobian[1][1] - jacobian[0][1] * jacobian[1][0]
        if abs(det) < 1e-18:
            break
        rhs = [-r[0], -r[1]]
        dx = [
            (jacobian[1][1] * rhs[0] - jacobian[0][1] * rhs[1]) / det,
            (-jacobian[1][0] * rhs[0] + jacobian[0][0] * rhs[1]) / det,
        ]
        step = 1.0
        moved = False
        for _ in range(MAX_HALVINGS):
            candidate = [
                max(MIN_SEGMENT_SCALE, point[i] + step * dx[i]) for i in range(2)
            ]
            if max(abs(z) for z in residuals(candidate)) < cost0:
                point = candidate
                moved = True
                break
            step *= 0.5
        if not moved:
            break
    s, v = point

    seg1_final = seg1()
    seg2_final = seg2_of(s, v)
    k2m = curvature(seg2_final, 0.0)[0]
    k2q = curvature(seg2_final, 1.0)[0]
    if not converged:
        return None, "no-convergence"
    if (
        max(abs(abs(k2m) - abs(k1)), abs(abs(k2q) - abs(kh0)))
        > ACCEPT_RESIDUAL_TOLERANCE
    ):
        return None, "residual"
    if k1 * k2m <= 0 or k2q * kh0 <= 0:
        return None, "sense-mismatch"

    # shape sanity: no self-intersection, and M on the same side of the line as
    # the curve's bow
    sampled = (
        [join.line_far, E]
        + _sample(seg1_final)[1:]
        + _sample(seg2_final)[1:]
        + _sample(half)[1:]
    )
    if polyline_self_intersects(sampled) is not None:
        return None, "self-intersecting"
    same_side = _cross(direction, _sub(M, E)) * _cross(
        direction, _sub(join.curve_far, node)
    )
    if same_side <= 0:
        return None, "apex-on-wrong-side"

    transition = Transition(
        E=E,
        c1=c1,
        c2=c2,
        M=M,
        Q=Q,
        g1=seg2_final[1],
        g2=seg2_final[2],
        half_control_1=half[1],
        half_control_2=half[2],
        q=q,
        mFrac=m_frac,
        s=s,
        v=v,
        kE=curvature(seg1_final, 0.0)[0],
        k1m=k1,
        k2m=k2m,
        k2q=k2q,
        kh=kh0,
        g1_residual_at_m=_cross(_sub(M, c2), _sub(seg2_final[1], M))
        / (_norm(_sub(M, c2)) * _norm(_sub(seg2_final[1], M))),
        g1_residual_at_q=_cross(_sub(Q, seg2_final[2]), _sub(half[1], Q))
        / (_norm(_sub(Q, seg2_final[2])) * _norm(_sub(half[1], Q))),
    )
    return transition, "ok"


def default_setback(join: LineCurveJoin) -> float:
    """How far E retreats by default.

    The transition is sized like the curve it continues -- a fraction of that
    curve's handle length at the node -- so it neither hugs the corner nor runs
    off along a long straight edge. Whether it FITS is decided separately, by the
    room check in :func:`derive_line_curve_transition`.
    """
    scale = _norm(_sub(join.curve_near, join.node))
    return SETBACK_CURVE_FACTOR * scale


def _search_candidates(
    join: LineCurveJoin,
    setback: float,
    q_values: Sequence[float],
    m_fractions: Sequence[float],
    guesses: Sequence[tuple[float, float]],
    reasons: dict[str, int],
    attempts: int,
) -> tuple[list[_Candidate], int]:
    """One deterministic sweep of the search space.

    Accumulates refusal reasons in-place and returns ``(candidates, attempts)``
    with the running attempt count.
    """
    candidates: list[_Candidate] = []
    for q in q_values:
        for m_frac in m_fractions:
            for guess in guesses:
                attempts += 1
                transition, reason = _try_solve(join, setback, q, m_frac, guess)
                if transition is None:
                    reasons[reason] = reasons.get(reason, 0) + 1
                else:
                    candidates.append(
                        _Candidate(
                            transition=transition,
                            score=_norm(_sub(transition.M, join.node)),
                        )
                    )
    return candidates, attempts


def derive_line_curve_transition(
    join: LineCurveJoin,
    *,
    setback: Optional[float] = None,
) -> DerivationResult:
    """Solve one line-to-curve squircle join.

    Pure function: same input, same output, every time. Returns
    ``DerivationResult(status="refused", reason=...)`` instead of raising when the
    join cannot become a G2 transition -- the caller then draws the stored
    outline unchanged.
    """
    if setback is None:
        setback = default_setback(join)
    room = _norm(_sub(join.node, join.line_far))
    if not room > 0:
        return DerivationResult(status="refused", reason="degenerate-line")
    if setback <= 0:
        return DerivationResult(status="refused", reason="non-positive-setback")
    if setback >= MAX_SETBACK_ROOM_RATIO * room:
        return DerivationResult(
            status="refused",
            reason="no-room",
            attempts=0,
            failure_reasons={"no-room": 1},
        )

    candidates: list[_Candidate] = []
    reasons: dict[str, int] = {}
    attempts = 0
    candidates, attempts = _search_candidates(
        join, setback, Q_VALUES, M_FRACTIONS, INITIAL_GUESSES, reasons, attempts
    )
    if not candidates:
        # Nothing in the main grid: sweep the finer rescue grid before giving
        # up (see FALLBACK_Q_VALUES). Same scoring, same deterministic order.
        candidates, attempts = _search_candidates(
            join,
            setback,
            FALLBACK_Q_VALUES,
            M_FRACTIONS,
            FALLBACK_INITIAL_GUESSES,
            reasons,
            attempts,
        )
    if not candidates:
        return DerivationResult(
            status="refused",
            reason="no-solution",
            attempts=attempts,
            failure_reasons=reasons,
        )
    # deterministic: fixed iteration order, first best wins
    best = min(candidates, key=lambda c: c.score)
    return DerivationResult(
        status="ok",
        transition=best.transition,
        attempts=attempts,
        failure_reasons=reasons,
    )


# --------------------------------------------------------------------------
# path level
# --------------------------------------------------------------------------


@dataclass
class JoinDiagnostic:
    contourIndex: int
    pointIndex: int
    status: str
    reason: str = ""
    setback: float = 0.0
    attempts: int = 0
    failure_reasons: dict[str, int] = field(default_factory=dict)
    transition: Optional[Transition] = None


@dataclass
class _PackedPoint:
    x: float
    y: float
    pointType: PointType
    attributes: Optional[dict]


def _iter_packed_contours(
    path: PackedPath,
) -> list[tuple[list[_PackedPoint], bool]]:
    contours = []
    start = 0
    attributes = path.pointAttributes
    for contour_info in path.contourInfo:
        end = contour_info.endPoint + 1
        points = []
        for index in range(start, end):
            points.append(
                _PackedPoint(
                    x=path.coordinates[index * 2],
                    y=path.coordinates[index * 2 + 1],
                    pointType=path.pointTypes[index],
                    attributes=attributes[index] if attributes else None,
                )
            )
        contours.append((points, contour_info.isClosed))
        start = end
    return contours


def _point2(point: _PackedPoint) -> Point2:
    return (point.x, point.y)


def _off_curve_run(
    points: Sequence[_PackedPoint], index: int, step: int, is_closed: bool
) -> tuple[list[_PackedPoint], Optional[_PackedPoint]]:
    """Off-curve points walking outward from ``index``, plus the far on-curve point."""
    count = len(points)

    def at(position: int) -> Optional[int]:
        if is_closed:
            return position % count
        return position if 0 <= position < count else None

    handles: list[_PackedPoint] = []
    position = index + step
    guard = 0
    while guard < 3:
        guard += 1
        resolved = at(position)
        if resolved is None:
            return handles, None
        point = points[resolved]
        if point.pointType not in OFF_CURVE_TYPES:
            return handles, point
        handles.append(point)
        position = resolved + step
    return handles, None


def _derived_points_as_packed(transition: Transition) -> list[_PackedPoint]:
    packed = []
    for point in transition.derived_points():
        packed.append(
            _PackedPoint(
                x=point["x"],
                y=point["y"],
                pointType=(
                    PointType.ON_CURVE
                    if "type" not in point
                    else PointType.OFF_CURVE_CUBIC
                ),
                attributes=None,
            )
        )
    return packed


def _derive_contour(
    contour_index: int,
    points: list[_PackedPoint],
    is_closed: bool,
) -> tuple[list[_PackedPoint], list[JoinDiagnostic]]:
    """Return a rebuilt point list plus diagnostics. ``points`` is not mutated."""
    diagnostics: list[JoinDiagnostic] = []
    squircle_indices = [
        i for i, p in enumerate(points) if p.pointType == PointType.ON_CURVE_SQUIRCLE
    ]
    if not squircle_indices:
        return list(points), diagnostics

    # surgery: start index -> (replacement points, how many originals to skip)
    surgeries: dict[int, tuple[list[_PackedPoint], int]] = {}
    for index in squircle_indices:
        if not is_closed:
            diagnostics.append(
                JoinDiagnostic(
                    contourIndex=contour_index,
                    pointIndex=index,
                    status="refused",
                    reason="open-contour",
                )
            )
            continue
        in_handles, in_far = _off_curve_run(points, index, -1, is_closed)
        out_handles, out_far = _off_curve_run(points, index, +1, is_closed)
        line_in = not in_handles
        curve_in = len(out_handles) >= 2
        line_out = not out_handles
        curve_out = len(in_handles) >= 2

        if line_in and curve_in and in_far is not None and out_far is not None:
            # the canonical orientation: straight run in, curve out
            join = LineCurveJoin(
                node=_point2(points[index]),
                line_far=_point2(in_far),
                curve_near=_point2(out_handles[0]),
                curve_far=_point2(out_handles[1]),
                curve_end=_point2(out_far),
                setback=0.0,
            )
            setback = default_setback(join)
            result = derive_line_curve_transition(join, setback=setback)
            if result.status == "ok" and result.transition is not None:
                surgeries[index] = (
                    _derived_points_as_packed(result.transition),
                    3,  # node + its two curve controls
                )
                diagnostics.append(
                    JoinDiagnostic(
                        contourIndex=contour_index,
                        pointIndex=index,
                        status="ok",
                        setback=setback,
                        attempts=result.attempts,
                        transition=result.transition,
                    )
                )
            else:
                diagnostics.append(
                    JoinDiagnostic(
                        contourIndex=contour_index,
                        pointIndex=index,
                        status=result.status,
                        reason=result.reason,
                        setback=setback,
                        attempts=result.attempts,
                        failure_reasons=dict(result.failure_reasons),
                    )
                )
            continue

        if curve_out and line_out and in_far is not None and out_far is not None:
            # mirrored: the curve arrives and the line leaves. Solved with the
            # SAME solver on the reversed slice, so there is only one construction
            # to keep in sync with the JS side.
            join = LineCurveJoin(
                node=_point2(points[index]),
                line_far=_point2(out_far),
                curve_near=_point2(in_handles[0]),
                curve_far=_point2(in_handles[1]),
                curve_end=_point2(in_far),
                setback=0.0,
            )
            setback = default_setback(join)
            result = derive_line_curve_transition(join, setback=setback)
            if result.status == "ok" and result.transition is not None:
                derived = _derived_points_as_packed(result.transition)
                # The solver's run travels A - E - c1 - c2 - M - g1 - g2 - Q
                # - h1 - h2 - C (A = the line's far point = out_far, C = the
                # curve's far point = in_far). Reversed, that is the ORIGINAL
                # travel order: C - h2 - h1 - Q - g2 - g1 - M - c2 - c1 - E - A.
                # So the stored slice [C, hC, Y, P] is replaced by
                # [C, h2, h1, Q, g2, g1, M, c2, c1, E]; A stays untouched.
                reversed_run = list(reversed(derived))
                surgeries[index - 3] = ([points[index - 3]] + reversed_run, 4)
                diagnostics.append(
                    JoinDiagnostic(
                        contourIndex=contour_index,
                        pointIndex=index,
                        status="ok",
                        setback=setback,
                        attempts=result.attempts,
                        transition=result.transition,
                    )
                )
            else:
                diagnostics.append(
                    JoinDiagnostic(
                        contourIndex=contour_index,
                        pointIndex=index,
                        status=result.status,
                        reason=result.reason,
                        setback=setback,
                        attempts=result.attempts,
                        failure_reasons=dict(result.failure_reasons),
                    )
                )
            continue

        diagnostics.append(
            JoinDiagnostic(
                contourIndex=contour_index,
                pointIndex=index,
                status="refused",
                reason="not-a-line-to-curve-join",
            )
        )

    if not surgeries:
        return list(points), diagnostics

    rebuilt: list[_PackedPoint] = []
    index = 0
    count = len(points)
    while index < count:
        if index in surgeries:
            replacement, span = surgeries[index]
            rebuilt.extend(replacement)
            index += span
        else:
            rebuilt.append(points[index])
            index += 1
    return rebuilt, diagnostics


def derive_squircle_transitions(
    path: PackedPath,
) -> tuple[PackedPath, list[JoinDiagnostic]]:
    """Derive every line-to-curve squircle join in ``path``.

    Returns ``(derivedPath, diagnostics)``. The input path is never modified. A
    join that cannot be solved keeps the stored outline, so the result is always
    drawable -- never half a transition.
    """
    diagnostics: list[JoinDiagnostic] = []
    coordinates: list[float] = []
    point_types: list[PointType] = []
    point_attributes: list[Optional[dict]] = []
    contour_infos: list[ContourInfo] = []
    any_attributes = False

    for contour_index, (points, is_closed) in enumerate(_iter_packed_contours(path)):
        rebuilt, contour_diagnostics = _derive_contour(
            contour_index, points, is_closed
        )
        diagnostics.extend(contour_diagnostics)
        for point in rebuilt:
            coordinates.extend((point.x, point.y))
            point_types.append(point.pointType)
            point_attributes.append(point.attributes)
            any_attributes = any_attributes or bool(point.attributes)
        contour_infos.append(
            ContourInfo(endPoint=len(point_types) - 1, isClosed=is_closed)
        )

    derived_path = PackedPath(
        coordinates=coordinates,
        pointTypes=point_types,
        contourInfo=contour_infos,
        pointAttributes=point_attributes if any_attributes else None,
    )
    return derived_path, diagnostics


def path_has_line_curve_squircle(path: PackedPath) -> bool:
    """Cheap pre-check, so a path without any raindrop node costs nothing."""
    for points, _is_closed in _iter_packed_contours(path):
        for point in points:
            if point.pointType == PointType.ON_CURVE_SQUIRCLE:
                return True
    return False


def room_rule() -> dict:
    """The room rule, as data, so the truth table can pin it instead of leaving
    the other implementation to guess the thresholds.

    With ``room = |node - line_far|`` (the length of the straight run) and
    ``scale = |curve_near - node|`` (the curve's handle length at the node):

      default setback = SETBACK_CURVE_FACTOR * scale
      refuse with "no-room" when  setback >= MAX_SETBACK_ROOM_RATIO * room

    A setback that large would eat the whole straight run, leaving nothing for
    the transition to anchor on. A setback that is *small* is not a room problem:
    it simply fails to solve, and is refused as "no-solution".
    """
    return {
        "maxSetbackRoomRatio": MAX_SETBACK_ROOM_RATIO,
        "setbackCurveFactor": SETBACK_CURVE_FACTOR,
        "defaultSetbackRule": "setbackCurveFactor * |curve_near - node|",
        "roomRule": "refuse 'no-room' when setback >= maxSetbackRoomRatio * room",
    }


def _truth_table_cases() -> list[tuple[str, LineCurveJoin]]:
    """The shared truth-table fixtures (see ADR-0012's verification section)."""
    return [
        (
            "convex-quarter-arc",
            LineCurveJoin(
                node=(0.0, 0.0),
                line_far=(-400.0, 0.0),
                curve_near=(132.0, 0.0),
                curve_far=(268.0, 132.0),
                curve_end=(400.0, 268.0),
                setback=60.0,
            ),
        ),
        (
            "shallow-convex-arc",
            LineCurveJoin(
                node=(0.0, 0.0),
                line_far=(-500.0, 0.0),
                curve_near=(180.0, 0.0),
                curve_far=(320.0, 60.0),
                curve_end=(420.0, 140.0),
                setback=50.0,
            ),
        ),
        (
            "inflection-near-node",
            LineCurveJoin(
                node=(0.0, 0.0),
                line_far=(-400.0, 0.0),
                curve_near=(150.0, 0.0),
                curve_far=(260.0, 80.0),
                curve_end=(400.0, 200.0),
                setback=60.0,
            ),
        ),
        (
            "tiny-setback",
            LineCurveJoin(
                node=(0.0, 0.0),
                line_far=(-400.0, 0.0),
                curve_near=(132.0, 0.0),
                curve_far=(268.0, 132.0),
                curve_end=(400.0, 268.0),
                setback=3.0,
            ),
        ),
        (
            "setback-exceeds-room",
            LineCurveJoin(
                node=(0.0, 0.0),
                line_far=(-50.0, 0.0),
                curve_near=(132.0, 0.0),
                curve_far=(268.0, 132.0),
                curve_end=(400.0, 268.0),
                setback=60.0,
            ),
        ),
        (
            # DISCRIMINATING room-rule case. setback/room = 0.95, which sits
            # INSIDE the (0.05, 1.0] band a "setback >= room" rule would accept,
            # but this implementation refuses it at the room check. A peer
            # implementation using a looser threshold therefore gets a different
            # status AND a different reason here.
            "room-rule-setback-095-of-room",
            LineCurveJoin(
                node=(0.0, 0.0),
                line_far=(-100.0, 0.0),
                curve_near=(132.0, 0.0),
                curve_far=(268.0, 132.0),
                curve_end=(400.0, 268.0),
                setback=95.0,
            ),
        ),
    ]


def _path_case_fixtures() -> list[tuple[str, list[dict], bool]]:
    """Path-level fixtures: a contour, its closedness, and what to expect.

    Both orientations of the same join are covered on purpose. They must produce
    the SAME transition (same E, M, Q) -- the mirrored case is just that run
    traversed the other way round, so its derived contour is the exact reverse of
    the canonical one.
    """
    canonical = [
        {"x": -400.0, "y": 0.0, "pointType": 0},
        {"x": 0.0, "y": 0.0, "pointType": int(PointType.ON_CURVE_SQUIRCLE)},
        {"x": 132.0, "y": 0.0, "pointType": int(PointType.OFF_CURVE_CUBIC)},
        {"x": 268.0, "y": 132.0, "pointType": int(PointType.OFF_CURVE_CUBIC)},
        {"x": 400.0, "y": 268.0, "pointType": 0},
    ]
    mirrored = list(reversed(canonical))
    curveToCurve = [
        {"x": -400.0, "y": 0.0, "pointType": 0},
        {"x": -200.0, "y": 120.0, "pointType": int(PointType.OFF_CURVE_CUBIC)},
        {"x": -60.0, "y": 0.0, "pointType": int(PointType.OFF_CURVE_CUBIC)},
        {"x": 0.0, "y": 0.0, "pointType": int(PointType.ON_CURVE_SQUIRCLE)},
        {"x": 60.0, "y": 0.0, "pointType": int(PointType.OFF_CURVE_CUBIC)},
        {"x": 200.0, "y": 120.0, "pointType": int(PointType.OFF_CURVE_CUBIC)},
        {"x": 400.0, "y": 0.0, "pointType": 0},
    ]
    shortLine = [
        {"x": -20.0, "y": 0.0, "pointType": 0},
        {"x": 0.0, "y": 0.0, "pointType": int(PointType.ON_CURVE_SQUIRCLE)},
        {"x": 132.0, "y": 0.0, "pointType": int(PointType.OFF_CURVE_CUBIC)},
        {"x": 268.0, "y": 132.0, "pointType": int(PointType.OFF_CURVE_CUBIC)},
        {"x": 400.0, "y": 268.0, "pointType": 0},
    ]
    # What smoothing a rectangle corner produces next door: a right-angle
    # line<->curve join whose near handle lies ON the chord. The main search
    # grid steps over its narrow convergence basin; the rescue sweep derives it.
    rectRaindrop = [
        {"x": 150.0, "y": 600.0, "pointType": int(PointType.ON_CURVE_SQUIRCLE)},
        {"x": 350.0, "y": 600.0, "pointType": int(PointType.OFF_CURVE_CUBIC)},
        {"x": 609.0, "y": 741.0, "pointType": int(PointType.OFF_CURVE_CUBIC)},
        {"x": 750.0, "y": 600.0, "pointType": int(PointType.ON_CURVE_SMOOTH)},
        {"x": 844.0, "y": 506.0, "pointType": int(PointType.OFF_CURVE_CUBIC)},
        {"x": 750.0, "y": 333.0, "pointType": int(PointType.OFF_CURVE_CUBIC)},
        {"x": 750.0, "y": 200.0, "pointType": 0},
        {"x": 150.0, "y": 200.0, "pointType": 0},
    ]
    return [
        ("path-convex-quarter-arc", canonical, True),
        ("path-convex-quarter-arc-mirrored", mirrored, True),
        ("path-convex-quarter-arc-open", canonical, False),
        ("path-curve-to-curve", curveToCurve, True),
        ("path-no-room", shortLine, True),
        ("path-right-angle-corner-raindrop", rectRaindrop, True),
    ]


def path_from_points(points: list[dict], is_closed: bool) -> PackedPath:
    unpacked = []
    for point in points:
        entry: dict = {"x": point["x"], "y": point["y"]}
        if point["pointType"] & 0x07:
            entry["type"] = "cubic"
        if point["pointType"] == int(PointType.ON_CURVE_SMOOTH):
            entry["smooth"] = True
        if point["pointType"] == int(PointType.ON_CURVE_SQUIRCLE):
            entry["squircle"] = True
        unpacked.append(entry)
    return PackedPath.fromUnpackedContours(
        [{"points": unpacked, "isClosed": is_closed}]
    )


def derived_contour(path: PackedPath) -> list[dict]:
    return [
        {"x": path.coordinates[i * 2], "y": path.coordinates[i * 2 + 1],
         "pointType": int(path.pointTypes[i])}
        for i in range(len(path.pointTypes))
    ]


def main() -> None:  # pragma: no cover - regeneration entry point
    import json
    import pathlib

    roomRule = room_rule()
    cases = []
    for name, join in _truth_table_cases():
        result = derive_line_curve_transition(join, setback=join.setback)
        expected: dict = (
            {"status": "ok", **result.transition.as_vector_dict(), "roomRule": roomRule}
            if result.status == "ok" and result.transition is not None
            else {
                "status": "refused",
                "reason": result.reason,
                "attempts": result.attempts,
                "failureReasons": result.failure_reasons,
                "roomRule": roomRule,
            }
        )
        cases.append(
            {
                "name": name,
                "input": {
                    "node": list(join.node),
                    "lineFar": list(join.line_far),
                    "curve": {
                        "near": list(join.curve_near),
                        "far": list(join.curve_far),
                        "end": list(join.curve_end),
                    },
                    "setback": join.setback,
                    "room": math.dist(join.node, join.line_far),
                    "scale": math.dist(join.curve_near, join.node),
                },
                "expected": expected,
            }
        )
        summary = (
            f"q={expected['q']:.2f} mFrac={expected['mFrac']:.2f}"
            f" s={expected['s']:.4f} v={expected['v']:.4f}"
            if expected["status"] == "ok"
            else f"{expected.get('reason')} ({expected.get('attempts')} attempts)"
        )
        print(f"{name}: {expected['status']} {summary}")

    pathCases = []
    for name, points, is_closed in _path_case_fixtures():
        path = path_from_points(points, is_closed)
        derived, diagnostics = derive_squircle_transitions(path)
        if diagnostics and diagnostics[0].status == "ok":
            expected = {
                "status": "ok",
                "pointIndex": diagnostics[0].pointIndex,
                "setback": diagnostics[0].setback,
                "attempts": diagnostics[0].attempts,
                "contour": derived_contour(derived),
                "roomRule": roomRule,
            }
            transition = diagnostics[0].transition
            print(
                f"{name}: ok point={diagnostics[0].pointIndex}"
                f" setback={diagnostics[0].setback:.3f}"
                f" E=({transition.E[0]:.3f},{transition.E[1]:.3f})"
                f" M=({transition.M[0]:.3f},{transition.M[1]:.3f})"
                f" Q=({transition.Q[0]:.3f},{transition.Q[1]:.3f})"
            )
        else:
            expected = {
                "status": "refused",
                "reason": diagnostics[0].reason if diagnostics else "no-squircle-node",
                "contour": derived_contour(derived),
                "roomRule": roomRule,
            }
            print(
                f"{name}: refused {expected['reason']}"
            )
        pathCases.append(
            {
                "name": name,
                "input": {"contour": points, "isClosed": is_closed},
                "expected": expected,
            }
        )

    target = (
        pathlib.Path(__file__).resolve().parents[3]
        / "test-common"
        / "squircle-line-curve-vectors.json"
    )
    target.write_text(
        json.dumps({"roomRule": roomRule, "cases": cases, "pathCases": pathCases}, indent=2)
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {target}")


if __name__ == "__main__":  # pragma: no cover
    main()
