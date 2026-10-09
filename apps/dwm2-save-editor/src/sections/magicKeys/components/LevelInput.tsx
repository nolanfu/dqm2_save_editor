import { useId, useState } from 'react';
import { LEVEL_MAX, LEVEL_MIN_EDITABLE } from '../format.ts';

interface LevelInputProps {
  value: number;
  onChange(level: number): void;
  label?: string;
}

function parseLevel(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const level = Number(text);
  return level >= LEVEL_MIN_EDITABLE && level <= LEVEL_MAX ? level : null;
}

/** Number input that only reports valid levels; invalid drafts stay local and are flagged. */
export function LevelInput({ value, onChange, label = 'Level' }: LevelInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  const id = useId();

  // Follow external changes (e.g. reset) without clobbering an in-progress edit.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
  }

  const invalid = parseLevel(draft) === null;

  return (
    <span className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={LEVEL_MIN_EDITABLE}
        max={LEVEL_MAX}
        value={draft}
        aria-invalid={invalid}
        title={`${LEVEL_MIN_EDITABLE}–${LEVEL_MAX}`}
        onChange={(event) => {
          setDraft(event.target.value);
          const level = parseLevel(event.target.value);
          if (level !== null && level !== value) {
            setLastValue(level);
            onChange(level);
          }
        }}
        onBlur={() => {
          if (invalid) setDraft(String(value));
        }}
      />
    </span>
  );
}
