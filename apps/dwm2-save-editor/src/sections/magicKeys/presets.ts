import type { KeySlot, MagicKeys } from './model.ts';
import { appendSlots } from './operations.ts';
import { storyKeyName } from './names.ts';

export type PresetResult =
  { ok: true; model: MagicKeys; message: string } | { ok: false; error: string };

export interface Preset {
  id: string;
  label: string;
  description: string;
  apply(model: MagicKeys): PresetResult;
}

// TODO: fill in the story key ids that count as post-game.
export const POST_GAME_STORY_KEY_IDS: readonly number[] = [];

/**
 * Builds a preset that adds each listed story key that isn't already present (as not
 * completed), in list order. All or nothing: if they don't all fit, nothing changes.
 */
export function makeAddStoryKeysPreset(
  id: string,
  label: string,
  description: string,
  storyIds: readonly number[],
): Preset {
  return {
    id,
    label,
    description,
    apply(model) {
      const present = new Set(
        model.slots.flatMap((slot) => (slot.kind === 'story' ? [slot.storyId] : [])),
      );
      const missing = [...new Set(storyIds)].filter((storyId) => !present.has(storyId));
      if (missing.length === 0) {
        return { ok: true, model, message: 'All of these keys are already in the list.' };
      }

      const added = missing.map((storyId): KeySlot => ({
        kind: 'story',
        storyId,
        completed: false,
      }));
      const result = appendSlots(model, added);
      if (!result.ok) return result;
      return {
        ok: true,
        model: result.model,
        message: `Added ${missing.length} ${missing.length === 1 ? 'key' : 'keys'}: ${missing
          .map(storyKeyName)
          .join(', ')}.`,
      };
    },
  };
}

export const PRESETS: readonly Preset[] = [
  makeAddStoryKeysPreset(
    'post-game-keys',
    'Unlock all post-game keys',
    'Adds any missing post-game story keys, not completed.',
    POST_GAME_STORY_KEY_IDS,
  ),
];
