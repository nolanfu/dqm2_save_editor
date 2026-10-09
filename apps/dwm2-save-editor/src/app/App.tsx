import { buildPatchedFile, downloadBytes, readFileBytes, sectionWrite } from '@file-editor/core';
import { FileDropZone } from '@file-editor/core/react';
import { useMemo, useReducer, type ReactNode } from 'react';
import { SECTIONS, SECTION_IDS, type SectionId } from './sections.ts';
import { appReducer, initialState, loadFile, type LoadedFile } from './state.ts';

type ExportResult =
  { ok: true; output: Uint8Array; changed: boolean } | { ok: false; error: string };

function buildExport(file: LoadedFile): ExportResult {
  try {
    const writes = SECTION_IDS.map((id) => sectionWrite(SECTIONS[id], file.proposed[id]));
    const { output, changed } = buildPatchedFile(file.bytes, writes);
    return { ok: true, output, changed };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { file } = state;
  const exported = useMemo(() => (file ? buildExport(file) : null), [file]);

  async function handleFile(selected: File) {
    try {
      const bytes = await readFileBytes(selected);
      dispatch({ type: 'fileLoaded', file: loadFile(selected.name, bytes) });
    } catch (error) {
      dispatch({
        type: 'loadFailed',
        error: `Couldn't read “${selected.name}”: ${errorMessage(error)}`,
      });
    }
  }

  function renderSection<K extends SectionId>(id: K, loaded: LoadedFile): ReactNode {
    const { Editor, title } = SECTIONS[id];
    return (
      <section key={id} className="panel" aria-labelledby={`section-${id}`}>
        <h2 id={`section-${id}`}>{title}</h2>
        <Editor
          original={loaded.original[id]}
          model={loaded.proposed[id]}
          onChange={(model) => dispatch({ type: 'sectionChanged', id, model })}
        />
      </section>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>DWM2 Save Editor</h1>
        <p className="app__tagline">Your save file stays on this device; nothing is uploaded.</p>
      </header>

      <main className="app__main">
        {state.error && (
          <p className="notice notice--error" role="alert">
            {state.error}
          </p>
        )}

        {!file ? (
          <FileDropZone onFile={handleFile} accept=".sav,.srm,.sa1,.dsv,application/octet-stream">
            <strong>Choose a save file</strong>
            <span>or drop it here</span>
          </FileDropZone>
        ) : (
          <>
            <div className="toolbar panel">
              <span className="toolbar__file">
                Editing <strong>{file.name}</strong>
              </span>
              <span className="toolbar__actions">
                <button
                  type="button"
                  className="button button--quiet"
                  disabled={!exported?.ok || !exported.changed}
                  onClick={() => dispatch({ type: 'resetChanges' })}
                >
                  Undo all changes
                </button>
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => dispatch({ type: 'closeFile' })}
                >
                  Open a different file
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  disabled={!exported?.ok || !exported.changed}
                  onClick={() => exported?.ok && downloadBytes(exported.output, file.name)}
                >
                  Download edited save
                </button>
              </span>
            </div>
            {exported && !exported.ok && (
              <p className="notice notice--error" role="alert">
                {exported.error}
              </p>
            )}
            {SECTION_IDS.map((id) => renderSection(id, file))}
          </>
        )}
      </main>
    </div>
  );
}
