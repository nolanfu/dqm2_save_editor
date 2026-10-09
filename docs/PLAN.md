# DWM2 Save Editor — Plan

Status: draft for review. Nothing scaffolded yet beyond `git init`.

## Goals

- Single-page app, runs entirely in the browser; the save file never leaves the client.
- Load a save → show current state → edit (manually or via presets) → export a new save.
- Export is built by diffing original vs. edited bytes into an IPS patch, then applying that patch to the original.
- v1 edits one section (magic keys); more sections are added to the same app later.
- The core (file I/O, IPS, section framework) is reusable by future apps for other games' saves or ROMs.
- Works on modern desktop and phone browsers. Hosted on GitHub Pages; also runnable locally.

## Tech stack

| Concern                | Choice                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| Language               | TypeScript (strict)                                                |
| UI                     | React                                                              |
| Build/dev server       | Vite                                                               |
| Repo layout            | npm workspaces (npm 11 / Node 24 already installed)                |
| Unit + component tests | Vitest + React Testing Library (jsdom)                             |
| Property tests         | fast-check (IPS round-trips, codec round-trips)                    |
| End-to-end tests       | Playwright (Chromium + mobile viewport) against `vite preview`     |
| Lint/format            | ESLint (flat config, typescript-eslint) + Prettier                 |
| CI/CD                  | GitHub Actions: lint, typecheck, test, e2e; deploy `main` to Pages |

Windows notes: npm scripts stay cross-platform (no `rm -rf`, no bash-only syntax). `.gitattributes` sets
`* text=auto eol=lf` and marks `*.sav`, `*.srm`, `*.ips`, `*.bin` as `binary` so fixtures are never
mangled by line-ending conversion.

## Repo layout

```
dwm2_editors/
  packages/
    core/                      # game-agnostic, reusable
      src/
        bytes/                 # byte helpers, equality, copy
        ips/                   # createIps, applyIps, parse/serialize
        diff/                  # changed-run detection between two buffers
        file/                  # readFileBytes(File), downloadBytes(bytes, name)
        sections/              # Section / FileDefinition interfaces, export pipeline
        react/                 # FileDropZone, DownloadButton, AppShell, error display
  apps/
    dwm2-save-editor/
      src/
        sections/
          magicKeys/
            format.ts          # offsets, constants, entry codec
            model.ts           # types
            operations.ts      # pure edit operations
            presets.ts         # preset definitions
            names.ts           # id → name tables
            MagicKeysSection.tsx + child components
        app/                   # app state (reducer), section registry, layout
      tests/
        fixtures/              # example save files + expected-state JSON
        e2e/                   # Playwright specs
  docs/
```

## Core architecture

### Section framework (in `core`)

```ts
interface Section<TModel> {
  id: string;
  title: string;
  parse(bytes: Uint8Array): TModel; // read from the original file
  serialize(model: TModel, target: Uint8Array): void; // write into a copy of the file
  Component: React.FC<{ model: TModel; original: TModel; onChange(next: TModel): void }>;
}

interface FileDefinition {
  name: string;
  sections: Section<unknown>[];
  detect?(bytes: Uint8Array): boolean; // unused in v1 (no magic-byte validation)
}
```

Rule every section must follow: **`serialize(parse(bytes))` must reproduce the original bytes exactly.**
Unedited data then never shows up in the patch, and fixture-based tests can check that for every section.

### App state

One `useReducer` at the app root:

```ts
{
  file: { name: string; bytes: Uint8Array } | null;   // original, never mutated
  sections: Record<SectionId, { original: Model; proposed: Model }>;
  error: string | null;
}
```

Keeping both `original` and `proposed` per section costs almost nothing, and it makes "dirty" indicators
and a future diff view straightforward. A reload clears all state, which is acceptable.

### Export pipeline (in `core`)

1. `modified = copy(original)`
2. For each section: `section.serialize(proposed, modified)`
3. `patch = createIps(original, modified)` — diff into changed runs, emit IPS records (RLE where it helps)
4. `output = applyIps(original, patch)`
5. Sanity check `output` equals `modified`; if not, show an error instead of downloading.
6. Download `output` with the same filename as the uploaded file.

### IPS implementation notes

- Format: `"PATCH"`, then records of `offset(3, BE) size(2, BE) data`, or RLE records `offset(3) 0x0000 count(2) value(1)`; ends with `"EOF"`.
- Limits: offsets < 16 MiB; record data ≤ 0xFFFF bytes (split longer runs).
- Edge case: a record starting at offset `0x454F46` reads as `"EOF"`. Start the record one byte earlier.
  This can't happen with these save files, but core should handle it for later ROM work.
- `applyIps` rejects a malformed patch (bad header, truncated record, missing EOF) with a typed error.
- The size-truncation extension is not supported in v1.

## Magic keys section

### Format

- List starts at `0x3C0A`. 32 entries × 4 bytes, ending at `0x3C89`.
- Byte 0: type + completion. `0xFF` = empty. `0x80` = random key; `0x40` = completed.
  - Story: `0x01–0x0C` (completed: `0x41–0x4C`).
  - Random: `0x80–0xBE` (completed: `0xC0–0xFE`). The low 6 bits are not well understood ("seed"/serial; they seem to increase with each generated key).
