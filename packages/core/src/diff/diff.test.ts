import { describe, expect, it } from 'vitest';
import { findChangedRuns } from './index.ts';

const bytes = (...values: number[]) => new Uint8Array(values);

describe('findChangedRuns', () => {
  it('returns nothing for identical buffers', () => {
    expect(findChangedRuns(bytes(1, 2, 3), bytes(1, 2, 3))).toEqual([]);
  });

  it('finds separate runs, including at both ends', () => {
    expect(findChangedRuns(bytes(0, 0, 0, 0, 0, 0), bytes(1, 1, 0, 0, 0, 1))).toEqual([
      { offset: 0, length: 2 },
      { offset: 5, length: 1 },
    ]);
  });

  it('merges runs whose gap is within mergeGap', () => {
    const a = bytes(0, 0, 0, 0, 0, 0, 0);
    const b = bytes(1, 0, 0, 1, 0, 0, 0);
    expect(findChangedRuns(a, b, { mergeGap: 2 })).toEqual([{ offset: 0, length: 4 }]);
    expect(findChangedRuns(a, b, { mergeGap: 1 })).toEqual([
      { offset: 0, length: 1 },
      { offset: 3, length: 1 },
    ]);
  });

  it('rejects buffers of different lengths', () => {
    expect(() => findChangedRuns(bytes(1), bytes(1, 2))).toThrow(RangeError);
  });
});
