import type { SectionEditorProps } from '@file-editor/core/react';
import { useState } from 'react';
import { slotChange, summarizeChanges, type ChangeSummary } from './changes.ts';
import { AddKeyControls } from './components/AddKeyControls.tsx';
import { KeyRow } from './components/KeyRow.tsx';
import { KEY_SLOT_COUNT } from './format.ts';
import type { MagicKeys } from './model.ts';
import {
  addRandomKey,
  addStoryKey,
  removeKey,
  setCompleted,
  setRandomFields,
  setStoryId,
  usedSlotCount,
  type OperationResult,
} from './operations.ts';
import { PRESETS } from './presets.ts';

type Notice = { tone: 'info' | 'error'; text: string } | null;

function describeChanges({ added, edited, removed }: ChangeSummary): string | null {
  const parts = [
    added && `${added} added`,
    edited && `${edited} edited`,
    removed && `${removed} removed`,
  ].filter(Boolean);
  return parts.length > 0 ? `Unsaved changes: ${parts.join(' · ')}` : null;
}

export function MagicKeysEditor({ original, model, onChange }: SectionEditorProps<MagicKeys>) {
  const [notice, setNotice] = useState<Notice>(null);
  const used = usedSlotCount(model);
  const full = used >= KEY_SLOT_COUNT;
  const changes = describeChanges(summarizeChanges(original, model));

  function edit(next: MagicKeys) {
    setNotice(null);
    onChange(next);
  }

  function apply(result: OperationResult) {
    if (result.ok) edit(result.model);
    else setNotice({ tone: 'error', text: result.error });
  }

  return (
    <div className="magic-keys">
      <div className="presets" role="group" aria-label="Presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="button"
            title={preset.description}
            onClick={() => {
              const result = preset.apply(model);
              if (result.ok) {
                onChange(result.model);
                setNotice({ tone: 'info', text: result.message });
              } else {
                setNotice({ tone: 'error', text: result.error });
              }
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {notice && (
        <p
          className={`notice notice--${notice.tone}`}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}

      <p className="magic-keys__count">
        {used} of {KEY_SLOT_COUNT} slots used
        {changes && <span className="magic-keys__changes"> — {changes}</span>}
      </p>

      {used === 0 ? (
        <p className="magic-keys__empty">No keys yet.</p>
      ) : (
        <ol className="key-list">
          {model.slots.slice(0, used).map((slot, index) => (
            <KeyRow
              // Slots have no identity of their own; position is the identity.
              key={index}
              index={index}
              slot={slot}
              change={slotChange(original, model, index)}
              onStoryIdChange={(storyId) => edit(setStoryId(model, index, storyId))}
              onRandomChange={(fields) => edit(setRandomFields(model, index, fields))}
              onCompletedChange={(completed) => edit(setCompleted(model, index, completed))}
              onRemove={() => edit(removeKey(model, index))}
            />
          ))}
        </ol>
      )}

      <AddKeyControls
        disabled={full}
        onAddStory={(storyId) => apply(addStoryKey(model, storyId))}
        onAddRandom={(fields) => apply(addRandomKey(model, fields))}
      />
    </div>
  );
}
