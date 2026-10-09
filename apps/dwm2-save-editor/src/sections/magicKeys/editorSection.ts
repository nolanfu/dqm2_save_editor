import type { EditorSection } from '@file-editor/core/react';
import { MagicKeysEditor } from './MagicKeysEditor.tsx';
import type { MagicKeys } from './model.ts';
import { magicKeysSection } from './section.ts';

export const magicKeysEditorSection: EditorSection<MagicKeys> = {
  ...magicKeysSection,
  Editor: MagicKeysEditor,
};
