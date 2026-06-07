import { useEffect, useRef, useState } from 'react';
import { type MaskBrushStroke } from '../domain/mask';
import {
  clampSelection,
  createPromptFromPoint,
  createPromptFromStroke,
  createSelectionFromPoint,
  hasUsableSelection,
  type SelectionPoint,
  type SelectionRect,
  type SubjectPrompt,
} from '../domain/selection';

type SelectionStepProps = {
  frame: ImageData;
  previewUrl: string | null;
  editableMask: Uint8Array | null;
  previewStatus: string | null;
  previewError: string | null;
  maskSettings: MaskSettings;
  onBack(): void;
  onSelectionChange(): void;
  onMaskSettingsChange(settings: MaskSettings): void;
  onManualMaskStroke(stroke: MaskBrushStroke): void;
  canUndoManualMask: boolean;
  onUndoManualMask(): void;
  onPreview(prompt: SubjectPrompt): void;
  onConfirm(prompt: SubjectPrompt): void;
};

export type MaskSettings = {
  invert: boolean;
  threshold: number;
  edgeOffset: number;
};

type BrushMode = MaskBrushStroke['mode'];

type Point = {
  x: number;
  y: number;
};

type ViewTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export function SelectionStep({
  frame,
  previewUrl,
  editableMask,
  previewStatus,
  previewError,
  maskSettings,
  onBack,
  onSelectionChange,
  onMaskSettingsChange,
  onManualMaskStroke,
  canUndoManualMask,
  onUndoManualMask,
  onPreview,
  onConfirm,
}: SelectionStepProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const editCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokePointsRef = useRef<SelectionPoint[]>([]);
  const [start, setStart] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [prompt, setPrompt] = useState<SubjectPrompt | null>(null);
  const [brushMode, setBrushMode] = useState<BrushMode>('erase');
  const [brushSize, setBrushSize] = useState(16);
  const [view, setView] = useState<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const editPointersRef = useRef(new Map<number, Point>());
  const pinchStartRef = useRef<{ distance: number; midpoint: Point; view: ViewTransform } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = frame.width;
    canvas.height = frame.height;
    drawSelectionCanvas(canvas, frame, prompt);
  }, [frame, prompt]);

  useEffect(() => {
    const canvas = editCanvasRef.current;
    if (!canvas || !editableMask) return;
    canvas.width = frame.width;
    canvas.height = frame.height;
    drawEditablePreview(canvas, frame, editableMask, view);
  }, [editableMask, frame, view]);

  const confirmedSelection = prompt ? clampSelection(prompt.bounds, frame.width, frame.height) : null;

  return (
    <section className="step-panel">
      <div className="step-heading">
        <p className="eyebrow">第一帧</p>
        <h1>选择主体</h1>
      </div>
      <canvas
        ref={canvasRef}
        className="selection-canvas"
        onPointerDown={(event) => {
          const point = getCanvasRelativePoint(event.currentTarget, event.clientX, event.clientY);
          onSelectionChange();
          setStart(point);
          setDragging(false);
          strokePointsRef.current = [point];
          setPrompt(createPromptFromPoint(point, frame.width, frame.height));
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!start) return;
          const point = getCanvasRelativePoint(event.currentTarget, event.clientX, event.clientY);
          const distance = Math.hypot(point.x - start.x, point.y - start.y);

          if (distance < 10 && !dragging) return;

          setDragging(true);
          const nextPoints = [...strokePointsRef.current, point];
          strokePointsRef.current = nextPoints;
          const nextPrompt = createPromptFromStroke(nextPoints, frame.width, frame.height);
          setPrompt(nextPrompt);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          setStart(null);
        }}
      />
      <p className="hint-text">点一下主体，或拖一个框辅助定位。下一步会先显示真正抠出来的透明预览。</p>
      {previewStatus ? <p className="hint-text">{previewStatus}</p> : null}
      {previewError ? <p className="error-text">{previewError}</p> : null}
      {previewUrl ? (
        <>
          <div className="checkerboard preview-box compact-preview editable-preview-wrap">
            <canvas
              ref={editCanvasRef}
              className="editable-preview-canvas"
              onPointerDown={(event) => {
                if (!editableMask) return;
                const screenPoint = getCanvasRelativePoint(event.currentTarget, event.clientX, event.clientY);
                editPointersRef.current.set(event.pointerId, screenPoint);
                event.currentTarget.setPointerCapture(event.pointerId);

                if (editPointersRef.current.size >= 2) {
                  pinchStartRef.current = getPinchStart(editPointersRef.current, view);
                  return;
                }

                const point = screenToImagePoint(screenPoint, view);
                const stroke = {
                  mode: brushMode,
                  radius: brushSize,
                  points: [point],
                } satisfies MaskBrushStroke;
                onManualMaskStroke(stroke);
              }}
              onPointerMove={(event) => {
                if (!editableMask) return;
                const screenPoint = getCanvasRelativePoint(event.currentTarget, event.clientX, event.clientY);
                if (!editPointersRef.current.has(event.pointerId)) return;
                editPointersRef.current.set(event.pointerId, screenPoint);

                if (editPointersRef.current.size >= 2 && pinchStartRef.current) {
                  setView(getNextPinchView(editPointersRef.current, pinchStartRef.current));
                  return;
                }

                if (event.buttons !== 1) return;
                const point = screenToImagePoint(screenPoint, view);
                const stroke = {
                  mode: brushMode,
                  radius: brushSize,
                  points: [point],
                } satisfies MaskBrushStroke;
                onManualMaskStroke(stroke);
              }}
              onPointerUp={(event) => {
                editPointersRef.current.delete(event.pointerId);
                pinchStartRef.current = null;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }}
              onPointerCancel={(event) => {
                editPointersRef.current.delete(event.pointerId);
                pinchStartRef.current = null;
              }}
            />
          </div>
          <button className="secondary-button compact-button" type="button" onClick={() => setView({ scale: 1, offsetX: 0, offsetY: 0 })}>
            重置缩放
          </button>
          <BrushControls
            mode={brushMode}
            size={brushSize}
            canUndo={canUndoManualMask}
            onModeChange={setBrushMode}
            onSizeChange={setBrushSize}
            onUndo={onUndoManualMask}
          />
          <MaskControls settings={maskSettings} onChange={onMaskSettingsChange} />
        </>
      ) : null}
      <div className="button-row">
        <button className="secondary-button" type="button" onClick={onBack}>
          返回
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={!confirmedSelection || !hasUsableSelection(confirmedSelection)}
          onClick={() => {
            if (!confirmedSelection || !prompt) return;
            if (previewUrl) {
              onConfirm(prompt);
            } else {
              onPreview(prompt);
            }
          }}
        >
          {previewUrl ? '满意，继续' : '生成抠图预览'}
        </button>
      </div>
    </section>
  );
}

