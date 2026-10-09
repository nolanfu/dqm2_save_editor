import { applyIps, buildPatchedFile, bytesEqual, sectionWrite } from '@file-editor/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  KEY_LIST_OFFSET,
  KEY_LIST_SIZE,
  encodeEntry,
} from '../../src/sections/magicKeys/format.ts';
import type { KeySlot, MagicKeys } from '../../src/sections/magicKeys/model.ts';
import { addRandomKey, removeKey } from '../../src/sections/magicKeys/operations.ts';
import { PRESETS } from '../../src/sections/magicKeys/presets.ts';
import { magicKeysSection } from '../../src/sections/magicKeys/section.ts';
import { modelOf, random, story } from '../../src/sections/magicKeys/testUtils.ts';

function loadFixture(name: string): Uint8Array {
  // Not `new URL(..., import.meta.url)`: Vite rewrites that pattern as an asset import.
  return new Uint8Array(readFileSync(join(import.meta.dirname, '..', 'fixtures', name)));
}

function exportWith(original: Uint8Array, model: MagicKeys) {
  return buildPatchedFile(original, [sectionWrite(magicKeysSection, model)]);
}

const unknown = (...raw: [number, number, number, number]): KeySlot => ({ kind: 'unknown', raw });
const postGamePreset = PRESETS.find((preset) => preset.id === 'post-game-keys')!;

describe('fixture: dwm2_ultimate_cobi_new.sav', () => {
  const original = loadFixture('dwm2_ultimate_cobi_new.sav');

  it('is a 32 KiB save', () => {
    expect(original.length).toBe(0x8000);
  });

  it('parses the expected key list', () => {
    expect(magicKeysSection.parse(original)).toEqual(
      modelOf(
        story(0x01),
        story(0x02, true),
        story(0x03, true),
        story(0x04, true),
        random(0x00, 0x09, 0x37, 0x20, true),
        story(0x05, true),
        // Byte 0 is 0x00: looks like a random key without the random flag. Not understood yet.
        unknown(0x00, 0x09, 0x1c, 0x28),
        random(0x01, 0x0b, 0x32, 0x2d, true),
        random(0x02, 0x0d, 0x07, 0x59, true),
        random(0x03, 0x0d, 0x02, 0x59, true),
        random(0x04, 0x0c, 0x00, 0x59, true),
        random(0x05, 0x0d, 0x0a, 0x59),
        story(0x06, true),
        story(0x07, true),
        random(0x06, 0x0f, 0x06, 0x63, true),
        random(0x07, 0x0f, 0x08, 0x63, true),
        random(0x08, 0x0f, 0x04, 0x63),
        random(0x09, 0x0b, 0x03, 0x63, true),
        random(0x0a, 0x0b, 0x01, 0x63, true),
        unknown(0x00, 0x0e, 0x05, 0x63),
        story(0x08),
        story(0x09),
        story(0x0a),
        story(0x0b),
        story(0x0c),
      ),
    );
  });

  it('round-trips byte-for-byte and exports unchanged when nothing is edited', () => {
    const model = magicKeysSection.parse(original);
    const copy = original.slice();
    magicKeysSection.serialize(model, copy);
    expect(bytesEqual(copy, original)).toBe(true);

    const result = exportWith(original, model);
    expect(result.changed).toBe(false);
    expect(bytesEqual(result.output, original)).toBe(true);
  });

  it('reports that the post-game keys are already present', () => {
    const model = magicKeysSection.parse(original);
    expect(postGamePreset.apply(model)).toEqual({
      ok: true,
      model,
      message: expect.stringMatching(/already/),
    });
  });

  it('re-adds removed post-game keys at the end and changes only the key list', () => {
    // Remove story keys 0x06 and 0x07 (slots 13 and 14), then apply the preset.
    const parsed = magicKeysSection.parse(original);
    const removed = removeKey(removeKey(parsed, 12), 12);
    const result = postGamePreset.apply(removed);
    if (!result.ok) throw new Error(result.error);

    const { output, patch, changed } = exportWith(original, result.model);
    expect(changed).toBe(true);
    expect(bytesEqual(applyIps(original, patch), output)).toBe(true);

    const listEnd = KEY_LIST_OFFSET + KEY_LIST_SIZE;
    expect(bytesEqual(output.slice(0, KEY_LIST_OFFSET), original.slice(0, KEY_LIST_OFFSET))).toBe(
      true,
    );
    expect(bytesEqual(output.slice(listEnd), original.slice(listEnd))).toBe(true);

    const originalEntries = parsed.slots.slice(0, 25).map(encodeEntry);
    const expectedEntries = [
      ...originalEntries.slice(0, 12),
      ...originalEntries.slice(14),
      [0x06, 0xff, 0xff, 0x80],
      [0x07, 0xff, 0xff, 0x80],
      ...Array.from({ length: 7 }, () => [0xff, 0xff, 0xff, 0xff]),
    ];
    expect(Array.from(output.slice(KEY_LIST_OFFSET, listEnd))).toEqual(expectedEntries.flat());
  });

  it('gives a new random key the next serial (0x0B)', () => {
    const result = addRandomKey(magicKeysSection.parse(original), {
      prefix: 0x01,
      suffix: 0x02,
      level: 0x10,
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.model.slots[25]).toEqual(random(0x0b, 0x01, 0x02, 0x10));

    const { output } = exportWith(original, result.model);
    expect(Array.from(output.slice(KEY_LIST_OFFSET + 25 * 4, KEY_LIST_OFFSET + 26 * 4))).toEqual([
      0x8b, 0x01, 0x02, 0x10,
    ]);
  });
});
