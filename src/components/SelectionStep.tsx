import { useEffect, useRef, useState } from 'react';
import {
  clampSelection,
  createSelectionFromPoint,
  hasUsableSelection,
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

  const confirmedSelection = selection ? clampSelection(selection, frame.width, frame.height) : null;

  return (
    <section className="step-panel">
      <div className="step-heading">
        <p className="eyebrow">第一帧</p>
        <h1>点一下主体</h1>
      </div>
      <canvas
        ref={canvasRef}
        className="selection-canvas"
        onPointerDown={(event) => {
          const point = getCanvasPoint(event);
          setSelection(createSelectionFromPoint(point, frame.width, frame.height));
        }}
      />
      <p className="hint-text">点在要保留的人或物上，系统会用这个位置识别主体。</p>
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

  const rect = clampSelection(selection, canvas.width, canvas.height);
  context.fillStyle = 'rgba(0, 0, 0, 0.28)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.putImageData(frame, 0, 0, rect.x, rect.y, rect.width, rect.height);
  context.strokeStyle = '#16c784';
  context.lineWidth = Math.max(2, canvas.width / 140);
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  context.beginPath();
  context.arc(rect.x + rect.width / 2, rect.y + rect.height / 2, Math.max(6, canvas.width / 70), 0, Math.PI * 2);
  context.fillStyle = '#16c784';
  context.fill();
}
