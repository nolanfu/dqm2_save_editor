import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bytesEqual } from '../bytes/index.ts';
import {
  IPS_EOF_OFFSET,
  IpsError,
  applyIps,
  createIps,
  parseIps,
  serializeIps,
  type IpsRecord,
} from './index.ts';

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const patchOf = (...body: number[]) =>
  new Uint8Array([...ascii('PATCH'), ...body, ...ascii('EOF')]);

describe('serializeIps / parseIps', () => {
  it('serializes an empty patch as header + footer', () => {
    expect(serializeIps([])).toEqual(new Uint8Array(ascii('PATCHEOF')));
  });

  it('serializes data and RLE records in the documented layout', () => {
    const records: IpsRecord[] = [
      { type: 'data', offset: 0x3c0a, data: new Uint8Array([0x01, 0xff]) },
      { type: 'rle', offset: 0x012345, count: 0x0102, value: 0xab },
    ];
    expect(serializeIps(records)).toEqual(
      patchOf(
        0x00,
        0x3c,
        0x0a,
        0x00,
        0x02,
        0x01,
        0xff,
        0x01,
        0x23,
        0x45,
        0x00,
        0x00,
        0x01,
        0x02,
        0xab,
      ),
    );
  });

  it('parses what it serializes', () => {
    const records: IpsRecord[] = [
      { type: 'data', offset: 0, data: new Uint8Array([1, 2, 3]) },
      { type: 'rle', offset: 0xffffff, count: 0xffff, value: 0 },
    ];
    expect(parseIps(serializeIps(records))).toEqual(records);
  });

  it.each([
    ['empty input', new Uint8Array()],
    ['wrong header', new Uint8Array(ascii('PATCX'))],
    ['missing EOF', new Uint8Array(ascii('PATCH'))],
    ['truncated size', new Uint8Array([...ascii('PATCH'), 0, 0, 1, 0])],
    ['truncated data', new Uint8Array([...ascii('PATCH'), 0, 0, 1, 0, 3, 9, 9])],
    ['truncated RLE', new Uint8Array([...ascii('PATCH'), 0, 0, 1, 0, 0, 0, 4])],
    ['zero-count RLE', patchOf(0, 0, 1, 0, 0, 0, 0, 7)],
    ['trailing bytes', new Uint8Array([...ascii('PATCHEOF'), 1])],
    ['truncation extension', new Uint8Array([...ascii('PATCHEOF'), 0, 0x10, 0])],
  ])('rejects a malformed patch: %s', (_name, patch) => {
    expect(() => parseIps(patch)).toThrow(IpsError);
  });

  it.each<[string, IpsRecord]>([
    ['offset at EOF marker', { type: 'data', offset: IPS_EOF_OFFSET, data: new Uint8Array([1]) }],
    ['offset too large', { type: 'data', offset: 0x1000000, data: new Uint8Array([1]) }],
    ['empty data', { type: 'data', offset: 0, data: new Uint8Array() }],
    ['oversized data', { type: 'data', offset: 0, data: new Uint8Array(0x10000) }],
    ['zero RLE count', { type: 'rle', offset: 0, count: 0, value: 1 }],
  ])('refuses to serialize an invalid record: %s', (_name, record) => {
    expect(() => serializeIps([record])).toThrow(IpsError);
  });
});

describe('applyIps', () => {
  it('applies data and RLE records without mutating the source', () => {
    const source = new Uint8Array(8);
    const patch = patchOf(0, 0, 1, 0, 2, 0xaa, 0xbb, 0, 0, 5, 0, 0, 0, 3, 0xcc);
    const result = applyIps(source, patch);
    expect(Array.from(result)).toEqual([0, 0xaa, 0xbb, 0, 0, 0xcc, 0xcc, 0xcc]);
    expect(source.every((b) => b === 0)).toBe(true);
  });

  it('extends the output when a record writes past the end', () => {
    const result = applyIps(new Uint8Array([1, 2]), patchOf(0, 0, 3, 0, 1, 9));
    expect(Array.from(result)).toEqual([1, 2, 0, 9]);
  });

  it('later records win when records overlap', () => {
    const patch = patchOf(0, 0, 0, 0, 2, 1, 1, 0, 0, 1, 0, 1, 2);
    expect(Array.from(applyIps(new Uint8Array(2), patch))).toEqual([1, 2]);
  });
});

describe('createIps', () => {
  it('produces an empty patch for identical inputs', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(parseIps(createIps(bytes, bytes.slice()))).toEqual([]);
  });

  it('emits one record per separated change', () => {
    const original = new Uint8Array(32);
    const modified = original.slice();
    modified[2] = 1;
    modified[20] = 2;
    expect(parseIps(createIps(original, modified))).toEqual([
      { type: 'data', offset: 2, data: new Uint8Array([1]) },
      { type: 'data', offset: 20, data: new Uint8Array([2]) },
    ]);
  });

  it('merges changes separated by tiny gaps', () => {
    const original = new Uint8Array(16);
    const modified = original.slice();
    modified[2] = 1;
    modified[5] = 2;
    expect(parseIps(createIps(original, modified))).toEqual([
      { type: 'data', offset: 2, data: new Uint8Array([1, 0, 0, 2]) },
    ]);
  });

  it('uses RLE for long repeated spans', () => {
    const original = new Uint8Array(100);
    const modified = original.slice();
    modified.fill(0xff, 10, 60);
    expect(parseIps(createIps(original, modified))).toEqual([
      { type: 'rle', offset: 10, count: 50, value: 0xff },
    ]);
  });

  it('splits runs longer than the record size limit', () => {
    const original = new Uint8Array(0x20000);
    const modified = original.map((_, i) => (i % 251) + 1);
    const records = parseIps(createIps(original, modified));
    expect(records.length).toBeGreaterThan(1);
    expect(bytesEqual(applyIps(original, createIps(original, modified)), modified)).toBe(true);
  });

  it('never starts a record at the EOF-marker offset', () => {
    const original = new Uint8Array(IPS_EOF_OFFSET + 16);
    const modified = original.slice();
    modified.fill(7, IPS_EOF_OFFSET, IPS_EOF_OFFSET + 16);
    const patch = createIps(original, modified);
    const records = parseIps(patch);
    expect(records.map((r) => r.offset)).not.toContain(IPS_EOF_OFFSET);
    expect(bytesEqual(applyIps(original, patch), modified)).toBe(true);
  });

  it('rejects buffers of different lengths', () => {
    expect(() => createIps(new Uint8Array(2), new Uint8Array(3))).toThrow(RangeError);
  });

  it('round-trips arbitrary edits', () => {
    const arbitraryPair = fc.uint8Array({ minLength: 1, maxLength: 600 }).chain((original) =>
      fc
        .array(
          fc.record({
            offset: fc.nat({ max: original.length - 1 }),
            length: fc.integer({ min: 1, max: 40 }),
            value: fc.oneof(fc.constant<number | null>(null), fc.nat({ max: 255 })),
          }),
          { maxLength: 12 },
        )
        .map((edits) => {
          const modified = original.slice();
          for (const { offset, length, value } of edits) {
            for (let i = offset; i < Math.min(offset + length, modified.length); i++) {
              modified[i] = value ?? (modified[i]! + i + 1) & 0xff;
            }
          }
          return [original, modified] as const;
        }),
    );

    fc.assert(
      fc.property(arbitraryPair, ([original, modified]) => {
        expect(applyIps(original, createIps(original, modified))).toEqual(modified);
      }),
    );
  });
});
