import { KEY_LIST_OFFSET, KEY_LIST_SIZE, KEY_SLOT_COUNT } from './format.ts';
import type { KeySlot, MagicKeys } from './model.ts';

/** Builds a model from the given filled slots, padded with empties to 32 slots. */
export function modelOf(...slots: KeySlot[]): MagicKeys {
  return {
    slots: [
      ...slots,
      ...Array.from({ length: KEY_SLOT_COUNT - slots.length }, (): KeySlot => ({ kind: 'empty' })),
    ],
  };
}

/**
 * A synthetic 32 KiB save: filler bytes everywhere, an empty key list, then `entries`
 * written from the start of the list.
 */
export function saveWithKeys(entries: number[][]): Uint8Array {
  const bytes = new Uint8Array(0x8000).map((_, i) => i & 0xff);
  bytes.fill(0xff, KEY_LIST_OFFSET, KEY_LIST_OFFSET + KEY_LIST_SIZE);
  entries.forEach((entry, i) => bytes.set(entry, KEY_LIST_OFFSET + i * 4));
  return bytes;
}

export const story = (storyId: number, completed = false): KeySlot => ({
  kind: 'story',
  storyId,
  completed,
});

export const random = (
  serial: number,
  prefix = 0,
  suffix = 0,
  level = 1,
  completed = false,
): KeySlot => ({ kind: 'random', serial, prefix, suffix, level, completed });
