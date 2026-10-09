import { describe, expect, it } from 'vitest';
import { PREFIX_IDS, SUFFIX_IDS, prefixName, suffixName } from './names.ts';

describe('key names', () => {
  it('names prefixes and suffixes from the game tables', () => {
    expect(prefixName(0x00)).toBe('Ylw');
    expect(prefixName(0x0f)).toBe('Last');
    expect(suffixName(0x00)).toBe('Slime');
    expect(suffixName(0x37)).toBe('Star');
  });

  it('falls back to a hex label for unnamed ids', () => {
    expect(suffixName(0x38)).toBe('Suffix 0x38');
  });

  it('covers the full editable ranges', () => {
    expect(PREFIX_IDS).toHaveLength(16);
    expect(SUFFIX_IDS).toHaveLength(0x39);
  });
});
