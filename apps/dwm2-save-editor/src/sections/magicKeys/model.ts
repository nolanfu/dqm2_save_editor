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
      /**
       * Whether byte 0 has the 0x80 random-key bit. Real saves contain random keys whose byte 0
       * is 0x00 (reason unknown); they're kept as-is. New keys always set it.
       */
      randomFlag: boolean;
    }
  /** Bytes that match no known pattern; preserved verbatim. */
  | { kind: 'unknown'; raw: RawEntry };

export type FilledKeySlot = Exclude<KeySlot, { kind: 'empty' }>;

/** All 32 slots in file order. Valid files keep filled slots first and empties last. */
export interface MagicKeys {
  slots: readonly KeySlot[];
  /**
   * For each slot, the index it occupied in the file as loaded, or null for keys added since.
   * Not written to the file; used to show which keys are new or edited.
   */
  origins: readonly (number | null)[];
}
