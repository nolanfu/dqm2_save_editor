import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeEntry, encodeEntry } from './format.ts';
import type { RawEntry } from './model.ts';

describe('decodeEntry', () => {
  it('decodes an empty entry', () => {
    expect(decodeEntry([0xff, 0xff, 0xff, 0xff])).toEqual({ kind: 'empty' });
  });

  it.each([
    [[0x01, 0xff, 0xff, 0x80], 0x01, false],
    [[0x0c, 0xff, 0xff, 0x80], 0x0c, false],
    [[0x41, 0xff, 0xff, 0x80], 0x01, true],
    [[0x4c, 0xff, 0xff, 0x80], 0x0c, true],
  ] as const)('decodes story key %j', (raw, storyId, completed) => {
    expect(decodeEntry(raw)).toEqual({ kind: 'story', storyId, completed });
  });

  it.each([
    [
      [0x80, 0x00, 0x00, 0x00],
      { serial: 0x00, prefix: 0x00, suffix: 0x00, level: 0x00, completed: false },
    ],
    [
      [0xbe, 0x0f, 0x37, 0x63],
      { serial: 0x3e, prefix: 0x0f, suffix: 0x37, level: 0x63, completed: false },
    ],
    [
      [0xc5, 0x03, 0x10, 0x20],
      { serial: 0x05, prefix: 0x03, suffix: 0x10, level: 0x20, completed: true },
    ],
    [
      [0xfe, 0x00, 0x00, 0x01],
      { serial: 0x3e, prefix: 0x00, suffix: 0x00, level: 0x01, completed: true },
    ],
  ] as const)('decodes random key %j', (raw, fields) => {
    expect(decodeEntry(raw)).toEqual({ kind: 'random', ...fields, randomFlag: true });
  });

  it.each([
    [
      [0x00, 0x09, 0x1c, 0x28],
      { serial: 0x00, prefix: 0x09, suffix: 0x1c, level: 0x28, completed: false },
    ],
    [
      [0x45, 0x0e, 0x05, 0x63],
      { serial: 0x05, prefix: 0x0e, suffix: 0x05, level: 0x63, completed: true },
    ],
  ] as const)('decodes random key without the random flag %j', (raw, fields) => {
    expect(decodeEntry(raw)).toEqual({ kind: 'random', ...fields, randomFlag: false });
  });

  it.each([
    ['story id 0', [0x00, 0xff, 0xff, 0x80]],
    ['story id 0x0D', [0x0d, 0xff, 0xff, 0x80]],
    ['story with prefix', [0x01, 0x00, 0xff, 0x80]],
    ['story with suffix', [0x01, 0xff, 0x00, 0x80]],
    ['story with wrong level byte', [0x01, 0xff, 0xff, 0x05]],
    ['random serial 0x3F', [0xbf, 0x00, 0x00, 0x01]],
    ['completed random serial 0x3F', [0xff, 0x00, 0x00, 0x01]],
    ['random prefix 0x10', [0x80, 0x10, 0x00, 0x01]],
    ['random suffix 0x38', [0x80, 0x00, 0x38, 0x01]],
    ['flagless random suffix 0x38', [0x00, 0x00, 0x38, 0x01]],
    ['random level 0x64', [0x80, 0x00, 0x00, 0x64]],
    ['partly empty', [0xff, 0xff, 0xff, 0x80]],
  ] as const)('treats %s as unknown', (_name, raw) => {
    expect(decodeEntry(raw)).toEqual({ kind: 'unknown', raw });
  });
});

describe('encodeEntry', () => {
  it('round-trips every possible entry', () => {
    const byte = fc.integer({ min: 0, max: 255 });
    fc.assert(
      fc.property(fc.tuple(byte, byte, byte, byte), (raw: RawEntry) => {
        expect(encodeEntry(decodeEntry(raw))).toEqual(raw);
      }),
      { numRuns: 20_000 },
    );
  });

  it('round-trips the structured edge values exhaustively for byte 0', () => {
    for (let b0 = 0; b0 < 256; b0++) {
      for (const tail of [
        [0xff, 0xff, 0x80],
        [0x00, 0x00, 0x01],
        [0x0f, 0x37, 0x63],
        [0x0f, 0x38, 0x63],
        [0xff, 0xff, 0xff],
      ]) {
        const raw = [b0, ...tail] as unknown as RawEntry;
        expect(encodeEntry(decodeEntry(raw))).toEqual(raw);
      }
    }
  });
});
