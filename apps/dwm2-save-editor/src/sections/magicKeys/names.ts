import { toHex } from '@file-editor/core';
import { PREFIX_MAX, STORY_ID_MAX, STORY_ID_MIN, SUFFIX_MAX } from './format.ts';

// Missing entries fall back to a hex label.
// TODO: story key names.
const STORY_KEY_NAMES: Partial<Record<number, string>> = {};

const PREFIX_NAMES: Partial<Record<number, string>> = {
  0x00: 'Ylw',
  0x01: 'Plain',
  0x02: 'Green',
  0x03: 'Blue',
  0x04: 'First',
  0x05: 'Red',
  0x06: 'White',
  0x07: 'Quiet',
  0x08: 'Black',
  0x09: 'Gaudy',
  0x0a: 'Silvr',
  0x0b: 'Dream',
  0x0c: 'Misty',
  0x0d: 'Secrt',
  0x0e: 'Shiny',
  0x0f: 'Last',
};

// 0x38 is within the valid range but has no known name (unverified whether it occurs).
const SUFFIX_NAMES: Partial<Record<number, string>> = {
  0x00: 'Slime',
  0x01: 'Draco',
  0x02: 'Beast',
  0x03: 'Bird',
  0x04: 'Tree',
  0x05: 'Bug',
  0x06: 'Devil',
  0x07: 'Death',
  0x08: 'Thing',
  0x09: 'Water',
  0x0a: 'Lord',
  0x0b: 'Cave',
  0x0c: 'Isle',
  0x0d: 'Torch',
  0x0e: 'Gardn',
  0x0f: 'Pit',
  0x10: 'Bsmt',
  0x11: 'Jail',
  0x12: 'Magma',
  0x13: 'Sea',
  0x14: 'Field',
  0x15: 'Tower',
  0x16: 'Mine',
  0x17: 'Hill',
  0x18: 'Cstle',
  0x19: 'Mound',
  0x1a: 'Desrt',
  0x1b: 'Lake',
  0x1c: 'Jungl',
  0x1d: 'Haven',
  0x1e: 'Grass',
  0x1f: 'Forst',
  0x20: 'Grave',
  0x21: 'Crag',
  0x22: 'Shore',
  0x23: 'Log',
  0x24: 'Sky',
  0x25: 'Mtn',
  0x26: 'View',
  0x27: 'Cliff',
  0x28: 'Islet',
  0x29: 'Land',
  0x2a: 'Grove',
  0x2b: 'Swamp',
  0x2c: 'Manor',
  0x2d: 'Depth',
  0x2e: 'Hole',
  0x2f: 'Tomb',
  0x30: 'Soil',
  0x31: 'Pond',
  0x32: 'Hell',
  0x33: 'Moon',
  0x34: 'Ocean',
  0x35: 'Gulch',
  0x36: 'River',
  0x37: 'Star',
};

export function storyKeyName(id: number): string {
  return STORY_KEY_NAMES[id] ?? `Story key 0x${toHex(id)}`;
}

export function prefixName(id: number): string {
  return PREFIX_NAMES[id] ?? `Prefix 0x${toHex(id)}`;
}

export function suffixName(id: number): string {
  return SUFFIX_NAMES[id] ?? `Suffix 0x${toHex(id)}`;
}

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

export const STORY_KEY_IDS = range(STORY_ID_MIN, STORY_ID_MAX);
export const PREFIX_IDS = range(0, PREFIX_MAX);
export const SUFFIX_IDS = range(0, SUFFIX_MAX);
