"""Feasibility exploration: is the rect raindrop truly infeasible, or is the
search grid just too coarse?

Scans a much finer (q, mFrac) grid with wider Newton guesses and a setback
ladder, using the reference implementation's own _try_solve, and reports the
best solution found plus the refusal-reason distribution.
"""

import sys
from collections import Counter

sys.path.insert(0, r"E:\engram-dev\EngramFont\src")

from fontra.core.squircle_transition import (
    INITIAL_GUESSES,
    M_FRACTIONS,
    Q_VALUES,
    LineCurveJoin,
    _norm,
    _sub,
    _try_solve,
    default_setback,
    derive_line_curve_transition,
)

join = LineCurveJoin(
    node=(150.0, 600.0),
    line_far=(150.0, 200.0),
    curve_near=(350.0, 600.0),
    curve_far=(609.0, 741.0),
    curve_end=(750.0, 600.0),
    setback=0.0,
)

baseline = derive_line_curve_transition(join, setback=default_setback(join))
print("baseline:", baseline.status, baseline.reason, "attempts:", baseline.attempts)
print("failure reasons:", baseline.failure_reasons)

fine_q = [round(0.05 + 0.025 * i, 10) for i in range(37)]  # 0.05..0.95
fine_m = [round(0.05 + 0.05 * i, 10) for i in range(19)]  # 0.05..0.95
wide_guesses = list(INITIAL_GUESSES) + [
    (s, v) for s in (0.3, 1.0, 3.0) for v in (0.3, 1.0, 3.0)
]

setbacks = [50.0, 75.0, 100.0, 130.0, 170.0]
best_overall = None
for setback in setbacks:
    reasons = Counter()
    best = None  # (score, q, m_frac, transition)
    found = 0
    for q in fine_q:
        for m in fine_m:
            for guess in wide_guesses:
                transition, reason = _try_solve(join, setback, q, m, guess)
                if transition is None:
                    reasons[reason] += 1
                    continue
                found += 1
                score = _norm(_sub(transition.M, join.node))
                if best is None or score < best[0]:
                    best = (score, q, m, transition)
    label = f"setback={setback:6.1f}"
    if best is None:
        print(f"{label}: NO solution  reasons={dict(reasons)}")
    else:
        score, q, m, t = best
        print(
            f"{label}: {found:5d} solutions, best score={score:8.3f} "
            f"q={q:.2f} mFrac={m:.2f} s={t.s:.4f} v={t.v:.4f} "
            f"E=({t.E[0]:.1f},{t.E[1]:.1f}) M=({t.M[0]:.1f},{t.M[1]:.1f}) "
            f"Q=({t.Q[0]:.1f},{t.Q[1]:.1f})"
        )
        if best_overall is None or score < best_overall[0]:
            best_overall = (score, setback, q, m, t)

if best_overall is not None:
    score, setback, q, m, t = best_overall
    print(
        f"\nBEST OVERALL: setback={setback} q={q} mFrac={m} score={score:.3f}"
    )
    print("derived points:")
    for p in t.derived_points():
        print("   ", p)
