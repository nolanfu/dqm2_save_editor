/** True when both buffers have the same length and contents. */
export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Formats a number as uppercase hex, zero-padded to `width` digits, without a prefix. */
export function toHex(value: number, width = 2): string {
  return value.toString(16).toUpperCase().padStart(width, '0');
}

/** Formats bytes as space-separated uppercase hex, e.g. `FF 01 80`. */
export function formatBytes(bytes: ArrayLike<number>): string {
  return Array.from(bytes, (b) => toHex(b)).join(' ');
}

/** Throws a RangeError unless `bytes` contains `[offset, offset + length)`. */
export function assertRange(
  bytes: Uint8Array,
  offset: number,
  length: number,
  what = 'data',
): void {
  if (offset < 0 || offset + length > bytes.length) {
    throw new RangeError(
      `${what} at 0x${toHex(offset, 4)}–0x${toHex(offset + length - 1, 4)} is outside the file ` +
        `(file is ${bytes.length} bytes)`,
    );
  }
}
