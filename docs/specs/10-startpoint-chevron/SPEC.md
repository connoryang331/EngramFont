# R10 · 技术规范（SPEC）

## 落点

`src-js/views-editor/src/visualization-layer-definitions.js`
→ `fontra.startpoint.indicator` 图层（唯一改动点）。

## 现状（旧实现）

```js
screenParameters: { radius: 9, strokeWidth: 2 }
colors: { color: "#989898A0" } / colorsDarkMode 同值
draw:
  对每个轮廓取 startPoint（轮廓第 0 点）
  若轮廓有下一个点：angle = atan2(next - start)      // 前进方向
  以 startPoint 为圆心画圆弧 radius，缺口对准 angle（± START_POINT_ARC_GAP_ANGLE）
  START_POINT_ARC_GAP_ANGLE = 0.25 * Math.PI
```

## 新实现（chevron）

1. **方向**：仍取前进方向 `d = normalize(next - start)`，`angle = atan2(d.y, d.x)`；
   轮廓只有一个点时无方向，退化为不画（旧实现画整圆，新实现画一个不朝向的
   闭合小箭头或跳过——取**跳过**，保持语义清晰）。
2. **形状**：在局部坐标画尖角折线（chevron），再按 `angle` 旋转、平移到起始点：
   - 顶点朝 `+x`（即前进方向）：`tip = (r, 0)`，
     `upper = (-r*cos(θ), -r*sin(θ))`、`lower = (-r*cos(θ), +r*sin(θ))`
     （θ = 半个张角，取 ~50°，使 `>` 的夹角清晰）；
   - 连线 `upper → tip → lower`，只描边不填充（与旧圆弧一致，`strokeWidth` 沿用）。
   - **左右对称性**：旋转是刚体变换，方向朝左时自然呈 `<`（顶点朝左、开口朝右），
     不是镜像翻转，符合"大于号/小于号"的直觉。
3. **旋转实现**：`context.save()` → `translate(startPoint)` → `rotate(angle)` →
   画顶点朝 +x 的 chevron → `restore()`。避免手算每点旋转坐标。
4. **参数**：`screenParameters: { radius: 9, strokeWidth: 2 }` 沿用（`radius` 现在
   表示 chevron 的半高/半宽尺度）；颜色与亮暗两套沿用不变。
5. **不变**：`selectionFunc: glyphSelector("editing")`（仅编辑态）、`zIndex: 500`、
   轮廓遍历与 `startPointIndex` 推进逻辑不变。

## 常量

- 删除 `START_POINT_ARC_GAP_ANGLE`（不再需要）；
- 新增 `START_POINT_CHEVRON_HALF_ANGLE`（≈ 50° = 0.28π），控制 `>` 的张角。

## 涉及文件

`src-js/views-editor/src/visualization-layer-definitions.js`（单文件）
