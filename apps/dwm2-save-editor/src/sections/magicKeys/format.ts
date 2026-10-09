import type { KeySlot, RawEntry } from './model.ts';

export const KEY_LIST_OFFSET = 0x3c0a;
export const KEY_SLOT_COUNT = 32;
export const KEY_ENTRY_SIZE = 4;
export const KEY_LIST_SIZE = KEY_SLOT_COUNT * KEY_ENTRY_SIZE;

export const EMPTY_BYTE = 0xff;
export const RANDOM_FLAG = 0x80;
export const COMPLETED_FLAG = 0x40;
/** Byte 3 value for story keys. */
export const STORY_LEVEL_BYTE = 0x80;

export const STORY_ID_MIN = 0x01;
export const STORY_ID_MAX = 0x0c;
export const SERIAL_MAX = 0x3e;
export const PREFIX_MAX = 0x0f;
export const SUFFIX_MAX = 0x37;
/** Highest valid level byte. Files may contain 0, but new or edited keys use 1–99. */
export const LEVEL_MAX = 0x63;
export const LEVEL_MIN_EDITABLE = 0x01;

const SERIAL_MASK = 0x3f;

export function decodeEntry(raw: RawEntry): KeySlot {
  const [type, prefix, suffix, level] = raw;

  if (raw.every((b) => b === EMPTY_BYTE)) return { kind: 'empty' };

  const completed = (type & COMPLETED_FLAG) !== 0;
  const id = type & SERIAL_MASK;

  const randomFlag = (type & RANDOM_FLAG) !== 0;

  if (
    !randomFlag &&
    id >= STORY_ID_MIN &&
    id <= STORY_ID_MAX &&
    prefix === EMPTY_BYTE &&
    suffix === EMPTY_BYTE &&
    level === STORY_LEVEL_BYTE
  ) {
    return { kind: 'story', storyId: id, completed };
  }

  // Random keys are recognized by bytes 1–3. Byte 0 usually has the random flag, but real saves
  // also contain random keys with byte 0 = 0x00, so the flag is recorded rather than required.
  if (id <= SERIAL_MAX && prefix <= PREFIX_MAX && suffix <= SUFFIX_MAX && level <= LEVEL_MAX) {
    return { kind: 'random', serial: id, prefix, suffix, level, completed, randomFlag };
  }

  return { kind: 'unknown', raw: [...raw] };
}

export function encodeEntry(slot: KeySlot): RawEntry {
  switch (slot.kind) {
    case 'empty':
      return [EMPTY_BYTE, EMPTY_BYTE, EMPTY_BYTE, EMPTY_BYTE];
    case 'story':
      return [
        slot.storyId | (slot.completed ? COMPLETED_FLAG : 0),
        EMPTY_BYTE,
        EMPTY_BYTE,
        STORY_LEVEL_BYTE,
      ];
    case 'random':
      return [
        (slot.randomFlag ? RANDOM_FLAG : 0) | (slot.completed ? COMPLETED_FLAG : 0) | slot.serial,
        slot.prefix,
        slot.suffix,
        slot.level,
      ];
    case 'unknown':
      return slot.raw;
  }
}
