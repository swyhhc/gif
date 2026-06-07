import { useEffect, useRef, useState } from 'react';
import {
  clampSelection,
  hasUsableSelection,
  normalizeSelection,
  type SelectionRect,
} from '../domain/selection';

type SelectionStepProps = {
  frame: ImageData;
  onBack(): void;
  onConfirm(selection: SelectionRect): void;
};

type Point = {
  x: number;
  y: number;
};

export function SelectionStep({ frame, onBack, onConfirm }: SelectionStepProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [start, setStart] = useState<Point | null>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = frame.width;
    canvas.height = frame.height;
    drawSelectionCanvas(canvas, frame, selection);
  }, [frame, selection]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const confirmedSelection = selection ? clampSelection(normalizeSelection(selection), frame.width, frame.height) : null;

  return (
    <section className="step-panel">
      <div className="step-heading">
        <p className="eyebrow">第一帧</p>
        <h1>框选主体</h1>
      </div>
      <canvas
        ref={canvasRef}
        className="selection-canvas"
        onPointerDown={(event) => {
          const point = getCanvasPoint(event);
          setStart(point);
          setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
        }}
        onPointerMove={(event) => {
          if (!start) return;
          const point = getCanvasPoint(event);
          setSelection({ x: start.x, y: start.y, width: point.x - start.x, height: point.y - start.y });
        }}
        onPointerUp={() => setStart(null)}
      />
      <p className="hint-text">用手指拖一个框，把想保留的人或物圈进去。</p>
      <div className="button-row">
        <button className="secondary-button" type="button" onClick={onBack}>
          返回
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={!confirmedSelection || !hasUsableSelection(confirmedSelection)}
          onClick={() => confirmedSelection && onConfirm(confirmedSelection)}
        >
          确认主体
        </button>
      </div>
    </section>
  );
}

function drawSelectionCanvas(canvas: HTMLCanvasElement, frame: ImageData, selection: SelectionRect | null) {
  const context = canvas.getContext('2d');
  if (!context) return;

  context.putImageData(frame, 0, 0);

  if (!selection) return;

  const rect = clampSelection(normalizeSelection(selection), canvas.width, canvas.height);
  context.fillStyle = 'rgba(0, 0, 0, 0.28)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.putImageData(frame, 0, 0, rect.x, rect.y, rect.width, rect.height);
  context.strokeStyle = '#16c784';
  context.lineWidth = Math.max(2, canvas.width / 140);
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
}
