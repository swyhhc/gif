import { describe, expect, it } from 'vitest';
import {
  applyMaskToImageData,
  getMaskCoverage,
  hasLikelySubjectMask,
  refineMask,
  thresholdAlpha,
} from '../domain/mask';

describe('mask utilities', () => {
  it('thresholds alpha for GIF transparency', () => {
    expect(thresholdAlpha(0.49, 0.5)).toBe(0);
    expect(thresholdAlpha(0.5, 0.5)).toBe(255);
  });

  it('applies transparent alpha to background pixels', () => {
    const source = new ImageData(new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]), 2, 1);
    const result = applyMaskToImageData(source, new Float32Array([1, 0]), 0.5);
    expect(Array.from(result.data)).toEqual([255, 0, 0, 255, 0, 0, 255, 0]);
  });

  it('can invert mask values when the model labels the subject as zero', () => {
    const source = new ImageData(new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]), 2, 1);
    const result = applyMaskToImageData(source, new Float32Array([0, 1]), 0.5, { invert: true });
    expect(Array.from(result.data)).toEqual([255, 0, 0, 255, 0, 0, 255, 0]);
  });

  it('fails loudly when mask size does not match image size', () => {
    const source = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
    expect(() => applyMaskToImageData(source, new Float32Array([1, 0]), 0.5)).toThrow(
      'Mask size must match image size.',
    );
  });

  it('reports mask coverage so bad subject previews can be rejected', () => {
    expect(getMaskCoverage(new Float32Array([1, 0, 1, 0]), 0.5)).toBe(0.5);
    expect(hasLikelySubjectMask(new Float32Array([0, 0, 0, 0]), 2, 2, { threshold: 0.5 })).toBe(false);
    expect(hasLikelySubjectMask(new Float32Array([1, 0, 0, 0]), 2, 2, { threshold: 0.5 })).toBe(true);
    expect(hasLikelySubjectMask(new Float32Array([0, 1, 1, 1]), 2, 2, { threshold: 0.5, invert: true })).toBe(true);
  });

  it('expands mask edges', () => {
    const refined = refineMask(new Float32Array([0, 0, 0, 0, 1, 0, 0, 0, 0]), 3, 3, {
      threshold: 0.5,
      edgeOffset: 1,
    });
    expect(Array.from(refined)).toEqual([0, 1, 0, 1, 1, 1, 0, 1, 0]);
  });

  it('shrinks mask edges', () => {
    const refined = refineMask(new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1]), 3, 3, {
      threshold: 0.5,
      edgeOffset: -1,
    });
    expect(Array.from(refined)).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0]);
  });
});
