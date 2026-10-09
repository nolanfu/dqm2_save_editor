import { useState } from 'react';
import { LEVEL_MIN_EDITABLE } from '../format.ts';
import {
  PREFIX_IDS,
  STORY_KEY_IDS,
  SUFFIX_IDS,
  prefixName,
  storyKeyName,
  suffixName,
} from '../names.ts';
import type { RandomKeyFields } from '../operations.ts';
import { IdSelect } from './IdSelect.tsx';
import { LevelInput } from './LevelInput.tsx';

interface AddKeyControlsProps {
  disabled: boolean;
  onAddStory(storyId: number): void;
  onAddRandom(fields: RandomKeyFields): void;
}

export function AddKeyControls({ disabled, onAddStory, onAddRandom }: AddKeyControlsProps) {
  const [storyId, setStoryId] = useState(STORY_KEY_IDS[0]!);
  const [random, setRandom] = useState<RandomKeyFields>({
    prefix: 0,
    suffix: 0,
    level: LEVEL_MIN_EDITABLE,
  });

  return (
    <div className="add-keys">
      <fieldset className="add-keys__group" disabled={disabled}>
        <legend>Add a story key</legend>
        <IdSelect
          label="Story key"
          value={storyId}
          ids={STORY_KEY_IDS}
          nameOf={storyKeyName}
          onChange={setStoryId}
        />
        <button type="button" className="button" onClick={() => onAddStory(storyId)}>
          Add story key
        </button>
      </fieldset>

      <fieldset className="add-keys__group" disabled={disabled}>
        <legend>Add a random key</legend>
        <IdSelect
          label="Prefix"
          value={random.prefix}
          ids={PREFIX_IDS}
          nameOf={prefixName}
          onChange={(prefix) => setRandom({ ...random, prefix })}
        />
        <IdSelect
          label="Suffix"
          value={random.suffix}
          ids={SUFFIX_IDS}
          nameOf={suffixName}
          onChange={(suffix) => setRandom({ ...random, suffix })}
        />
        <LevelInput value={random.level} onChange={(level) => setRandom({ ...random, level })} />
        <button type="button" className="button" onClick={() => onAddRandom(random)}>
          Add random key
        </button>
      </fieldset>
    </div>
  );
}
