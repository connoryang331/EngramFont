# R7 · 技术规范（SPEC）

## 1. 现有机制（全部复用，只改交互编排）
| 能力 | 位置 |
|---|---|
| 锁定状态 | `sceneSettings.backgroundImagesAreLocked`（scene-controller.js:613 监听）|
| 锁定时强制取消选中 | scene-controller.js:505-513（`_deselectBackgroundImage`）|
| 全局 toggle action | scene-controller.js:702-705（`action.lock-background-images`，动态标签 :1076）|
| 选中背景图 | `sceneSettings.selection = ["backgroundImage/0"]`（:513）|
| 控制面板 | panel-selection-info.js:340-370（Opacity 滑块/Colorize/Transformation）|
| 背景图数据 | putBackgroundImage 远程方法（fonthandler.py:169）|

## 2. 行为改造（meshfont 式）
### 2.1 Edit image 上下文按钮（新增）
- 位置：编辑器顶部工具区（upload image 图标旁，meshfont 同位）
- 出现条件：当前字形存在 backgroundImage（`fontController` 字形数据检查）
- 点击：
  1. `backgroundImagesAreLocked = false`
  2. `sceneSettings.selection = ["backgroundImage/0"]`
  3. selection-info 面板自动出现 Opacity/Colorize/Transformation + [新增] Replace 按钮

### 2.2 自动锁定（新增）
- 触发：selection 从 `backgroundImage/0` 变为其它（或点击画布空白）
- 实现：sceneSettings selection 监听（scene-controller.js 已有 selection 监听框架）——
  离开背景图选中态时 `backgroundImagesAreLocked = true`
- meshfont 行为对齐：无全局开关，锁定是上下文退出的一部分

### 2.3 移除全局 Unlock/Lock 菜单项
- scene-controller.js:702-705 的 `action.lock-background-images` 注册删除
- :1076 的动态菜单项删除
- （保留 backgroundImagesAreLocked 状态字段本身——上下文逻辑复用）

### 2.4 Replace 按钮（维持 R7 原设计）
- 选中态 selection-info 加 Replace 按钮：file input → 读新图字节 →
  `putBackgroundImage(新图)` 保留 transformation/opacity/colorize → 画布即时更新

## 3. 文件清单
| 文件 | 操作 |
|---|---|
| `src-js/views-editor/src/scene-controller.js` | 修改（自动锁定监听 + 移除全局菜单 action） |
| `src-js/views-editor/src/editor.js` | 修改（Edit image 按钮 + Replace 按钮） |
| `src-js/views-editor/src/panel-selection-info.js` | 修改（Replace 按钮） |

## 4. 边界
| 场景 | 行为 |
|---|---|
| 字形无背景图 | Edit image 按钮不出现 |
| proof 模式 | 图片编辑不可用（只读显示） |
| 编辑中切换字形 | 自动锁定 + 选中清空 |
