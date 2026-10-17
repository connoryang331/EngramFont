# Comparison Verification Environment (must-read for next-session execution)

> This document lets any new session set up and use the "EngramFont vs meshfont" comparison verification environment without depending on prior conversations.

## 1. meshfont Reference Clone (behavior baseline)
- Path: `E:\visee-template\meshfont-clone`
- Start: `cd E:\visee-template\meshfont-clone && node serve.mjs` → **http://127.0.0.1:8124/app**
  (or double-click `start.bat` in that directory; `node start.mjs` also works and avoids port conflicts automatically)
- Key pages / behavior baseline:
  - Editor: /app → welcome dialog → pick Inter → Start → editor
  - **proof mode**: type `lovely` in the text input → press the `proof` key on the keyboard → proofing view (dropdown with 5 presets)
  - **edit key**: the blue `edit` key at the keyboard's bottom right → back to edit mode
  - Ligature baseline: type `ton` (1 glyph) / `lovely` (2 glyphs) / `advanced` (see below)
- Full reverse-engineering archive: `NOTES.md` in the same directory (tech stack / wiring / pitfalls) + `RECON/` (screenshots/fixtures)

## 2. EngramFont and Asset Inventory
| Asset | Path |
|---|---|
| EngramFont repo (fork) | `E:\engram-dev\EngramFont` (branch engramfont-main) |
| EngramFont startup | `start-EngramFont.bat` → **http://127.0.0.1:8800** (creates Untitled.fontra automatically) |
| venv (with fontTools) | `E:\engram-dev\EngramFont\venv` (verify: `venv\Scripts\python -c "import fontTools"`) |
| Test project | `E:\engram-dev\fontra-test-fonts\Untitled.fontra` (contains ton/dance/vance/lovely connected glyphs + FEA) |
| Build artifact | `MicroTon.ttf` in the same directory (= demo-liga/MicroTon.ttf) |
| Ligature scripts | `E:\engram-dev\engram-builder\demo-liga\` (add-*-liga.py / compile-bridge.py / verify-liga.mjs / shape-to-plane.mjs / glyph-order.json / glyph-paths.json) |
| Comparison screenshot archive | `E:\visee-template\meshfont-clone\RECON\` (engram-plane-*.png etc.) |

## 3. Port Table
| Service | Port | Start |
|---|---|---|
| EngramFont server | 8800 | start-EngramFont.bat (or `venv\Scripts\fontra --http-port 8800 filesystem <font directory>`) |
| meshfont clone | 8124 | `node serve.mjs` in the meshfont-clone directory |

## 4. Comparison Verification Procedure (each requirement's TEST.md references this section)
1. Start both ends (EngramFont first, then meshfont; **you must stop the 8800 service before modifying Untitled.fontra** — concurrent writes stomp each other,
   and force-killing the process loses glyphs not yet flushed to disk: the user's hand-drawn A glyph was lost this way once)
2. Open 8800/editor and 8124/app side by side
3. Follow the cases in `05-proof-edit-mode/TEST.md` and `03-keyboard-dock/TEST.md` to compare against meshfont's behavior item by item
4. Machine-verify ligature/export assertions with the demo-liga scripts (verify-liga.mjs / compile-bridge.py)

## 5. Known State Snapshot (at the end of the 2026-10-11 session)
- Untitled.fontra glyphs: a,ad,ance,c,d,dance,e,ed,l,l_o_v_e,l_y,n,o,space,t,t_on,v,vance,y
  (the user's hand-drawn A is lost; y exists)
- FEA rules: t_on/ad/dance/vance/l_o_v_e/l_y ligatures + `sub [ance dance vance] d' by ed;`
- Behavior verified in MicroTon.ttf GSUB: ton=1, lovely=2, advanced=3, danced=2 glyphs
- EngramFont branding/rename/docs: engramfont-main branch (GitHub connoryang331/EngramFont, private)
