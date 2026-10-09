import { findChangedRuns } from '../diff/index.ts';

/**
 * IPS patch format:
 *   "PATCH"
 *   records...
 *     data record: offset (3 bytes, big-endian), size (2 bytes, BE, non-zero), data (size bytes)
 *     RLE record:  offset (3 bytes, BE), 0x0000, count (2 bytes, BE), value (1 byte)
 *   "EOF"
 */

const HEADER = new Uint8Array([0x50, 0x41, 0x54, 0x43, 0x48]); // "PATCH"
const FOOTER = new Uint8Array([0x45, 0x4f, 0x46]); // "EOF"

/** A record may not start here: its offset bytes would read as the "EOF" marker. */
export const IPS_EOF_OFFSET = 0x454f46;
export const IPS_MAX_OFFSET = 0xffffff;
export const IPS_MAX_RECORD_SIZE = 0xffff;

/** Unchanged gaps up to this size are folded into the surrounding record (a record header costs 5 bytes). */
const MERGE_GAP = 4;
/** Repeated-byte spans at least this long become RLE records; shorter ones never save space. */
const RLE_MIN_LENGTH = 14;

export type IpsRecord =
  | { type: 'data'; offset: number; data: Uint8Array }
  | { type: 'rle'; offset: number; count: number; value: number };

export class IpsError extends Error {
  override name = 'IpsError';
}

export function serializeIps(records: readonly IpsRecord[]): Uint8Array {
  let size = HEADER.length + FOOTER.length;
  for (const record of records) {
    validateRecord(record);
    size += record.type === 'data' ? 5 + record.data.length : 8;
  }

  const out = new Uint8Array(size);
  out.set(HEADER, 0);
  let pos = HEADER.length;
  for (const record of records) {
    writeU24(out, pos, record.offset);
    pos += 3;
    if (record.type === 'data') {
      writeU16(out, pos, record.data.length);
      out.set(record.data, pos + 2);
      pos += 2 + record.data.length;
    } else {
      writeU16(out, pos, 0);
      writeU16(out, pos + 2, record.count);
      out[pos + 4] = record.value;
      pos += 5;
    }
  }
  out.set(FOOTER, pos);
  return out;
}

export function parseIps(patch: Uint8Array): IpsRecord[] {
  if (patch.length < HEADER.length || !HEADER.every((b, i) => patch[i] === b)) {
    throw new IpsError('Not an IPS patch: missing "PATCH" header');
  }

  const records: IpsRecord[] = [];
  let pos = HEADER.length;
  for (;;) {
    if (pos + 3 > patch.length) {
      throw new IpsError('IPS patch is truncated: missing "EOF" marker');
    }
    const offset = readU24(patch, pos);
    pos += 3;
    if (offset === IPS_EOF_OFFSET) break;

    if (pos + 2 > patch.length) throw truncated(offset);
    const size = readU16(patch, pos);
    pos += 2;

    if (size === 0) {
      if (pos + 3 > patch.length) throw truncated(offset);
      const count = readU16(patch, pos);
      const value = patch[pos + 2]!;
      pos += 3;
      if (count === 0) {
        throw new IpsError(`IPS RLE record at 0x${offset.toString(16)} has a count of zero`);
      }
      records.push({ type: 'rle', offset, count, value });
    } else {
      if (pos + size > patch.length) throw truncated(offset);
      records.push({ type: 'data', offset, data: patch.slice(pos, pos + size) });
      pos += size;
    }
  }

  if (pos !== patch.length) {
    const extra = patch.length - pos;
    throw new IpsError(
      extra === 3
        ? 'IPS truncation extension is not supported'
        : `IPS patch has ${extra} unexpected bytes after "EOF"`,
    );
  }
  return records;
}

/**
 * Applies an IPS patch to `source` and returns a new buffer. `source` is not modified.
 * As in other IPS tools, records that write past the end of `source` extend the output.
 */
export function applyIps(source: Uint8Array, patch: Uint8Array): Uint8Array {
  const records = parseIps(patch);

  let length = source.length;
  for (const record of records) {
    length = Math.max(length, record.offset + recordLength(record));
  }

  const out = new Uint8Array(length);
  out.set(source);
  for (const record of records) {
    if (record.type === 'data') {
      out.set(record.data, record.offset);
    } else {
      out.fill(record.value, record.offset, record.offset + record.count);
    }
  }
  return out;
}

