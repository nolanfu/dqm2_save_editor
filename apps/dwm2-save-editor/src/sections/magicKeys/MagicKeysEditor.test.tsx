import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MagicKeysEditor } from './MagicKeysEditor.tsx';
import type { KeySlot, MagicKeys } from './model.ts';
import { modelOf, random, story } from './testUtils.ts';

vi.mock('./presets.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./presets.ts')>();
  return {
    ...actual,
    PRESETS: [actual.makeAddStoryKeysPreset('test', 'Add test keys', 'Adds 1, 2, 3', [1, 2, 3])],
  };
});

/** Renders the editor with real state so edits show up, and exposes the latest model. */
function renderEditor(initial: MagicKeys) {
  const latest = { current: initial };
  function Harness() {
    const [model, setModel] = useState(initial);
    latest.current = model;
    return <MagicKeysEditor original={initial} model={model} onChange={setModel} />;
  }
  render(<Harness />);
  return latest;
}

const row = (n: number) => within(screen.getByRole('listitem', { name: `Key ${n}` }));
const slots = (model: { current: MagicKeys }) => model.current.slots.slice(0, 4);

describe('MagicKeysEditor', () => {
  it('lists the filled slots with their details', () => {
    const unknown: KeySlot = { kind: 'unknown', raw: [0x12, 0x34, 0x56, 0x78] };
    renderEditor(modelOf(story(2), random(5, 0x03, 0x37, 42, true), unknown));

    expect(screen.getByText('3 of 32 slots used')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem', { name: /^Key \d+$/ })).toHaveLength(3);
    expect(row(2).getByLabelText('Prefix')).toHaveDisplayValue('Blue (03)');
    expect(row(2).getByLabelText('Suffix')).toHaveDisplayValue('Star (37)');
    expect(row(2).getByLabelText('Level')).toHaveValue(42);
    expect(row(2).getByLabelText('Completed')).toBeChecked();
    expect(row(2).getByText('Serial 05')).toBeInTheDocument();
    expect(row(3).getByText('12 34 56 78')).toBeInTheDocument();
    expect(row(3).queryByLabelText('Completed')).not.toBeInTheDocument();
  });

  it('edits story and random key fields', async () => {
    const user = userEvent.setup();
    const model = renderEditor(modelOf(story(2), random(5)));

    await user.selectOptions(row(1).getByLabelText('Story key'), '7');
    await user.click(row(1).getByLabelText('Completed'));
    await user.selectOptions(row(2).getByLabelText('Prefix'), '15');
    await user.selectOptions(row(2).getByLabelText('Suffix'), '16');

    expect(slots(model)).toEqual([
      story(7, true),
      random(5, 15, 16, 1),
      { kind: 'empty' },
      { kind: 'empty' },
    ]);
  });

  it('only accepts valid levels', async () => {
    const user = userEvent.setup();
    const model = renderEditor(modelOf(random(0, 0, 0, 10)));
    const level = row(1).getByLabelText('Level');

    await user.clear(level);
    await user.type(level, '100');
    expect(level).toHaveAttribute('aria-invalid', 'true');
    expect(model.current.slots[0]).toEqual(random(0, 0, 0, 10));

    await user.clear(level);
    await user.type(level, '99');
    expect(level).toHaveAttribute('aria-invalid', 'false');
    expect(model.current.slots[0]).toEqual(random(0, 0, 0, 99));
  });

  it('removes a key and packs the list', async () => {
    const user = userEvent.setup();
    const model = renderEditor(modelOf(story(1), story(2), story(3)));

    await user.click(row(2).getByRole('button', { name: 'Remove key 2' }));

    expect(slots(model)).toEqual([story(1), story(3), { kind: 'empty' }, { kind: 'empty' }]);
    expect(screen.getByText('2 of 32 slots used')).toBeInTheDocument();
  });

  it('adds story and random keys at the end', async () => {
    const user = userEvent.setup();
    const model = renderEditor(modelOf(random(9)));
    const addStory = within(screen.getByRole('group', { name: 'Add a story key' }));
    const addRandom = within(screen.getByRole('group', { name: 'Add a random key' }));

    await user.selectOptions(addStory.getByLabelText('Story key'), '4');
    await user.click(addStory.getByRole('button', { name: 'Add story key' }));
    await user.selectOptions(addRandom.getByLabelText('Prefix'), '2');
    await user.clear(addRandom.getByLabelText('Level'));
    await user.type(addRandom.getByLabelText('Level'), '50');
    await user.click(addRandom.getByRole('button', { name: 'Add random key' }));

    expect(slots(model)).toEqual([random(9), story(4), random(10, 2, 0, 50), { kind: 'empty' }]);
  });

  it('disables adding when the list is full', () => {
    renderEditor(modelOf(...Array.from({ length: 32 }, () => story(1))));
    expect(screen.getByRole('button', { name: 'Add story key' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add random key' })).toBeDisabled();
  });

  it('applies a preset and reports what it added', async () => {
    const user = userEvent.setup();
    const model = renderEditor(modelOf(story(2)));

    await user.click(screen.getByRole('button', { name: 'Add test keys' }));

    expect(slots(model)).toEqual([story(2), story(1), story(3), { kind: 'empty' }]);
    expect(screen.getByRole('status')).toHaveTextContent('Added 2 keys');
  });

  it('shows an error and changes nothing when a preset does not fit', async () => {
    const user = userEvent.setup();
    const initial = modelOf(...Array.from({ length: 31 }, () => random(0)));
    const model = renderEditor(initial);

    await user.click(screen.getByRole('button', { name: 'Add test keys' }));

    expect(model.current).toBe(initial);
    expect(screen.getByRole('alert')).toHaveTextContent('No changes were made');
  });
});
