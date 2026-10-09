import { describe, expect, it } from 'vitest';
import { assertRange, bytesEqual, formatBytes, toHex } from './index.ts';

describe('bytes helpers', () => {
  it('compares buffers', () => {
    expect(bytesEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(bytesEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
    expect(bytesEqual(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(false);
  });

  it('formats hex', () => {
    expect(toHex(0xa)).toBe('0A');
    expect(toHex(0x3c0a, 4)).toBe('3C0A');
    expect(formatBytes([0xff, 0x01, 0x80])).toBe('FF 01 80');
  });

  it('checks ranges', () => {
    const data = new Uint8Array(4);
    expect(() => assertRange(data, 0, 4)).not.toThrow();
    expect(() => assertRange(data, 1, 4)).toThrow(RangeError);
  });
});