/**
 * Builds an IPS patch that turns `original` into `modified`. Both buffers must be the same
 * length (save-file and ROM edits never resize the file).
 */
export function createIps(original: Uint8Array, modified: Uint8Array): Uint8Array {
  const runs = findChangedRuns(original, modified, { mergeGap: MERGE_GAP });

  let segments: Segment[] = runs.flatMap((run) => splitRle(modified, run.offset, run.length));
  segments = segments.flatMap(splitOversized);
  segments = segments.flatMap(avoidEofOffset);

  const records = segments.map((segment): IpsRecord => {
    if (segment.offset > IPS_MAX_OFFSET) {
      throw new IpsError(
        `Change at 0x${segment.offset.toString(16)} is beyond the IPS 16 MiB offset limit`,
      );
    }
    return segment.rle
      ? {
          type: 'rle',
          offset: segment.offset,
          count: segment.length,
          value: modified[segment.offset]!,
        }
      : {
          type: 'data',
          offset: segment.offset,
          data: modified.slice(segment.offset, segment.offset + segment.length),
        };
  });
  return serializeIps(records);
}

interface Segment {
  offset: number;
  length: number;
  rle: boolean;
}

/** Splits a changed run into data segments and RLE segments for long repeated-byte spans. */
function splitRle(bytes: Uint8Array, offset: number, length: number): Segment[] {
  const segments: Segment[] = [];
  const end = offset + length;
  let dataStart = offset;
  let i = offset;
  while (i < end) {
    let j = i + 1;
    while (j < end && bytes[j] === bytes[i]) j++;
    if (j - i >= RLE_MIN_LENGTH) {
      if (i > dataStart) segments.push({ offset: dataStart, length: i - dataStart, rle: false });
      segments.push({ offset: i, length: j - i, rle: true });
      dataStart = j;
    }
    i = j;
  }
  if (end > dataStart) segments.push({ offset: dataStart, length: end - dataStart, rle: false });
  return segments;
}

function splitOversized(segment: Segment): Segment[] {
  const pieces: Segment[] = [];
  for (let start = 0; start < segment.length; start += IPS_MAX_RECORD_SIZE) {
    pieces.push({
      offset: segment.offset + start,
      length: Math.min(IPS_MAX_RECORD_SIZE, segment.length - start),
      rle: segment.rle,
    });
  }
  return pieces;
}

/**
 * A record at offset 0x454F46 would be read as the "EOF" marker. Start such a record one byte
 * earlier instead (rewriting that byte with its current value), as a data record.
 */
function avoidEofOffset(segment: Segment): Segment[] {
  if (segment.offset !== IPS_EOF_OFFSET) return [segment];
  return splitOversized({ offset: segment.offset - 1, length: segment.length + 1, rle: false });
}

function validateRecord(record: IpsRecord): void {
  if (!Number.isInteger(record.offset) || record.offset < 0 || record.offset > IPS_MAX_OFFSET) {
    throw new IpsError(`IPS record offset ${record.offset} is out of range`);
  }
  if (record.offset === IPS_EOF_OFFSET) {
    throw new IpsError('IPS record cannot start at offset 0x454F46 (reads as "EOF")');
  }
  const length = recordLength(record);
  if (length < 1 || length > IPS_MAX_RECORD_SIZE) {
    throw new IpsError(`IPS record at 0x${record.offset.toString(16)} has invalid size ${length}`);
  }
}

function recordLength(record: IpsRecord): number {
  return record.type === 'data' ? record.data.length : record.count;
}

function truncated(offset: number): IpsError {
  return new IpsError(`IPS patch is truncated in the record at 0x${offset.toString(16)}`);
}

function readU16(bytes: Uint8Array, pos: number): number {
  return (bytes[pos]! << 8) | bytes[pos + 1]!;
}

function readU24(bytes: Uint8Array, pos: number): number {
  return (bytes[pos]! << 16) | (bytes[pos + 1]! << 8) | bytes[pos + 2]!;
}

function writeU16(bytes: Uint8Array, pos: number, value: number): void {
  bytes[pos] = (value >> 8) & 0xff;
  bytes[pos + 1] = value & 0xff;
}

function writeU24(bytes: Uint8Array, pos: number, value: number): void {
  bytes[pos] = (value >> 16) & 0xff;
  bytes[pos + 1] = (value >> 8) & 0xff;
  bytes[pos + 2] = value & 0xff;
}
