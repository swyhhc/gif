export type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SelectionPoint = {
  x: number;
  y: number;
};

export type SubjectPrompt = {
  bounds: SelectionRect;
  points: SelectionPoint[];
};

export function normalizeSelection(rect: SelectionRect): SelectionRect {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x;
  const y = rect.height < 0 ? rect.y + rect.height : rect.y;

  return {
    x,
    y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
}

export function clampSelection(rect: SelectionRect, canvasWidth: number, canvasHeight: number): SelectionRect {
  const normalized = normalizeSelection(rect);
  const x = Math.max(0, Math.min(normalized.x, canvasWidth));
  const y = Math.max(0, Math.min(normalized.y, canvasHeight));
  const right = Math.max(x, Math.min(normalized.x + normalized.width, canvasWidth));
  const bottom = Math.max(y, Math.min(normalized.y + normalized.height, canvasHeight));

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

export function getSelectionCenter(rect: SelectionRect, canvasWidth: number, canvasHeight: number) {
  return {
    x: Number(((rect.x + rect.width / 2) / canvasWidth).toFixed(4)),
    y: Number(((rect.y + rect.height / 2) / canvasHeight).toFixed(4)),
  };
}

export function hasUsableSelection(rect: SelectionRect): boolean {
  return rect.width >= 20 && rect.height >= 20;
}

export function createSelectionFromPoint(point: SelectionPoint, canvasWidth: number, canvasHeight: number): SelectionRect {
  const width = Math.max(40, Math.round(canvasWidth * 0.25));
  const height = Math.max(40, Math.round(canvasHeight * 0.25));
  return clampSelection(
    {
      x: point.x - width / 2,
      y: point.y - height / 2,
      width,
      height,
    },
    canvasWidth,
    canvasHeight,
  );
}

export function createPromptFromPoint(point: SelectionPoint, canvasWidth: number, canvasHeight: number): SubjectPrompt {
  return {
    bounds: createSelectionFromPoint(point, canvasWidth, canvasHeight),
    points: [clampPoint(point, canvasWidth, canvasHeight)],
  };
}

export function createPromptFromStroke(
  points: SelectionPoint[],
  canvasWidth: number,
  canvasHeight: number,
): SubjectPrompt {
  const safePoints = points.map((point) => clampPoint(point, canvasWidth, canvasHeight));

  if (safePoints.length === 0) {
    return createPromptFromPoint({ x: canvasWidth / 2, y: canvasHeight / 2 }, canvasWidth, canvasHeight);
  }

  const minX = Math.min(...safePoints.map((point) => point.x));
  const minY = Math.min(...safePoints.map((point) => point.y));
  const maxX = Math.max(...safePoints.map((point) => point.x));
  const maxY = Math.max(...safePoints.map((point) => point.y));
  const padding = Math.max(20, Math.round(Math.min(canvasWidth, canvasHeight) * 0.08));

  return {
    bounds: clampSelection(
      {
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
      },
      canvasWidth,
      canvasHeight,
    ),
    points: safePoints,
  };
}

export function createPromptFromMask(mask: Uint8Array, width: number, height: number): SubjectPrompt | null {
  let totalX = 0;
  let totalY = 0;
  let count = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      totalX += x;
      totalY += y;
      count += 1;
    }
  }

  if (count === 0) {
    return null;
  }

  return createPromptFromPoint({ x: totalX / count, y: totalY / count }, width, height);
}

function clampPoint(point: SelectionPoint, canvasWidth: number, canvasHeight: number): SelectionPoint {
  return {
    x: Math.max(0, Math.min(point.x, canvasWidth)),
    y: Math.max(0, Math.min(point.y, canvasHeight)),
  };
}
