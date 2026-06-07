import { describe, expect, it } from 'vitest';
import {
  clampSelection,
  createPromptFromPoint,
  createPromptFromMask,
  createPromptFromStroke,
  createSelectionFromPoint,
  getSelectionCenter,
  hasUsableSelection,
} from '../domain/selection';

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

  it('creates a usable subject prompt from a tap point', () => {
    expect(createSelectionFromPoint({ x: 160, y: 120 }, 320, 240)).toEqual({
      x: 120,
      y: 90,
      width: 80,
      height: 60,
    });
  });

  it('creates a keypoint prompt from a tap', () => {
    expect(createPromptFromPoint({ x: 160, y: 120 }, 320, 240)).toEqual({
      bounds: { x: 120, y: 90, width: 80, height: 60 },
      points: [{ x: 160, y: 120 }],
    });
  });

  it('creates a scribble prompt from a stroke', () => {
    expect(
      createPromptFromStroke(
        [
          { x: 50, y: 40 },
          { x: 120, y: 90 },
          { x: 180, y: 130 },
        ],
        320,
        240,
      ),
    ).toEqual({
      bounds: { x: 30, y: 20, width: 170, height: 130 },
      points: [
        { x: 50, y: 40 },
        { x: 120, y: 90 },
        { x: 180, y: 130 },
      ],
    });
  });

  it('creates a prompt from an edited mask center', () => {
    expect(createPromptFromMask(new Uint8Array([0, 0, 0, 1]), 2, 2)).toEqual({
      bounds: { x: 0, y: 0, width: 2, height: 2 },
      points: [{ x: 1, y: 1 }],
    });
  });
});
