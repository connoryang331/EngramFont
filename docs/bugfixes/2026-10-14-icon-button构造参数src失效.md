---
Id: BUG-003
tags: [frontend, webcomponents]
Status: fixed
---

# BUG-003 · icon-button 构造参数 src 失效，请求 /undefined

日期：2026-10-14  状态：fixed

## 现象

设置页行级 reset 图标空白；控制台 9× `404 http://localhost:8800/undefined` +
9× `pageerror: t.removeAttribute is not a function`。

## 根因

`new IconButton("/tabler-icons/refresh.svg")`——`IconButton` 的构造函数把 src 写成
**attribute**（`this.setAttribute("src", src)`），但 `IconButton extends UnlitElement`
且声明了 `static properties = { src: {...} }`：`_setupProperties()` 在构造期给实例定义
了 `src` **property 访问器**（值存 `_propertyValues`），`render()` 读的是
`this.src`（property）——attribute 不回读，于是拿到 `undefined`。

下游连锁：`InlineSVG` 拿 `"undefined"` 去 fetch → 404 → `htmlToElement` 对 404
响应体取 `template.content.firstChild`（文本节点）→ `svgElement.removeAttribute`
不存在 → `TypeError`。

## 修复

按仓库既有惯例（`panel-transformation.js` 等同款）改为属性赋值：

```js
createDomElement("icon-button", { src: "/tabler-icons/refresh.svg", class, title, onclick })
```

## 验证

`qa/probe-404.mjs`：无 404、无 pageerror；图标渲染、hover 变亮
（`qa/v4-node-card-hover.png`）。

## 备注

**通用教训**：任何继承 `UnlitElement` 且声明了 `static properties` 的组件，构造参数
都会踩这个坑——一律走 `createDomElement` 属性赋值（已登记进 AGENTS.md 硬约束）。
