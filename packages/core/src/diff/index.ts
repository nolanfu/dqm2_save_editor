export interface ByteRun {
  offset: number;
  length: number;
}

export interface DiffOptions {
  /**
   * Changed runs separated by an unchanged gap of at most this many bytes are merged into one
   * run. Merging is always correct (the gap bytes are rewritten with their existing values) and
   * avoids paying a per-record header for tiny gaps. Defaults to 0 (no merging).
   */
  mergeGap?: number;
}

/**
 * Finds the contiguous byte ranges where `modified` differs from `original`.
 * Both buffers must be the same length.
 */
export function findChangedRuns(
  original: Uint8Array,
  modified: Uint8Array,
  options: DiffOptions = {},
): ByteRun[] {
  if (original.length !== modified.length) {
    throw new RangeError(
      `Cannot diff buffers of different lengths (${original.length} vs ${modified.length})`,
    );
  }
  const mergeGap = options.mergeGap ?? 0;
  const runs: ByteRun[] = [];
  let i = 0;
  while (i < original.length) {
    if (original[i] === modified[i]) {
      i++;
      continue;
    }
    const start = i;
    while (i < original.length && original[i] !== modified[i]) i++;
    const previous = runs.at(-1);
    if (previous && start - (previous.offset + previous.length) <= mergeGap) {
      previous.length = i - previous.offset;
    } else {
      runs.push({ offset: start, length: i - start });
    }
  }
  return runs;
}
