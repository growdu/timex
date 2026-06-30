import { describe, it, expect } from 'vitest';
import { lines, getLineMeta } from './lines';

describe('lines', () => {
  it('exports 6 lines with stable order', () => {
    expect(lines).toHaveLength(6);
    expect(lines.map((l) => l.id)).toEqual([
      'time',
      'space',
      'emotion',
      'career',
      'family',
      'friends',
    ]);
  });

  it('every line has required fields', () => {
    for (const line of lines) {
      expect(line).toHaveProperty('id');
      expect(line).toHaveProperty('label');
      expect(line).toHaveProperty('icon');
      expect(line).toHaveProperty('gradient');
      expect(line).toHaveProperty('blurb');
      expect(typeof line.id).toBe('string');
      expect(typeof line.label).toBe('string');
      expect(typeof line.icon).toBe('string');
      expect(typeof line.gradient).toBe('string');
      expect(typeof line.blurb).toBe('string');
    }
  });

  it('line ids are unique', () => {
    const ids = lines.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gradients are valid CSS gradients', () => {
    for (const line of lines) {
      expect(line.gradient).toMatch(/linear-gradient\(/);
    }
  });
});

describe('getLineMeta', () => {
  it('returns the meta for a known line id', () => {
    const meta = getLineMeta('career');
    expect(meta).toEqual(lines[3]);
  });

  it('returns null for an unknown line id', () => {
    expect(getLineMeta('unknown')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(getLineMeta('')).toBeNull();
  });
});
