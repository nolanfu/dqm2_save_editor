import { describe, expect, it } from 'vitest';
import { applyIps } from '../ips/index.ts';
import { buildPatchedFile, sectionWrite, type Section } from './index.ts';

const byteSection = (offset: number): Section<number> => ({
  id: `byte-${offset}`,
  title: `Byte ${offset}`,
  parse: (bytes) => bytes[offset]!,
  serialize: (model, target) => {
    target[offset] = model;
  },
});

describe('buildPatchedFile', () => {
  const original = new Uint8Array([10, 20, 30, 40]);

  it('reports no change when sections write back what they parsed', () => {
    const a = byteSection(1);
    const result = buildPatchedFile(original, [sectionWrite(a, a.parse(original))]);
    expect(result.changed).toBe(false);
    expect(result.output).toEqual(original);
  });

  it('applies every section and returns a patch that reproduces the output', () => {
    const result = buildPatchedFile(original, [
      sectionWrite(byteSection(0), 11),
      sectionWrite(byteSection(3), 44),
    ]);
    expect(result.changed).toBe(true);
    expect(Array.from(result.output)).toEqual([11, 20, 30, 44]);
    expect(applyIps(original, result.patch)).toEqual(result.output);
    expect(Array.from(original)).toEqual([10, 20, 30, 40]);
  });
});
