import { useState, type DragEvent, type ChangeEvent, type ReactNode } from 'react';

export interface FileDropZoneProps {
  onFile(file: File): void;
  /** Passed to the input's `accept` attribute, e.g. ".sav,.srm". */
  accept?: string;
  children?: ReactNode;
}

/**
 * A file picker that also accepts drag-and-drop. The input is visually hidden but stays
 * keyboard- and screen-reader-accessible through the wrapping label.
 */
export function FileDropZone({ onFile, accept, children }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    // Allow re-selecting the same file later.
    event.target.value = '';
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <label
      className={dragging ? 'fe-dropzone fe-dropzone--active' : 'fe-dropzone'}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input type="file" accept={accept} onChange={handleChange} className="fe-visually-hidden" />
      {children ?? 'Choose a file or drop it here'}
    </label>
  );
}