- Byte 1: prefix. `0xFF` for story/empty; `0x00–0x0F` for random.
- Byte 2: suffix. `0xFF` for story/empty; `0x00–0x38` for random.
- Byte 3: monster level. `0x80` for story; `0x01–0x63` expected for random (`0x00` is accepted on parse).
- Filled entries must be contiguous and in order, with empties at the end. Order matters.

### Model

The model stores all 32 slots so round-trips are exact even when a file breaks the contiguity rule:

```ts
type KeySlot =
  | { kind: 'empty' } // all four bytes 0xFF
  | { kind: 'story'; storyId: number; completed: boolean }
  | {
      kind: 'random';
      serial: number;
      prefix: number;
      suffix: number;
      level: number;
      completed: boolean;
    }
  | { kind: 'unknown'; raw: [number, number, number, number] }; // preserved verbatim

type MagicKeys = { slots: KeySlot[] /* length 32 */ };
```

Classification is strict: an entry that fails every known pattern becomes `unknown`. That includes partly-`0xFF`
entries and story keys whose bytes 1–3 aren't `FF FF 80`. Unknown entries are shown with their raw hex, are
written back exactly as read, and can be removed but not edited.

The codec is a pair of pure functions, `decodeEntry(bytes) → KeySlot` and `encodeEntry(slot) → bytes`, and
gets exhaustive unit tests at every range boundary.

### Operations (pure functions; each returns a new model or a typed error)

- `addStoryKey(model, storyId)` → writes to the first empty slot after the last filled one; error if the list is full.
- `addRandomKey(model, { prefix, suffix, level })` → same placement rules. `serial` = highest existing random
  serial + 1 (0 if there are no random keys; wraps from `0x3E` to `0x00`).
- `removeKey(model, index)` → removes the entry and packs later entries forward; empty slots go at the end.
- `setStoryId(model, index, storyId)`
- `setRandomFields(model, index, { prefix?, suffix?, level? })` → validates ranges.
- `setCompleted(model, index, completed)` → story and random keys.
- Duplicates are allowed. Story ↔ random conversion is not supported.

### Presets

```ts
interface Preset<TModel> {
  id: string;
  label: string;
  description: string;
  apply(model: TModel): { ok: true; model: TModel; summary: string } | { ok: false; error: string };
}
```

- **Unlock all post-game keys:** for each expected story ID that isn't already in the list, add it as not
  completed. If there isn't room for every missing key, apply nothing and report how many slots it needs
  vs. how many are free. If nothing is missing, report "already present" and change nothing.

### UI (v1)

- File picker (drag-and-drop on desktop, a normal file input on mobile).
- Key list in game order. Each row: index, type badge, name (or raw hex for unknown entries), completion,
  editable fields (story: a story-key dropdown; random: prefix/suffix dropdowns + a level input), remove button.
- An "Add story key" / "Add random key" control, disabled when the list is full.
- A preset button row; a result message for each preset.
- A "Download edited save" button, disabled when nothing has changed.
- Layout is responsive on a single column; the key list shows as cards on narrow screens.

## Testing strategy

- **core unit tests:** IPS create/apply (empty diff, single byte, adjacent runs, RLE, runs > 0xFFFF,
  the `0x454F46` edge case, malformed patches); fast-check property: `applyIps(a, createIps(a, b))` equals `b`
  for random `a`/`b` of equal length.
- **Codec tests:** each byte-range boundary; fast-check round-trip `encode(decode(x)) === x` for all 2³² entries
  (sampled).
- **Operation and preset tests:** add/remove/pack ordering, full-list errors, preset all-or-nothing, preset
  idempotence.
- **Fixture tests:** for each example save, check that the parsed model matches the expected JSON; that
  `serialize(parse(file))` equals the file (byte-exact); and that applying the preset gives the expected bytes
  (a golden file or a list of expected byte changes).
- **Component tests (RTL):** rendering, edits dispatching the correct operations, preset error display,
  download button enable/disable.
- **E2E (Playwright):** upload a fixture → apply the preset → edit a random key → download → read the
  downloaded bytes and compare to the expected output. Runs on desktop and mobile viewports.

## Deployment

- Vite `base` set for the Pages subpath (from the repo name); `npm run dev` / `npm run preview` for local use.
- GitHub Actions: `ci.yml` (lint, typecheck, unit, e2e) on PRs and pushes; `pages.yml` builds and deploys
  `apps/dwm2-save-editor` on `main`.
- No runtime external resources (no CDN fonts or scripts), so after the first load it works fully on a local
  network. A PWA/offline mode can come later.

## Milestones

1. **Scaffold:** workspaces, TS/ESLint/Prettier, Vitest, Playwright, `.gitattributes`, CI, an empty app
   deployed to Pages.
2. **Core:** bytes/diff/IPS/file helpers + section framework + export pipeline, fully unit-tested.
3. **Magic key format:** codec, model, operations, presets, name tables; fixture tests.
4. **UI:** loader, key list editor, presets, download; component tests.
5. **E2E + polish:** Playwright flows, mobile layout pass, error states, README.

## Open items

- ID → name tables: story keys (`0x01–0x0C`), prefixes (`0x00–0x0F`), suffixes (`0x00–0x38`).
- Story IDs that count as "post-game".
- Example save files (committed under `apps/dwm2-save-editor/tests/fixtures/`).
