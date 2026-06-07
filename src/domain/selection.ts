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
