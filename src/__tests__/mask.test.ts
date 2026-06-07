import { describe, expect, it } from 'vitest';
import { applyMaskToImageData, thresholdAlpha } from '../domain/mask';

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

  it('fails loudly when mask size does not match image size', () => {
    const source = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
    expect(() => applyMaskToImageData(source, new Float32Array([1, 0]), 0.5)).toThrow(
      'Mask size must match image size.',
    );
  });
});
