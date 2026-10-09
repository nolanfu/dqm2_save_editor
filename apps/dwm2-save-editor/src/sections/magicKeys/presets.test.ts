import { describe, expect, it } from 'vitest';
import { makeAddStoryKeysPreset } from './presets.ts';
import { modelOf, random, story } from './testUtils.ts';

const preset = makeAddStoryKeysPreset('test', 'Test', 'Test preset', [3, 5, 7, 5]);

describe('add-story-keys preset', () => {
  it('adds only the missing keys, in list order, not completed', () => {
    const result = preset.apply(modelOf(story(5, true), random(0)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model.slots.slice(0, 5)).toEqual([
      story(5, true),
      random(0),
      story(3),
      story(7),
      { kind: 'empty' },
    ]);
    expect(result.message).toMatch(/Added 2 keys/);
  });

  it('changes nothing when every key is present', () => {
    const model = modelOf(story(3), story(5), story(7));
    const result = preset.apply(model);
    expect(result).toEqual({ ok: true, model, message: expect.stringMatching(/already/) });
  });

  it('is idempotent', () => {
    const once = preset.apply(modelOf());
    if (!once.ok) throw new Error('expected success');
    const twice = preset.apply(once.model);
    expect(twice.ok && twice.model).toEqual(once.model);
  });

  it('applies nothing when there is not room for every missing key', () => {
    const model = modelOf(...Array.from({ length: 31 }, () => story(1)));
    const result = preset.apply(model);
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/3 keys need a slot, but only 1 is free/),
    });
  });
});