function BrushControls({
  mode,
  size,
  onModeChange,
  onSizeChange,
  canUndo,
  onUndo,
}: {
  mode: BrushMode;
  size: number;
  canUndo: boolean;
  onModeChange(mode: BrushMode): void;
  onSizeChange(size: number): void;
  onUndo(): void;
}) {
  return (
    <div className="mask-controls">
      <div className="segmented-row two-up">
        <button className={mode === 'erase' ? 'segmented active' : 'segmented'} type="button" onClick={() => onModeChange('erase')}>
          擦除
        </button>
        <button className={mode === 'restore' ? 'segmented active' : 'segmented'} type="button" onClick={() => onModeChange('restore')}>
          恢复
        </button>
      </div>
      <button className="secondary-button compact-button" type="button" disabled={!canUndo} onClick={onUndo}>
        撤回上一笔
      </button>
      <label className="slider-control">
        <span>画笔 {size}px</span>
        <input type="range" min="4" max="48" step="2" value={size} onChange={(event) => onSizeChange(Number(event.target.value))} />
      </label>
    </div>
  );
}

function MaskControls({ settings, onChange }: { settings: MaskSettings; onChange(settings: MaskSettings): void }) {
  return (
    <div className="mask-controls">
      <label className="toggle-row">
        <input type="checkbox" checked={settings.invert} onChange={(event) => onChange({ ...settings, invert: event.target.checked })} />
        <span>反选</span>
      </label>
      <label className="slider-control">
        <span>阈值 {settings.threshold.toFixed(2)}</span>
        <input
          type="range"
          min="0.2"
          max="0.8"
          step="0.05"
          value={settings.threshold}
          onChange={(event) => onChange({ ...settings, threshold: Number(event.target.value) })}
        />
      </label>
      <label className="slider-control">
        <span>边缘 {settings.edgeOffset > 0 ? `+${settings.edgeOffset}` : settings.edgeOffset}</span>
        <input
          type="range"
          min="-3"
          max="3"
          step="1"
          value={settings.edgeOffset}
          onChange={(event) => onChange({ ...settings, edgeOffset: Number(event.target.value) })}
        />
      </label>
    </div>
  );
}

