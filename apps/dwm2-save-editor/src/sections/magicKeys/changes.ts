import { encodeEntry } from './format.ts';
import type { MagicKeys } from './model.ts';
import { usedSlotCount } from './operations.ts';

export type SlotChange = 'added' | 'edited' | 'unchanged';

export interface ChangeSummary {
  added: number;
  edited: number;
  removed: number;
}

/**
 * How the key at `index` in `proposed` differs from the file as loaded. A key that only moved
 * (because a key above it was removed) is unchanged; one edited back to its original bytes is too.
 */
export function slotChange(original: MagicKeys, proposed: MagicKeys, index: number): SlotChange {
  const origin = proposed.origins[index];
  if (origin === null || origin === undefined) return 'added';
  const before = encodeEntry(original.slots[origin]!);
  const after = encodeEntry(proposed.slots[index]!);
  return before.every((b, i) => b === after[i]) ? 'unchanged' : 'edited';
}

export function summarizeChanges(original: MagicKeys, proposed: MagicKeys): ChangeSummary {
  const summary: ChangeSummary = { added: 0, edited: 0, removed: 0 };
  const used = usedSlotCount(proposed);
  for (let i = 0; i < used; i++) {
    const change = slotChange(original, proposed, i);
    if (change !== 'unchanged') summary[change]++;
  }

  const kept = new Set(proposed.origins.slice(0, used));
  for (let i = 0; i < usedSlotCount(original); i++) {
    if (original.slots[i]!.kind !== 'empty' && !kept.has(i)) summary.removed++;
  }
  return summary;
}
