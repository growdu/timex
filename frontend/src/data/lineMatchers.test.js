import { describe, it, expect } from 'vitest';
import {
  LINE_KEYWORDS,
  STAGE_TO_LINE,
  isInLine,
  matchedLines,
} from './lineMatchers';

const makeEvent = (overrides = {}) => ({
  id: 'e1',
  stage: null,
  placeId: null,
  people: [],
  ...overrides,
});

const personMap = new Map([
  ['p-husband', { id: 'p-husband', role: '丈夫' }],
  ['p-colleague', { id: 'p-colleague', role: '同事' }],
  ['p-friend', { id: 'p-friend', role: '朋友' }],
  ['p-family', { id: 'p-family', role: '家人' }],
]);

describe('LINE_KEYWORDS', () => {
  it('has a regex for every relationship line', () => {
    expect(LINE_KEYWORDS.emotion).toBeInstanceOf(RegExp);
    expect(LINE_KEYWORDS.career).toBeInstanceOf(RegExp);
    expect(LINE_KEYWORDS.family).toBeInstanceOf(RegExp);
    expect(LINE_KEYWORDS.friends).toBeInstanceOf(RegExp);
  });

  it('matches Chinese role keywords for emotion', () => {
    expect(LINE_KEYWORDS.emotion.test('丈夫')).toBe(true);
    expect(LINE_KEYWORDS.emotion.test('妻子')).toBe(true);
    expect(LINE_KEYWORDS.emotion.test('恋人')).toBe(true);
  });

  it('matches English role keywords for career', () => {
    expect(LINE_KEYWORDS.career.test('CTO')).toBe(true);
    expect(LINE_KEYWORDS.career.test('co-founder')).toBe(true);
    expect(LINE_KEYWORDS.career.test('investor')).toBe(true);
  });

  it('matches English role keywords for family (case-insensitive)', () => {
    expect(LINE_KEYWORDS.family.test('father')).toBe(true);
    expect(LINE_KEYWORDS.family.test('MOTHER')).toBe(true);
    expect(LINE_KEYWORDS.family.test('parent')).toBe(true);
  });

  it('matches Chinese role keywords for friends', () => {
    expect(LINE_KEYWORDS.friends.test('朋友')).toBe(true);
    expect(LINE_KEYWORDS.friends.test('同学')).toBe(true);
    expect(LINE_KEYWORDS.friends.test('闺蜜')).toBe(true);
  });
});

describe('STAGE_TO_LINE', () => {
  it('maps known stages', () => {
    expect(STAGE_TO_LINE.student).toBe('career');
    expect(STAGE_TO_LINE['first-job']).toBe('career');
    expect(STAGE_TO_LINE.maker).toBe('career');
    expect(STAGE_TO_LINE.family).toBe('family');
  });

  it('returns null for custom stage', () => {
    expect(STAGE_TO_LINE.custom).toBeNull();
  });
});

describe('isInLine — special lines', () => {
  it('time line matches every event', () => {
    expect(isInLine('time', makeEvent(), personMap)).toBe(true);
    expect(isInLine('time', makeEvent({ stage: 'custom' }), personMap)).toBe(true);
  });

  it('space line matches events with placeId', () => {
    expect(isInLine('space', makeEvent({ placeId: 'p1' }), personMap)).toBe(true);
    expect(isInLine('space', makeEvent({ placeId: null }), personMap)).toBe(false);
    expect(isInLine('space', makeEvent(), personMap)).toBe(false);
  });

  it('returns false for unknown line', () => {
    expect(isInLine('unknown-line', makeEvent(), personMap)).toBe(false);
  });

  it('returns false when event is null', () => {
    expect(isInLine('time', null, personMap)).toBe(false);
    expect(isInLine('emotion', null, personMap)).toBe(false);
  });

  it('returns false when lineId is empty', () => {
    expect(isInLine('', makeEvent(), personMap)).toBe(false);
  });
});

