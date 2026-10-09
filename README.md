# DWM2 Save Editor

An in-browser save editor for Dragon Warrior Monsters 2. Load a save file, edit it, and download the
edited copy. The file never leaves your browser.

Currently editable:

- **Magic keys**: add, remove, and edit story and random keys, toggle completion, or apply presets.

## How it works

1. The uploaded save is parsed into one model per section (e.g. the magic key list).
2. Edits change a _proposed_ copy of each model; the original stays untouched.
3. On download, every section writes its proposed model into a copy of the file. That copy is diffed
   against the original to build an IPS patch, the patch is applied to the original, and the result is
   checked against the edited copy before it's downloaded under the original filename.

Data the editor doesn't recognize is preserved byte-for-byte.

## Development

Requires Node 22+ (developed on Node 24, Windows). All scripts are cross-platform.

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm test           # unit + component tests (Vitest)
npm run check      # typecheck, lint, format check, tests (what CI runs)
npm run build      # production build in apps/dwm2-save-editor/dist
npm run preview    # serve the production build locally
```

`npm run test:watch` re-runs tests on change; `npm run format` applies Prettier.

## Layout

```
packages/core/            Game-agnostic pieces, reusable for other save/ROM editors:
                          IPS create/apply, byte diffing, file I/O, the Section interface,
                          the export pipeline, and a FileDropZone component.
apps/dwm2-save-editor/    The DWM2 app.
  src/app/                App shell, state reducer, section registry.
  src/sections/magicKeys/ Magic key format, edit operations, presets, names, and UI.
docs/PLAN.md              Design notes and open items.
```

### Adding a section

1. Implement `Section<TModel>` (`parse` / `serialize`) from `@file-editor/core`. `serialize(parse(bytes))`
   must reproduce the original bytes exactly.
2. Pair it with an editor component as an `EditorSection` (`@file-editor/core/react`).
3. Register it in `apps/dwm2-save-editor/src/app/sections.ts`. State, rendering, and export pick it up.

## Deployment

Pushes to `main` run CI and deploy to GitHub Pages (`.github/workflows/ci.yml`). In the repository's
**Settings → Pages**, set **Source** to **GitHub Actions**. The build's base path comes from the
`BASE_PATH` environment variable (defaults to `/`).
