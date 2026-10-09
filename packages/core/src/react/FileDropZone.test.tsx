// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileDropZone } from './FileDropZone.tsx';

describe('FileDropZone', () => {
  it('reports a file chosen through the input', async () => {
    const onFile = vi.fn();
    render(<FileDropZone onFile={onFile}>Pick a save</FileDropZone>);
    const file = new File([new Uint8Array([1, 2])], 'game.sav');
    await userEvent.upload(screen.getByLabelText('Pick a save'), file);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('reports a dropped file', () => {
    const onFile = vi.fn();
    render(<FileDropZone onFile={onFile}>Pick a save</FileDropZone>);
    const file = new File([new Uint8Array([1])], 'game.sav');
    fireEvent.drop(screen.getByText('Pick a save'), { dataTransfer: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });
});
