import type { ComponentType } from 'react';
import type { Section } from '../sections/index.ts';

export { FileDropZone, type FileDropZoneProps } from './FileDropZone.tsx';

export interface SectionEditorProps<TModel> {
  /** The model as parsed from the uploaded file. */
  original: TModel;
  /** The current proposed model. */
  model: TModel;
  onChange(next: TModel): void;
}

/** A section plus the React component that edits it. */
export interface EditorSection<TModel> extends Section<TModel> {
  Editor: ComponentType<SectionEditorProps<TModel>>;
}
