export function thresholdAlpha(value: number, threshold: number): 0 | 255 {
  return value >= threshold ? 255 : 0;
}

export function applyMaskToImageData(source: ImageData, mask: Float32Array, threshold = 0.5): ImageData {
  if (mask.length !== source.width * source.height) {
    throw new Error('Mask size must match image size.');
  }

  const output = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    output.data[pixel * 4 + 3] = thresholdAlpha(mask[pixel], threshold);
  }

  return output;
}

export function getMaskCoverage(mask: Float32Array, threshold = 0.5): number {
  if (mask.length === 0) {
    return 0;
  }

  let visiblePixels = 0;
  for (const value of mask) {
    if (value >= threshold) {
      visiblePixels += 1;
    }
  }

  return Number((visiblePixels / mask.length).toFixed(4));
}

export function hasLikelySubjectMask(mask: Float32Array, threshold = 0.5): boolean {
  const coverage = getMaskCoverage(mask, threshold);
  return coverage >= 0.02 && coverage <= 0.9;
}
