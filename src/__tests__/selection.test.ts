import { describe, expect, it } from 'vitest';
import { clampSelection, getSelectionCenter, hasUsableSelection } from '../domain/selection';

describe('selection geometry', () => {
  it('clamps a box inside canvas bounds', () => {
    expect(clampSelection({ x: -10, y: 20, width: 400, height: 300 }, 320, 240)).toEqual({
      x: 0,
      y: 20,
      width: 320,
      height: 220,
    });
  });

  it('normalizes negative drag direction', () => {
    expect(clampSelection({ x: 200, y: 160, width: -100, height: -80 }, 320, 240)).toEqual({
      x: 100,
      y: 80,
      width: 100,
      height: 80,
    });
  });

  it('returns normalized center point', () => {
    expect(getSelectionCenter({ x: 80, y: 60, width: 160, height: 120 }, 320, 240)).toEqual({
      x: 0.5,
      y: 0.5,
    });
  });

  it('rejects tiny selections', () => {
    expect(hasUsableSelection({ x: 0, y: 0, width: 10, height: 40 })).toBe(false);
    expect(hasUsableSelection({ x: 0, y: 0, width: 40, height: 40 })).toBe(true);
  });
});
