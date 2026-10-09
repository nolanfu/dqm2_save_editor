import type { EditorSection } from '@file-editor/core/react';
import { magicKeysEditorSection } from '../sections/magicKeys/editorSection.ts';

/**
 * Every editable section of the save, in display order. To add a section, implement an
 * EditorSection and list it here; state, rendering, and export pick it up automatically.
 */
export const SECTIONS = {
  magicKeys: magicKeysEditorSection,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each entry has its own model type
} satisfies Record<string, EditorSection<any>>;

export type SectionId = keyof typeof SECTIONS;
export type ModelOf<K extends SectionId> =
  (typeof SECTIONS)[K] extends EditorSection<infer M> ? M : never;
export type SectionModels = { [K in SectionId]: ModelOf<K> };

export const SECTION_IDS = Object.keys(SECTIONS) as SectionId[];