describe('isInLine — relationship lines via people objects', () => {
  it('matches emotion line via person.role', () => {
    const event = makeEvent({ people: [{ role: '丈夫' }] });
    expect(isInLine('emotion', event, personMap)).toBe(true);
  });

  it('matches career line via English role', () => {
    const event = makeEvent({ people: [{ role: 'Senior Engineer' }] });
    // does not match career — only matches specific career keywords
    expect(isInLine('career', event, personMap)).toBe(false);

    const event2 = makeEvent({ people: [{ role: 'CTO' }] });
    expect(isInLine('career', event2, personMap)).toBe(true);
  });

  it('matches family line', () => {
    const event = makeEvent({ people: [{ role: '母亲' }] });
    expect(isInLine('family', event, personMap)).toBe(true);
  });

  it('matches friends line', () => {
    const event = makeEvent({ people: [{ role: '闺蜜' }] });
    expect(isInLine('friends', event, personMap)).toBe(true);
  });

  it('coerces non-string role to string', () => {
    const event = makeEvent({ people: [{ role: 42 }] });
    // 42 has no match → false
    expect(isInLine('emotion', event, personMap)).toBe(false);
  });

  it('skips null / falsy people entries', () => {
    const event = makeEvent({ people: [null, undefined, { role: '丈夫' }] });
    expect(isInLine('emotion', event, personMap)).toBe(true);
  });
});

describe('isInLine — relationship lines via people id array + personMap', () => {
  it('resolves person by id from map and matches role', () => {
    const event = makeEvent({ people: ['p-husband'] });
    expect(isInLine('emotion', event, personMap)).toBe(true);
  });

  it('returns false when person id is not in map', () => {
    const event = makeEvent({ people: ['p-unknown'] });
    expect(isInLine('emotion', event, personMap)).toBe(false);
  });

  it('returns false when resolved person has no role', () => {
    const map = new Map([['p-empty', { id: 'p-empty' }]]);
    const event = makeEvent({ people: ['p-empty'] });
    expect(isInLine('emotion', event, map)).toBe(false);
  });
});

describe('isInLine — fallback via stage', () => {
  it('matches career via student stage when no role matches', () => {
    const event = makeEvent({ stage: 'student', people: [] });
    expect(isInLine('career', event, personMap)).toBe(true);
  });

  it('matches family via family stage', () => {
    const event = makeEvent({ stage: 'family', people: [] });
    expect(isInLine('family', event, personMap)).toBe(true);
  });

  it('does not match emotion via family stage (only via role)', () => {
    const event = makeEvent({ stage: 'family', people: [] });
    expect(isInLine('emotion', event, personMap)).toBe(false);
  });

  it('does not match when stage is custom', () => {
    const event = makeEvent({ stage: 'custom', people: [] });
    expect(isInLine('career', event, personMap)).toBe(false);
  });
});

describe('isInLine — edge cases', () => {
  it('handles people as non-array gracefully', () => {
    const event = makeEvent({ people: 'not an array' });
    expect(isInLine('emotion', event, personMap)).toBe(false);
  });

  it('handles people missing entirely', () => {
    const event = { id: 'e1', stage: null, placeId: null };
    expect(isInLine('emotion', event, personMap)).toBe(false);
  });
});

describe('matchedLines', () => {
  it('returns time for any event', () => {
    const result = matchedLines(makeEvent(), personMap);
    expect(result).toContain('time');
  });

  it('returns space when event has placeId', () => {
    const result = matchedLines(makeEvent({ placeId: 'p1' }), personMap);
    expect(result).toContain('space');
  });

  it('returns relationship lines for matching people', () => {
    const event = makeEvent({
      people: [{ role: '丈夫' }, { role: '同事' }, { role: '朋友' }, { role: '家人' }],
    });
    const result = matchedLines(event, personMap);
    expect(result).toEqual(expect.arrayContaining(['time', 'emotion', 'career', 'family', 'friends']));
  });

  it('does not include space for events without placeId', () => {
    const event = makeEvent({ people: [{ role: '丈夫' }] });
    const result = matchedLines(event, personMap);
    expect(result).not.toContain('space');
  });

  it('deduplicates lines', () => {
    const event = makeEvent({
      stage: 'career',
      people: [{ role: 'CTO' }, { role: 'manager' }],
    });
    const result = matchedLines(event, personMap);
    const careerCount = result.filter((l) => l === 'career').length;
    expect(careerCount).toBe(1);
  });

  it('returns array (not Set)', () => {
    const result = matchedLines(makeEvent(), personMap);
    expect(Array.isArray(result)).toBe(true);
  });
});
