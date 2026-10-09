import { downloadBytes } from '@file-editor/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KEY_LIST_OFFSET } from '../sections/magicKeys/format.ts';
import { saveWithKeys } from '../sections/magicKeys/testUtils.ts';
import { App } from './App.tsx';

vi.mock('@file-editor/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@file-editor/core')>()),
  downloadBytes: vi.fn(),
}));

const STORY_1 = [0x01, 0xff, 0xff, 0x80];
const STORY_2 = [0x02, 0xff, 0xff, 0x80];
const RANDOM = [0x83, 0x01, 0x02, 0x10];

async function loadSave(bytes: Uint8Array, name = 'game.sav') {
  const user = userEvent.setup();
  render(<App />);
  await user.upload(
    screen.getByLabelText(/choose a save file/i),
    new File([bytes as Uint8Array<ArrayBuffer>], name),
  );
  return user;
}

describe('App', () => {
  beforeEach(() => {
    vi.mocked(downloadBytes).mockClear();
  });

  it('loads a save and shows its keys', async () => {
    await loadSave(saveWithKeys([STORY_1, RANDOM]));

    expect(screen.getByText('game.sav')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Magic keys' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem', { name: /^Key \d+$/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Download edited save' })).toBeDisabled();
  });

  it('reports files too short to be a save', async () => {
    await loadSave(new Uint8Array(100), 'tiny.sav');

    expect(screen.getByRole('alert')).toHaveTextContent(/Couldn't read “tiny.sav”/);
    expect(screen.getByLabelText(/choose a save file/i)).toBeInTheDocument();
  });

  it('downloads the edited save under the original name, changing only the key list', async () => {
    const original = saveWithKeys([STORY_1, STORY_2, RANDOM]);
    const user = await loadSave(original.slice());

    await user.click(screen.getByRole('button', { name: 'Remove key 1' }));
    await user.click(screen.getByRole('button', { name: 'Download edited save' }));

    expect(downloadBytes).toHaveBeenCalledTimes(1);
    const [output, fileName] = vi.mocked(downloadBytes).mock.calls[0]!;
    expect(fileName).toBe('game.sav');

    const expected = saveWithKeys([STORY_2, RANDOM]);
    expect(output).toEqual(expected);
    expect(output.slice(0, KEY_LIST_OFFSET)).toEqual(original.slice(0, KEY_LIST_OFFSET));
  });

  it('undoes all changes', async () => {
    const user = await loadSave(saveWithKeys([STORY_1, STORY_2]));
    const download = screen.getByRole('button', { name: 'Download edited save' });

    await user.click(screen.getByRole('button', { name: 'Remove key 1' }));
    expect(download).toBeEnabled();
    expect(screen.getAllByRole('listitem', { name: /^Key \d+$/ })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Undo all changes' }));
    expect(download).toBeDisabled();
    expect(screen.getAllByRole('listitem', { name: /^Key \d+$/ })).toHaveLength(2);
  });

  it('disables download again when edits cancel out', async () => {
    const user = await loadSave(saveWithKeys([STORY_1]));
    const completed = within(screen.getByRole('listitem', { name: 'Key 1' })).getByLabelText(
      'Completed',
    );

    await user.click(completed);
    expect(screen.getByRole('button', { name: 'Download edited save' })).toBeEnabled();
    await user.click(completed);
    expect(screen.getByRole('button', { name: 'Download edited save' })).toBeDisabled();
  });

  it('returns to the file picker', async () => {
    const user = await loadSave(saveWithKeys([STORY_1]));

    await user.click(screen.getByRole('button', { name: 'Open a different file' }));

    expect(screen.getByLabelText(/choose a save file/i)).toBeInTheDocument();
    expect(screen.queryByText('game.sav')).not.toBeInTheDocument();
  });
});
