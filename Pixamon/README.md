# Pikixamon WebGPU Prototype

A browser-based Pikixamon-inspired game prototype using WebGPU.

## What is included

- `index.html` - main game page
- `style.css` - UI and canvas layout
- `main.js` - WebGPU renderer, voxel world, and creature battle logic

## Controls

- `WASD` = move
- `Arrow Left/Right` = rotate
- `Arrow Up/Down` = change camera pitch
- `B` = start battle when near a creature
- `P` = place/remove a stone block at the player position

## Run locally

WebGPU requires a secure context. Run a local static server and open the game in a supported browser.

Example using Python:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Browser support

Use a browser with WebGPU support such as Chrome Canary or Edge Canary with WebGPU enabled.
