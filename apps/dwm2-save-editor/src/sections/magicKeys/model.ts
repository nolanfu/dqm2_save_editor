export type RawEntry = readonly [number, number, number, number];

export type KeySlot =
  /** All four bytes are 0xFF. */
  | { kind: 'empty' }
  | { kind: 'story'; storyId: number; completed: boolean }
  | {
      kind: 'random';
      /** Low 6 bits of byte 0. Meaning not fully known; appears to increase per generated key. */
      serial: number;
      prefix: number;
      suffix: number;
      level: number;
      completed: boolean;
    }
  /** Bytes that match no known pattern; preserved verbatim. */
  | { kind: 'unknown'; raw: RawEntry };

export type FilledKeySlot = Exclude<KeySlot, { kind: 'empty' }>;

/** All 32 slots in file order. Valid files keep filled slots first and empties last. */
export interface MagicKeys {
  slots: readonly KeySlot[];
}
