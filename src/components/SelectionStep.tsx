import { useEffect, useRef, useState } from 'react';
import {
  clampSelection,
  createSelectionFromPoint,
  hasUsableSelection,
  normalizeSelection,
  type SelectionRect,
} from '../domain/selection';

type SelectionStepProps = {
  frame: ImageData;
  previewUrl: string | null;
  previewStatus: string | null;
  previewError: string | null;
  onBack(): void;
  onSelectionChange(): void;
  onPreview(selection: SelectionRect): void;
  onConfirm(selection: SelectionRect): void;
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
  onBack,
  onSelectionChange,
  onPreview,
  onConfirm,
}: SelectionStepProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [start, setStart] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
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
          setSelection(createSelectionFromPoint(point, frame.width, frame.height));
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!start) return;
          const point = getCanvasPoint(event);
          const distance = Math.hypot(point.x - start.x, point.y - start.y);

          if (distance < 10 && !dragging) return;

          setDragging(true);
          setSelection(
            clampSelection(
              normalizeSelection({ x: start.x, y: start.y, width: point.x - start.x, height: point.y - start.y }),
              frame.width,
              frame.height,
            ),
          );
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
        <div className="checkerboard preview-box compact-preview">
          <img src={previewUrl} alt="主体抠图预览" />
        </div>
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
            if (!confirmedSelection) return;
            if (previewUrl) {
              onConfirm(confirmedSelection);
            } else {
              onPreview(confirmedSelection);
            }
          }}
        >
          {previewUrl ? '满意，继续' : '生成抠图预览'}
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
