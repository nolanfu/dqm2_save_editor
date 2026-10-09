import { assertRange, type Section } from '@file-editor/core';
import {
  KEY_ENTRY_SIZE,
  KEY_LIST_OFFSET,
  KEY_LIST_SIZE,
  KEY_SLOT_COUNT,
  decodeEntry,
  encodeEntry,
} from './format.ts';
import type { KeySlot, MagicKeys } from './model.ts';

export const magicKeysSection: Section<MagicKeys> = {
  id: 'magic-keys',
  title: 'Magic keys',

  parse(bytes) {
    assertRange(bytes, KEY_LIST_OFFSET, KEY_LIST_SIZE, 'Magic key list');
    const slots: KeySlot[] = [];
    for (let i = 0; i < KEY_SLOT_COUNT; i++) {
      const at = KEY_LIST_OFFSET + i * KEY_ENTRY_SIZE;
      slots.push(decodeEntry([bytes[at]!, bytes[at + 1]!, bytes[at + 2]!, bytes[at + 3]!]));
    }
    return { slots };
  },

  serialize(model, target) {
    assertRange(target, KEY_LIST_OFFSET, KEY_LIST_SIZE, 'Magic key list');
    if (model.slots.length !== KEY_SLOT_COUNT) {
      throw new RangeError(`Expected ${KEY_SLOT_COUNT} key slots, got ${model.slots.length}`);
    }
    model.slots.forEach((slot, i) => {
      target.set(encodeEntry(slot), KEY_LIST_OFFSET + i * KEY_ENTRY_SIZE);
    });
  },
};
