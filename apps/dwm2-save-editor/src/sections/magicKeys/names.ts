import { toHex } from '@file-editor/core';
import { PREFIX_MAX, STORY_ID_MAX, STORY_ID_MIN, SUFFIX_MAX } from './format.ts';

// TODO: fill in from the game's data. Missing entries fall back to a hex label.
const STORY_KEY_NAMES: Partial<Record<number, string>> = {};
const PREFIX_NAMES: Partial<Record<number, string>> = {};
const SUFFIX_NAMES: Partial<Record<number, string>> = {};

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
