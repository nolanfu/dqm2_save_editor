import { SECTIONS, SECTION_IDS, type SectionId, type SectionModels } from './sections.ts';

export interface LoadedFile {
  name: string;
  /** The uploaded file. Never mutated. */
  bytes: Uint8Array;
  /** Models as parsed from the file. */
  original: SectionModels;
  /** Models including the user's proposed changes. */
  proposed: SectionModels;
}

export interface AppState {
  file: LoadedFile | null;
  error: string | null;
}

export type AppAction =
  | { type: 'fileLoaded'; file: LoadedFile }
  | { type: 'loadFailed'; error: string }
  | { type: 'sectionChanged'; id: SectionId; model: SectionModels[SectionId] }
  | { type: 'resetChanges' }
  | { type: 'closeFile' };

export const initialState: AppState = { file: null, error: null };

/** Parses every section of an uploaded file. Throws if any section can't be read. */
export function loadFile(name: string, bytes: Uint8Array): LoadedFile {
  const original = Object.fromEntries(
    SECTION_IDS.map((id) => [id, SECTIONS[id].parse(bytes)]),
  ) as SectionModels;
  return { name, bytes, original, proposed: original };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'fileLoaded':
      return { file: action.file, error: null };
    case 'loadFailed':
      return { file: null, error: action.error };
    case 'sectionChanged':
      if (!state.file) return state;
      return {
        ...state,
        file: { ...state.file, proposed: { ...state.file.proposed, [action.id]: action.model } },
      };
    case 'resetChanges':
      if (!state.file) return state;
      return { ...state, file: { ...state.file, proposed: state.file.original } };
    case 'closeFile':
      return initialState;
  }
}
