import { describe, expect, it } from 'vitest';
import type { KeySlot } from './model.ts';
import {
  addRandomKey,
  addStoryKey,
  freeSlotCount,
  nextRandomSerial,
  removeKey,
  setCompleted,
  setRandomFields,
  setStoryId,
  usedSlotCount,
} from './operations.ts';
import { modelOf, random, story } from './testUtils.ts';

const fullModel = () => modelOf(...Array.from({ length: 32 }, () => story(1)));

describe('slot counting', () => {
  it('counts up to the last filled slot', () => {
    expect(usedSlotCount(modelOf())).toBe(0);
    expect(usedSlotCount(modelOf(story(1), story(2)))).toBe(2);
    expect(freeSlotCount(modelOf(story(1), story(2)))).toBe(30);
  });

  it('counts gaps in a non-contiguous list as used', () => {
    expect(usedSlotCount(modelOf(story(1), { kind: 'empty' }, story(2)))).toBe(3);
  });
});

describe('nextRandomSerial', () => {
  it('starts at 0 when there are no random keys', () => {
    expect(nextRandomSerial(modelOf(story(1)))).toBe(0);
  });

  it('is one past the highest serial, regardless of order', () => {
    expect(nextRandomSerial(modelOf(random(5), random(9), random(2)))).toBe(10);
  });

  it('wraps after 0x3E', () => {
    expect(nextRandomSerial(modelOf(random(0x3e)))).toBe(0);
  });
});

describe('addStoryKey / addRandomKey', () => {
  it('appends after the last filled slot as not completed', () => {
    const result = addStoryKey(modelOf(story(1, true)), 5);
    expect(result.ok && result.model.slots.slice(0, 3)).toEqual([
      story(1, true),
      story(5),
      { kind: 'empty' },
    ]);
  });

  it('assigns the next serial to new random keys', () => {
    const result = addRandomKey(modelOf(random(7)), { prefix: 2, suffix: 3, level: 40 });
    expect(result.ok && result.model.slots[1]).toEqual(random(8, 2, 3, 40));
  });

  it('marks appended keys as having no origin, and sets the random flag', () => {
    const result = addRandomKey(modelOf(story(1)), { prefix: 0, suffix: 0, level: 1 });
    if (!result.ok) throw new Error(result.error);
    expect(result.model.origins.slice(0, 2)).toEqual([0, null]);
    expect(result.model.slots[1]).toMatchObject({ randomFlag: true });
  });

  it('allows duplicates', () => {
    const result = addStoryKey(modelOf(story(4)), 4);
    expect(result.ok).toBe(true);
  });

  it('fails without changing anything when the list is full', () => {
    const model = fullModel();
    expect(addStoryKey(model, 2)).toEqual({
      ok: false,
      error: expect.stringMatching(/1 key needs a slot, but only 0 are free/),
    });
    expect(addRandomKey(model, { prefix: 0, suffix: 0, level: 1 }).ok).toBe(false);
  });

  it('rejects out-of-range values', () => {
    expect(() => addStoryKey(modelOf(), 0)).toThrow(RangeError);
    expect(() => addStoryKey(modelOf(), 0x0d)).toThrow(RangeError);
    expect(() => addRandomKey(modelOf(), { prefix: 0x10, suffix: 0, level: 1 })).toThrow();
    expect(() => addRandomKey(modelOf(), { prefix: 0, suffix: 0x38, level: 1 })).toThrow();
    expect(() => addRandomKey(modelOf(), { prefix: 0, suffix: 0, level: 0 })).toThrow();
    expect(() => addRandomKey(modelOf(), { prefix: 0, suffix: 0, level: 100 })).toThrow();
  });
});

describe('removeKey', () => {
  it('packs later keys forward and keeps 32 slots', () => {
    const model = removeKey(modelOf(story(1), story(2), story(3)), 1);
    expect(model.slots).toHaveLength(32);
    expect(model.slots.slice(0, 3)).toEqual([story(1), story(3), { kind: 'empty' }]);
  });

  it('keeps track of where each key came from as later keys shift forward', () => {
    const model = removeKey(modelOf(story(1), story(2), story(3)), 0);
    expect(model.origins.slice(0, 3)).toEqual([1, 2, 3]);
    expect(model.origins).toHaveLength(32);
    expect(model.origins[31]).toBeNull();
  });

  it('can remove unknown entries', () => {
    const unknown: KeySlot = { kind: 'unknown', raw: [1, 2, 3, 4] };
    expect(removeKey(modelOf(unknown, story(1)), 0).slots[0]).toEqual(story(1));
  });

  it('does not mutate the input model', () => {
    const model = modelOf(story(1), story(2));
    removeKey(model, 0);
    expect(model.slots[0]).toEqual(story(1));
  });
});

describe('field edits', () => {
  it('changes a story key id, keeping completion', () => {
    expect(setStoryId(modelOf(story(1, true)), 0, 9).slots[0]).toEqual(story(9, true));
  });

  it('changes random key fields, keeping the serial', () => {
    const model = setRandomFields(modelOf(random(4, 1, 1, 1)), 0, { suffix: 0x37, level: 99 });
    expect(model.slots[0]).toEqual(random(4, 1, 0x37, 99));
  });

  it('allows editing a loaded key whose level is 0 without touching the level', () => {
    const model = setRandomFields(modelOf(random(0, 0, 0, 0)), 0, { prefix: 5 });
    expect(model.slots[0]).toEqual(random(0, 5, 0, 0));
  });

  it('toggles completion on story and random keys', () => {
    const model = modelOf(story(1), random(0));
    expect(setCompleted(model, 0, true).slots[0]).toEqual(story(1, true));
    expect(setCompleted(model, 1, true).slots[1]).toEqual(random(0, 0, 0, 1, true));
  });

  it('refuses edits that do not fit the slot kind', () => {
    const model = modelOf(story(1), random(0), { kind: 'unknown', raw: [1, 2, 3, 4] });
    expect(() => setRandomFields(model, 0, { prefix: 1 })).toThrow(TypeError);
    expect(() => setStoryId(model, 1, 2)).toThrow(TypeError);
    expect(() => setCompleted(model, 2, true)).toThrow(TypeError);
    expect(() => setCompleted(model, 3, true)).toThrow(TypeError);
    expect(() => setStoryId(model, 32, 1)).toThrow(RangeError);
  });
});
