export function thresholdAlpha(value: number, threshold: number): 0 | 255 {
  return value >= threshold ? 255 : 0;
}

export type MaskOptions = {
  invert?: boolean;
  edgeOffset?: number;
  fillHoles?: boolean;
};

export type RefineMaskOptions = MaskOptions & {
  threshold?: number;
};

export type MaskBrushStroke = {
  mode: 'erase' | 'restore';
  radius: number;
  points: Array<{ x: number; y: number }>;
};

export function applyMaskToImageData(
  source: ImageData,
  mask: Float32Array,
  threshold = 0.5,
  options: MaskOptions = {},
): ImageData {
  if (mask.length !== source.width * source.height) {
    throw new Error('Mask size must match image size.');
  }

  const output = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
  const refinedMask = refineMask(mask, source.width, source.height, {
    threshold,
    invert: options.invert,
    edgeOffset: options.edgeOffset,
  });

  for (let pixel = 0; pixel < refinedMask.length; pixel += 1) {
    output.data[pixel * 4 + 3] = refinedMask[pixel] ? 255 : 0;
  }

  return output;
}

export function applyBinaryMaskToImageData(source: ImageData, mask: Uint8Array): ImageData {
  if (mask.length !== source.width * source.height) {
    throw new Error('Mask size must match image size.');
  }

  const output = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    output.data[pixel * 4 + 3] = mask[pixel] ? 255 : 0;
  }

  return output;
}

export function refineMask(mask: Float32Array, width: number, height: number, options: RefineMaskOptions = {}): Uint8Array {
  const threshold = options.threshold ?? 0.5;
  const binary = new Uint8Array(mask.length);

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const visible = mask[pixel] >= threshold;
    binary[pixel] = options.invert ? Number(!visible) : Number(visible);
  }

  const edgeOffset = Math.max(-3, Math.min(3, Math.round(options.edgeOffset ?? 0)));
  if (edgeOffset === 0) {
    return options.fillHoles === false ? binary : fillMaskHoles(binary, width, height);
  }

  let current: Uint8Array<ArrayBufferLike> = binary;
  const operation = edgeOffset > 0 ? dilateMask : erodeMask;

  for (let step = 0; step < Math.abs(edgeOffset); step += 1) {
    current = operation(current, width, height);
  }

  return options.fillHoles === false ? current : fillMaskHoles(current, width, height);
}

export function applyMaskBrushStroke(mask: Uint8Array, width: number, height: number, stroke: MaskBrushStroke): Uint8Array {
  const output = new Uint8Array(mask);
  const value = stroke.mode === 'restore' ? 1 : 0;
  const radius = Math.max(0, Math.round(stroke.radius));

  for (const point of stroke.points) {
    const centerX = Math.round(point.x);
    const centerY = Math.round(point.y);

    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (Math.hypot(x - centerX, y - centerY) > radius) continue;
        output[y * width + x] = value;
      }
    }
  }

  return output;
}

export function applyMaskBrushStrokes(
  mask: Uint8Array,
  width: number,
  height: number,
  strokes: MaskBrushStroke[],
): Uint8Array {
  return strokes.reduce((current, stroke) => applyMaskBrushStroke(current, width, height, stroke), mask);
}

export function fillMaskHoles(mask: Uint8Array, width: number, height: number): Uint8Array {
  const outside = new Uint8Array(mask.length);
  const queue: number[] = [];

  function enqueueIfOutsideBackground(x: number, y: number) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (mask[index] || outside[index]) return;
    outside[index] = 1;
    queue.push(index);
  }

  for (let x = 0; x < width; x += 1) {
    enqueueIfOutsideBackground(x, 0);
    enqueueIfOutsideBackground(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    enqueueIfOutsideBackground(0, y);
    enqueueIfOutsideBackground(width - 1, y);
  }

  while (queue.length > 0) {
    const index = queue.shift() as number;
    const x = index % width;
    const y = Math.floor(index / width);
    enqueueIfOutsideBackground(x + 1, y);
    enqueueIfOutsideBackground(x - 1, y);
    enqueueIfOutsideBackground(x, y + 1);
    enqueueIfOutsideBackground(x, y - 1);
  }

  const output = new Uint8Array(mask);
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] && !outside[index]) {
      output[index] = 1;
    }
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

export function hasLikelySubjectMask(
  mask: Float32Array,
  width: number,
  height: number,
  options: RefineMaskOptions = {},
): boolean {
  const refined = refineMask(mask, width, height, options);
  const coverage = refined.reduce((total, value) => total + value, 0) / refined.length;
  return coverage >= 0.02 && coverage <= 0.9;
}

function dilateMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const output = new Uint8Array(mask.length);

  forEachPixel(width, height, (x, y, index) => {
    output[index] = hasVisibleNeighbor(mask, width, height, x, y) ? 1 : 0;
  });

  return output;
}

function erodeMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const output = new Uint8Array(mask.length);

  forEachPixel(width, height, (x, y, index) => {
    output[index] = hasAllVisibleNeighbors(mask, width, height, x, y) ? 1 : 0;
  });

  return output;
}

function forEachPixel(width: number, height: number, visit: (x: number, y: number, index: number) => void) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      visit(x, y, y * width + x);
    }
  }
}

function hasVisibleNeighbor(mask: Uint8Array, width: number, height: number, x: number, y: number): boolean {
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (Math.abs(offsetX) + Math.abs(offsetY) > 1) continue;
      const nextX = x + offsetX;
      const nextY = y + offsetY;

      if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
      if (mask[nextY * width + nextX]) return true;
    }
  }

  return false;
}

function hasAllVisibleNeighbors(mask: Uint8Array, width: number, height: number, x: number, y: number): boolean {
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (Math.abs(offsetX) + Math.abs(offsetY) > 1) continue;
      const nextX = x + offsetX;
      const nextY = y + offsetY;

      if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) return false;
      if (!mask[nextY * width + nextX]) return false;
    }
  }

  return true;
}
