import { describe, expect, it } from 'vitest';
import {
  PREFIX_IDS,
  SUFFIX_IDS,
  idLabel,
  prefixName,
  storyKeyLabel,
  storyKeyName,
  suffixName,
} from './names.ts';

describe('key names', () => {
  it('names prefixes and suffixes from the game tables', () => {
    expect(prefixName(0x00)).toBe('Ylw');
    expect(prefixName(0x0f)).toBe('Last');
    expect(suffixName(0x00)).toBe('Slime');
    expect(suffixName(0x37)).toBe('Star');
  });

  it('labels named ids with name and hex, unnamed ids with hex only', () => {
    expect(idLabel(prefixName(0x03), 0x03)).toBe('Blue (03)');
    expect(idLabel(suffixName(0x38), 0x38)).toBe('0x38');
    expect(idLabel(storyKeyName(0x06), 0x06)).toBe('0x06');
    expect(storyKeyLabel(0x0c)).toBe('story key 0x0C');
  });

  it('covers the full editable ranges', () => {
    expect(PREFIX_IDS).toHaveLength(16);
    expect(SUFFIX_IDS).toHaveLength(0x39);
  });
});
