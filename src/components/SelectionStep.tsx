import { useEffect, useRef, useState } from 'react';
import {
  clampSelection,
  createPromptFromPoint,
  createPromptFromStroke,
  createSelectionFromPoint,
  hasUsableSelection,
  normalizeSelection,
  type SelectionPoint,
  type SelectionRect,
  type SubjectPrompt,
} from '../domain/selection';

type SelectionStepProps = {
  frame: ImageData;
  previewUrl: string | null;
  previewStatus: string | null;
  previewError: string | null;
  maskSettings: MaskSettings;
  onBack(): void;
  onSelectionChange(): void;
  onMaskSettingsChange(settings: MaskSettings): void;
  onPreview(prompt: SubjectPrompt): void;
  onConfirm(prompt: SubjectPrompt): void;
};

export type MaskSettings = {
  invert: boolean;
  threshold: number;
  edgeOffset: number;
};

type Point = {
  x: number;
  y: number;
};

export function SelectionStep({
  frame,
  previewUrl,
  previewStatus,
  previewError,
  maskSettings,
  onBack,
  onSelectionChange,
  onMaskSettingsChange,
  onPreview,
  onConfirm,
}: SelectionStepProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokePointsRef = useRef<SelectionPoint[]>([]);
  const [start, setStart] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [prompt, setPrompt] = useState<SubjectPrompt | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = frame.width;
    canvas.height = frame.height;
    drawSelectionCanvas(canvas, frame, prompt);
  }, [frame, prompt]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

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
          const point = getCanvasPoint(event);
          onSelectionChange();
          setStart(point);
          setDragging(false);
          strokePointsRef.current = [point];
          setPrompt(createPromptFromPoint(point, frame.width, frame.height));
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!start) return;
          const point = getCanvasPoint(event);
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
          <div className="checkerboard preview-box compact-preview">
            <img src={previewUrl} alt="主体抠图预览" />
          </div>
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