function drawSelectionCanvas(canvas: HTMLCanvasElement, frame: ImageData, prompt: SubjectPrompt | null) {
  const context = canvas.getContext('2d');
  if (!context) return;

  context.putImageData(frame, 0, 0);

  if (!prompt) return;

  const rect = clampSelection(prompt.bounds, canvas.width, canvas.height);
  context.fillStyle = 'rgba(0, 0, 0, 0.28)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.putImageData(frame, 0, 0, rect.x, rect.y, rect.width, rect.height);
  context.strokeStyle = '#16c784';
  context.lineWidth = Math.max(2, canvas.width / 140);
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);

  drawPromptStroke(context, prompt.points, canvas.width);
}

function drawPromptStroke(context: CanvasRenderingContext2D, points: SelectionPoint[], canvasWidth: number) {
  if (points.length === 0) return;

  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(8, canvasWidth / 32);
  context.strokeStyle = 'rgba(22, 199, 132, 0.88)';
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  for (const point of points.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  if (points.length === 1) {
    context.arc(points[0].x, points[0].y, Math.max(8, canvasWidth / 38), 0, Math.PI * 2);
  }

  context.stroke();
}

function drawEditablePreview(canvas: HTMLCanvasElement, frame: ImageData, mask: Uint8Array, view: ViewTransform) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const output = new ImageData(new Uint8ClampedArray(frame.data), frame.width, frame.height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    output.data[pixel * 4 + 3] = mask[pixel] ? 255 : 0;
  }

  const buffer = document.createElement('canvas');
  buffer.width = frame.width;
  buffer.height = frame.height;
  const bufferContext = buffer.getContext('2d');
  if (!bufferContext) return;
  bufferContext.putImageData(output, 0, 0);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(view.offsetX, view.offsetY);
  context.scale(view.scale, view.scale);
  context.drawImage(buffer, 0, 0);
  context.restore();
}

function getCanvasRelativePoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): SelectionPoint {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
  };
}

function screenToImagePoint(point: Point, view: ViewTransform): SelectionPoint {
  return {
    x: (point.x - view.offsetX) / view.scale,
    y: (point.y - view.offsetY) / view.scale,
  };
}

function getPinchStart(pointers: Map<number, Point>, view: ViewTransform) {
  const points = Array.from(pointers.values()).slice(0, 2);
  return {
    distance: getDistance(points[0], points[1]),
    midpoint: getMidpoint(points[0], points[1]),
    view,
  };
}

function getNextPinchView(pointers: Map<number, Point>, start: { distance: number; midpoint: Point; view: ViewTransform }): ViewTransform {
  const points = Array.from(pointers.values()).slice(0, 2);
  const distance = getDistance(points[0], points[1]);
  const midpoint = getMidpoint(points[0], points[1]);
  const nextScale = Math.max(1, Math.min(6, start.view.scale * (distance / Math.max(1, start.distance))));

  return {
    scale: nextScale,
    offsetX: midpoint.x - ((start.midpoint.x - start.view.offsetX) / start.view.scale) * nextScale,
    offsetY: midpoint.y - ((start.midpoint.y - start.view.offsetY) / start.view.scale) * nextScale,
  };
}

function getDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getMidpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}
