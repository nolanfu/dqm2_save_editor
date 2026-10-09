import {
  KEY_SLOT_COUNT,
  LEVEL_MAX,
  LEVEL_MIN_EDITABLE,
  PREFIX_MAX,
  SERIAL_MAX,
  STORY_ID_MAX,
  STORY_ID_MIN,
  SUFFIX_MAX,
} from './format.ts';
import type { KeySlot, MagicKeys } from './model.ts';

export type OperationResult = { ok: true; model: MagicKeys } | { ok: false; error: string };

export interface RandomKeyFields {
  prefix: number;
  suffix: number;
  level: number;
}

const EMPTY: KeySlot = { kind: 'empty' };

/** Number of slots up to and including the last non-empty one. */
export function usedSlotCount(model: MagicKeys): number {
  for (let i = model.slots.length - 1; i >= 0; i--) {
    if (model.slots[i]!.kind !== 'empty') return i + 1;
  }
  return 0;
}

/** Slots available for new keys (after the last filled slot). */
export function freeSlotCount(model: MagicKeys): number {
  return KEY_SLOT_COUNT - usedSlotCount(model);
}

/** Serial for a new random key: one past the highest existing serial, wrapping after 0x3E. */
export function nextRandomSerial(model: MagicKeys): number {
  let highest = -1;
  for (const slot of model.slots) {
    if (slot.kind === 'random') highest = Math.max(highest, slot.serial);
  }
  return highest >= SERIAL_MAX ? 0 : highest + 1;
}

export function addStoryKey(model: MagicKeys, storyId: number): OperationResult {
  assertStoryId(storyId);
  return appendSlot(model, { kind: 'story', storyId, completed: false });
}

export function addRandomKey(model: MagicKeys, fields: RandomKeyFields): OperationResult {
  assertRandomFields(fields);
  return appendSlot(model, {
    kind: 'random',
    serial: nextRandomSerial(model),
    ...fields,
    completed: false,
  });
}

/** Removes the key at `index` and shifts later keys forward to keep the list packed. */
export function removeKey(model: MagicKeys, index: number): MagicKeys {
  assertIndex(model, index);
  const slots = model.slots.filter((_, i) => i !== index);
  slots.push(EMPTY);
  return { slots };
}

export function setStoryId(model: MagicKeys, index: number, storyId: number): MagicKeys {
  assertStoryId(storyId);
  return updateSlot(model, index, (slot) => {
    if (slot.kind !== 'story') throw new TypeError(`Slot ${index} is not a story key`);
    return { ...slot, storyId };
  });
}

export function setRandomFields(
  model: MagicKeys,
  index: number,
  fields: Partial<RandomKeyFields>,
): MagicKeys {
  // Only validate the fields being changed: a key loaded from the file may hold level 0, and
  // editing its prefix shouldn't fail because of that.
  assertRandomFields(fields);
  return updateSlot(model, index, (slot) => {
    if (slot.kind !== 'random') throw new TypeError(`Slot ${index} is not a random key`);
    return { ...slot, ...fields };
  });
}

export function setCompleted(model: MagicKeys, index: number, completed: boolean): MagicKeys {
  return updateSlot(model, index, (slot) => {
    if (slot.kind !== 'story' && slot.kind !== 'random') {
      throw new TypeError(`Slot ${index} has no completion flag`);
    }
    return { ...slot, completed };
  });
}

/** Appends keys after the last filled slot, all or nothing. */
export function appendSlots(model: MagicKeys, newSlots: readonly KeySlot[]): OperationResult {
  const used = usedSlotCount(model);
  const free = KEY_SLOT_COUNT - used;
  if (newSlots.length > free) {
    return {
      ok: false,
      error:
        `Not enough room in the key list: ${newSlots.length} ` +
        `${newSlots.length === 1 ? 'key needs' : 'keys need'} a slot, but only ${free} ` +
        `${free === 1 ? 'is' : 'are'} free. No changes were made.`,
    };
  }
  const slots = [...model.slots];
  slots.splice(used, newSlots.length, ...newSlots);
  return { ok: true, model: { slots } };
}

function appendSlot(model: MagicKeys, slot: KeySlot): OperationResult {
  return appendSlots(model, [slot]);
}

function updateSlot(
  model: MagicKeys,
  index: number,
  update: (slot: KeySlot) => KeySlot,
): MagicKeys {
  assertIndex(model, index);
  const slots = [...model.slots];
  slots[index] = update(slots[index]!);
  return { slots };
}

function assertIndex(model: MagicKeys, index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= model.slots.length) {
    throw new RangeError(`Key slot index ${index} is out of range`);
  }
}

function assertStoryId(storyId: number): void {
  assertInRange('Story key id', storyId, STORY_ID_MIN, STORY_ID_MAX);
}

function assertRandomFields({ prefix, suffix, level }: Partial<RandomKeyFields>): void {
  if (prefix !== undefined) assertInRange('Prefix', prefix, 0, PREFIX_MAX);
  if (suffix !== undefined) assertInRange('Suffix', suffix, 0, SUFFIX_MAX);
  if (level !== undefined) assertInRange('Level', level, LEVEL_MIN_EDITABLE, LEVEL_MAX);
}

function assertInRange(what: string, value: number, min: number, max: number): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${what} ${value} is outside ${min}–${max}`);
  }
}
