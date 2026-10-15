"""Fact-check: does the PYTHON reference derive the probe's real geometry?"""
import sys
sys.path.insert(0, r"E:\engram-dev\EngramFont\src")

from fontra.core.squircle_transition import (
    LineCurveJoin,
    default_setback,
    derive_line_curve_transition,
)

# canonical: straight run in at P, curve [P, Y, hC, C] out (editor state after
# toggleSmooth on the rect corner (750,600))
join = LineCurveJoin(
    node=(150.0, 600.0),
    line_far=(150.0, 200.0),
    curve_near=(350.0, 600.0),
    curve_far=(609.0, 741.0),
    curve_end=(750.0, 600.0),
    setback=0.0,
)
setback = default_setback(join)
print(f"setback = {setback}")
result = derive_line_curve_transition(join, setback=setback)
print("canonical =>", result.status, getattr(result, "reason", ""))

# mirrored: the control-point-reversed curve (what the mirrored branch feeds)
join_m = LineCurveJoin(
    node=(150.0, 600.0),
    line_far=(150.0, 200.0),
    curve_near=(609.0, 741.0),
    curve_far=(350.0, 600.0),
    curve_end=(750.0, 600.0),
    setback=0.0,
)
setback_m = default_setback(join_m)
print(f"mirrored setback = {setback_m}")
result_m = derive_line_curve_transition(join_m, setback=setback_m)
print("mirrored  =>", result_m.status, getattr(result_m, "reason", ""))
