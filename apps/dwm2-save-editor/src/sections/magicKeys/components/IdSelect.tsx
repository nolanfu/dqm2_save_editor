import { useId } from 'react';
import { idLabel } from '../names.ts';

interface IdSelectProps {
  label: string;
  value: number;
  ids: readonly number[];
  nameOf(id: number): string | undefined;
  onChange(id: number): void;
}

export function IdSelect({ label, value, ids, nameOf, onChange }: IdSelectProps) {
  const id = useId();
  return (
    <span className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {ids.map((option) => (
          <option key={option} value={option}>
            {idLabel(nameOf(option), option)}
          </option>
        ))}
      </select>
    </span>
  );
}
