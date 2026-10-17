# R7 · Technical Specification (SPEC)

## 1. Existing Mechanisms (all reused; only the interaction orchestration changes)
| Capability | Location |
|---|---|
| Lock state | `sceneSettings.backgroundImagesAreLocked` (listened at scene-controller.js:613) |
| Forced deselect when locked | scene-controller.js:505-513 (`_deselectBackgroundImage`) |
| Global toggle action | scene-controller.js:702-705 (`action.lock-background-images`, dynamic label at :1076) |
| Select background image | `sceneSettings.selection = ["backgroundImage/0"]` (:513) |
| Control panel | panel-selection-info.js:340-370 (Opacity slider / Colorize / Transformation) |
| Background image data | putBackgroundImage remote method (fonthandler.py:169) |

## 2. Behavior Changes (meshfont-style)
### 2.1 Edit image context button (new)
- Location: top toolbar area of the editor (next to the upload image icon, same position as meshfont)
- Appearance condition: the current glyph has a backgroundImage (checked via `fontController` glyph data)
- On click:
  1. `backgroundImagesAreLocked = false`
  2. `sceneSettings.selection = ["backgroundImage/0"]`
  3. The selection-info panel automatically shows Opacity/Colorize/Transformation + [new] Replace button

### 2.2 Auto-lock (new)
- Trigger: selection changes from `backgroundImage/0` to something else (or clicking empty canvas)
- Implementation: listen to sceneSettings selection (scene-controller.js already has a selection-listening framework) —
  when leaving the background image selection state, set `backgroundImagesAreLocked = true`
- meshfont behavior alignment: no global switch; locking is part of exiting the context

### 2.3 Remove the global Unlock/Lock menu item
- Delete the `action.lock-background-images` registration at scene-controller.js:702-705
- Delete the dynamic menu item at :1076
- (Keep the backgroundImagesAreLocked state field itself — reused by the context logic)

### 2.4 Replace button (keeps the original R7 design)
- Add a Replace button to selection-info in the selected state: file input → read new image bytes →
  `putBackgroundImage(new image)` preserving transformation/opacity/colorize → canvas updates immediately

## 3. File List
| File | Operation |
|---|---|
| `src-js/views-editor/src/scene-controller.js` | Modify (auto-lock listener + remove global menu action) |
| `src-js/views-editor/src/editor.js` | Modify (Edit image button + Replace button) |
| `src-js/views-editor/src/panel-selection-info.js` | Modify (Replace button) |

## 4. Edge Cases
| Scenario | Behavior |
|---|---|
| Glyph has no background image | The Edit image button does not appear |
| Proof mode | Image editing unavailable (read-only display) |
| Switching glyphs while editing | Auto-lock + selection cleared |
