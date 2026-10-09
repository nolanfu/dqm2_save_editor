import { describe, expect, it } from 'vitest';
import { slotChange, summarizeChanges } from './changes.ts';
import { addStoryKey, removeKey, setCompleted, setRandomFields } from './operations.ts';
import { modelOf, random, story } from './testUtils.ts';

const original = modelOf(story(1), random(0, 2, 3, 10), story(2));

function added(model: typeof original, storyId: number) {
  const result = addStoryKey(model, storyId);
  if (!result.ok) throw new Error(result.error);
  return result.model;
}

describe('slotChange', () => {
  it('reports nothing for an untouched model', () => {
    expect([0, 1, 2].map((i) => slotChange(original, original, i))).toEqual([
      'unchanged',
      'unchanged',
      'unchanged',
    ]);
  });

  it('marks edited keys', () => {
    const proposed = setRandomFields(original, 1, { level: 20 });
    expect(slotChange(original, proposed, 1)).toBe('edited');
    expect(slotChange(original, proposed, 0)).toBe('unchanged');
  });

  it('stops marking a key once it is edited back to its original value', () => {
    const proposed = setCompleted(setCompleted(original, 0, true), 0, false);
    expect(slotChange(original, proposed, 0)).toBe('unchanged');
  });

  it('marks added keys', () => {
    expect(slotChange(original, added(original, 5), 3)).toBe('added');
  });

  it('does not mark keys that only moved because an earlier key was removed', () => {
    const proposed = removeKey(original, 0);
    expect(slotChange(original, proposed, 0)).toBe('unchanged');
    expect(slotChange(original, proposed, 1)).toBe('unchanged');
  });
});

describe('summarizeChanges', () => {
  it('counts added, edited, and removed keys', () => {
    let proposed = removeKey(original, 0);
    proposed = setRandomFields(proposed, 0, { prefix: 9 });
    proposed = added(added(proposed, 7), 8);
    expect(summarizeChanges(original, proposed)).toEqual({ added: 2, edited: 1, removed: 1 });
  });

  it('counts nothing for an untouched model', () => {
    expect(summarizeChanges(original, original)).toEqual({ added: 0, edited: 0, removed: 0 });
  });
});
