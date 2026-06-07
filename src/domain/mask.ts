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
