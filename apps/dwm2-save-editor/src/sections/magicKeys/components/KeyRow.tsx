import { formatBytes, toHex } from '@file-editor/core';
import type { KeySlot } from '../model.ts';
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

export interface KeyRowProps {
  index: number;
  slot: KeySlot;
  onStoryIdChange(storyId: number): void;
  onRandomChange(fields: Partial<RandomKeyFields>): void;
  onCompletedChange(completed: boolean): void;
  onRemove(): void;
}

const KIND_LABELS: Record<KeySlot['kind'], string> = {
  story: 'Story',
  random: 'Random',
  unknown: 'Unknown',
  empty: 'Empty',
};

export function KeyRow({
  index,
  slot,
  onStoryIdChange,
  onRandomChange,
  onCompletedChange,
  onRemove,
}: KeyRowProps) {
  const number = index + 1;
  return (
    <li className={`key-row key-row--${slot.kind}`} aria-label={`Key ${number}`}>
      <span className="key-row__index">#{number}</span>
      <span className={`badge badge--${slot.kind}`}>{KIND_LABELS[slot.kind]}</span>

      <span className="key-row__fields">
        {slot.kind === 'story' && (
          <IdSelect
            label="Story key"
            value={slot.storyId}
            ids={STORY_KEY_IDS}
            nameOf={storyKeyName}
            onChange={onStoryIdChange}
          />
        )}
        {slot.kind === 'random' && (
          <>
            <IdSelect
              label="Prefix"
              value={slot.prefix}
              ids={PREFIX_IDS}
              nameOf={prefixName}
              onChange={(prefix) => onRandomChange({ prefix })}
            />
            <IdSelect
              label="Suffix"
              value={slot.suffix}
              ids={SUFFIX_IDS}
              nameOf={suffixName}
              onChange={(suffix) => onRandomChange({ suffix })}
            />
            <LevelInput value={slot.level} onChange={(level) => onRandomChange({ level })} />
            <span className="key-row__meta" title="Low bits of the key's first byte">
              Serial {toHex(slot.serial)}
            </span>
          </>
        )}
        {slot.kind === 'unknown' && (
          <span className="key-row__raw">
            Unrecognized data: <code>{formatBytes(slot.raw)}</code> (kept as-is)
          </span>
        )}
        {slot.kind === 'empty' && <span className="key-row__meta">Empty slot inside the list</span>}
      </span>

      <span className="key-row__actions">
        {(slot.kind === 'story' || slot.kind === 'random') && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={slot.completed}
              onChange={(event) => onCompletedChange(event.target.checked)}
            />
            Completed
          </label>
        )}
        <button
          type="button"
          className="button button--quiet"
          aria-label={`Remove key ${number}`}
          onClick={onRemove}
        >
          Remove
        </button>
      </span>
    </li>
  );
}
