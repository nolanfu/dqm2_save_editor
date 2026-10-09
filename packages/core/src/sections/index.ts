import { bytesEqual } from '../bytes/index.ts';
import { applyIps, createIps } from '../ips/index.ts';

/**
 * One editable region of a file. Implementations must round-trip exactly:
 * `serialize(parse(bytes), copy)` must leave `copy` byte-identical to `bytes`, so data the user
 * didn't touch never appears in the patch.
 */
export interface Section<TModel> {
  id: string;
  title: string;
  /** Reads the section from the original file. Throws if the file can't contain it. */
  parse(bytes: Uint8Array): TModel;
  /** Writes the section into `target`, which starts as a copy of the original file. */
  serialize(model: TModel, target: Uint8Array): void;
}

/** A section paired with the proposed model to write, for heterogeneous lists of sections. */
export interface SectionWrite {
  write(target: Uint8Array): void;
}

export function sectionWrite<TModel>(section: Section<TModel>, model: TModel): SectionWrite {
  return { write: (target) => section.serialize(model, target) };
}

export interface PatchedFile {
  /** The IPS patch representing every change. */
  patch: Uint8Array;
  /** The original file with `patch` applied. */
  output: Uint8Array;
  /** False when no byte differs from the original. */
  changed: boolean;
}

export class PatchVerificationError extends Error {
  override name = 'PatchVerificationError';
}

/**
 * Export pipeline: write every section into a copy of the original, diff the copy against the
 * original into an IPS patch, apply that patch to the original, and verify the result matches.
 */
export function buildPatchedFile(
  original: Uint8Array,
  writes: readonly SectionWrite[],
): PatchedFile {
  const modified = original.slice();
  for (const { write } of writes) write(modified);

  const patch = createIps(original, modified);
  const output = applyIps(original, patch);
  if (!bytesEqual(output, modified)) {
    throw new PatchVerificationError(
      'The generated patch did not reproduce the edited file. Nothing was downloaded.',
    );
  }
  return { patch, output, changed: !bytesEqual(original, output) };
}
