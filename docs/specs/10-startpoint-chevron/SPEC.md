# R10 · Technical Specification (SPEC)

## Change Location

`src-js/views-editor/src/visualization-layer-definitions.js`
→ the `fontra.startpoint.indicator` layer (the only change point).

## Current State (Old Implementation)

```js
screenParameters: { radius: 9, strokeWidth: 2 }
colors: { color: "#989898A0" } / colorsDarkMode has the same value
draw:
  for each contour, take startPoint (the contour's 0th point)
  if the contour has a next point: angle = atan2(next - start)      // forward direction
  draw an arc of the given radius centered on startPoint, with the gap aligned to angle (± START_POINT_ARC_GAP_ANGLE)
  START_POINT_ARC_GAP_ANGLE = 0.25 * Math.PI
```

## New Implementation (chevron)

1. **Direction**: still take the forward direction `d = normalize(next - start)`, `angle = atan2(d.y, d.x)`;
   a contour with a single point has no direction and degrades to drawing nothing (the old implementation drew a full circle; the new one would either draw a small closed chevron with no orientation or skip — we choose **skip**, to keep the semantics clear).
2. **Shape**: draw a chevron polyline in local coordinates, then rotate by `angle` and translate to the start point:
   - Tip facing `+x` (i.e., the forward direction): `tip = (r, 0)`,
     `upper = (-r*cos(θ), -r*sin(θ))`, `lower = (-r*cos(θ), +r*sin(θ))`
     (θ = half the opening angle, ~50°, so the `>` angle reads clearly);
   - Connect `upper → tip → lower`, stroke only, no fill (same as the old arc; `strokeWidth` is reused).
   - **Left/right symmetry**: rotation is a rigid transform, so when the direction faces left it naturally renders as `<` (tip facing left, opening facing right) —
     not a mirror flip, matching the "greater-than / less-than" intuition.
3. **Rotation implementation**: `context.save()` → `translate(startPoint)` → `rotate(angle)` →
   draw the chevron with the tip facing +x → `restore()`. Avoids hand-computing rotated coordinates for every point.
4. **Parameters**: keep `screenParameters: { radius: 9, strokeWidth: 2 }` (`radius` now
   denotes the chevron's half-height/half-width scale); the colors and the light/dark pair stay unchanged.
5. **Unchanged**: `selectionFunc: glyphSelector("editing")` (editing state only), `zIndex: 500`,
   and the contour iteration / `startPointIndex` advancement logic.

## Constants

- Delete `START_POINT_ARC_GAP_ANGLE` (no longer needed);
- Add `START_POINT_CHEVRON_HALF_ANGLE` (≈ 50° = 0.28π), controlling the opening angle of `>`.

## Files Involved

`src-js/views-editor/src/visualization-layer-definitions.js` (single file)
