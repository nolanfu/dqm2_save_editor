import { describe, expect, it } from 'vitest';
import { KEY_LIST_OFFSET, KEY_LIST_SIZE } from './format.ts';
import { magicKeysSection } from './section.ts';
import { modelOf, random, saveWithKeys, story } from './testUtils.ts';

describe('magicKeysSection', () => {
  it('parses the key list at 0x3C0A', () => {
    const bytes = saveWithKeys([
      [0x01, 0xff, 0xff, 0x80],
      [0xc2, 0x03, 0x04, 0x05],
      [0x12, 0x34, 0x56, 0x78],
    ]);
    const model = magicKeysSection.parse(bytes);
    expect(model.slots).toHaveLength(32);
    expect(model.slots.slice(0, 4)).toEqual([
      story(1),
      random(2, 3, 4, 5, true),
      { kind: 'unknown', raw: [0x12, 0x34, 0x56, 0x78] },
      { kind: 'empty' },
    ]);
  });

  it('round-trips byte-for-byte, including non-contiguous lists', () => {
    const bytes = saveWithKeys([
      [0x01, 0xff, 0xff, 0x80],
      [0xff, 0xff, 0xff, 0xff],
      [0x82, 0, 0, 9],
    ]);
    const copy = bytes.slice();
    magicKeysSection.serialize(magicKeysSection.parse(bytes), copy);
    expect(copy).toEqual(bytes);
  });

  it('only writes inside the key list', () => {
    const bytes = saveWithKeys([]);
    const target = bytes.slice();
    magicKeysSection.serialize(modelOf(story(3), random(0, 1, 2, 3)), target);
    expect(target.slice(0, KEY_LIST_OFFSET)).toEqual(bytes.slice(0, KEY_LIST_OFFSET));
    expect(target.slice(KEY_LIST_OFFSET + KEY_LIST_SIZE)).toEqual(
      bytes.slice(KEY_LIST_OFFSET + KEY_LIST_SIZE),
    );
    expect(Array.from(target.slice(KEY_LIST_OFFSET, KEY_LIST_OFFSET + 8))).toEqual([
      0x03, 0xff, 0xff, 0x80, 0x80, 0x01, 0x02, 0x03,
    ]);
  });

  it('rejects files too short to hold the key list', () => {
    expect(() => magicKeysSection.parse(new Uint8Array(KEY_LIST_OFFSET + 10))).toThrow(RangeError);
  });
});
