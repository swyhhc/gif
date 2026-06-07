import { GIFEncoder, applyPalette, quantize } from 'gifenc';

export type GifFrame = {
  imageData: ImageData;
  delayMs: number;
};

export function encodeTransparentGif(frames: GifFrame[]): Blob {
  if (frames.length === 0) {
    throw new Error('At least one frame is required.');
  }

  const gif = GIFEncoder();

  for (const frame of frames) {
    const rgba = frame.imageData.data;
    const transparentIndex = 0;
    const colorPalette = quantize(rgba, 255);
    const palette = [[0, 0, 0] as [number, number, number], ...colorPalette];
    const indexedColors = applyPalette(rgba, colorPalette);
    const indexed = new Uint8Array(indexedColors.length);

    for (let pixel = 0; pixel < rgba.length / 4; pixel += 1) {
      if (rgba[pixel * 4 + 3] === 0) {
        indexed[pixel] = transparentIndex;
      } else {
        indexed[pixel] = indexedColors[pixel] + 1;
      }
    }

    gif.writeFrame(indexed, frame.imageData.width, frame.imageData.height, {
      palette,
      delay: frame.delayMs,
      transparent: true,
      transparentIndex,
      dispose: 2,
      repeat: 0,
    });
  }

  gif.finish();
  const bytes = gif.bytes();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: 'image/gif' });
}
