import { useEffect, useRef, useState } from 'react';
import { SettingsStep } from './components/SettingsStep';
import { SelectionStep } from './components/SelectionStep';
import { ProcessingStep } from './components/ProcessingStep';
import { ResultStep } from './components/ResultStep';
import { UploadStep } from './components/UploadStep';
import { encodeTransparentGif, type GifFrame } from './domain/gif';
import { saveHistoryItem, listHistory, type HistoryItem } from './domain/history';
import { applyMaskToImageData } from './domain/mask';
import type { SelectionRect } from './domain/selection';
import { type ExportSettings } from './domain/settings';
import { captureFirstFrame, extractVideoFrames, loadVideoMetadata, validateVideoMetadata } from './domain/video';
import { createInteractiveSegmenter } from './mediapipe/interactiveSegmenter';

type WorkflowStep = 'upload' | 'select' | 'settings' | 'processing' | 'result';

type ProgressState = {
  phase: string;
  progress: number;
};

export function App() {
  const [step, setStep] = useState<WorkflowStep>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [firstFrame, setFirstFrame] = useState<ImageData | null>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [settings, setSettings] = useState<ExportSettings | null>(null);
  const [progress, setProgress] = useState<ProgressState>({ phase: '准备中', progress: 0 });
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    listHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  async function handleVideoSelected(file: File) {
    setError(null);

    try {
      const metadata = await loadVideoMetadata(file);
      const validation = validateVideoMetadata(metadata);
      if (!validation.ok) {
        setError(validation.message);
        return;
      }

      const frame = await captureFirstFrame(file);
      setVideoFile(file);
      setFirstFrame(frame);
      setSelection(null);
      setStep('select');
    } catch (event) {
      setError(event instanceof Error ? event.message : '无法读取这个视频。');
    }
  }

  async function processVideo(nextSettings: ExportSettings) {
    if (!videoFile || !selection) return;

    cancelRef.current = false;
    setSettings(nextSettings);
    setProgress({ phase: '准备模型', progress: 4 });
    setStep('processing');

    let segmenter: Awaited<ReturnType<typeof createInteractiveSegmenter>> | null = null;

    try {
      const frames = await extractVideoFrames(videoFile, nextSettings);
      if (cancelRef.current) {
        setStep('settings');
        return;
      }

      segmenter = await createInteractiveSegmenter();
      const gifFrames: GifFrame[] = [];

      for (let index = 0; index < frames.length; index += 1) {
        if (cancelRef.current) {
          setStep('settings');
          return;
        }

        const frame = frames[index];
        const frameSelection = scaleSelection(selection, firstFrame, frame.imageData);
        const canvas = imageDataToCanvas(frame.imageData);
        setProgress({
          phase: `正在抠图 ${index + 1}/${frames.length}`,
          progress: 10 + (index / Math.max(1, frames.length)) * 70,
        });
        const mask = await segmenter.segmentFrame(canvas, frameSelection);
        gifFrames.push({
          imageData: applyMaskToImageData(frame.imageData, mask, nextSettings.quality === 'high' ? 0.42 : 0.5),
          delayMs: Math.round(1000 / nextSettings.fps),
        });
      }

      setProgress({ phase: '正在生成 GIF', progress: 88 });
      const blob = encodeTransparentGif(gifFrames);
      const url = URL.createObjectURL(blob);
      const item = {
        ...nextSettings,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        blob,
      };

      await saveHistoryItem(item);
      const items = await listHistory();
      setHistory(items);
      setResultUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      setProgress({ phase: '完成', progress: 100 });
      setStep('result');
    } catch (event) {
      setError(event instanceof Error ? event.message : '处理失败，请降低尺寸或帧率后重试。');
      setStep('settings');
    } finally {
      segmenter?.close();
    }
  }

  return (
    <main className="app-shell">
      <div className="tool-panel">
        {step === 'upload' ? <UploadStep error={error} onVideoSelected={handleVideoSelected} /> : null}
        {step === 'select' && firstFrame ? (
          <SelectionStep
            frame={firstFrame}
            onBack={() => setStep('upload')}
            onConfirm={(nextSelection) => {
              setSelection(nextSelection);
              setStep('settings');
            }}
          />
        ) : null}
        {step === 'settings' ? (
          <SettingsStep
            onBack={() => setStep('select')}
            onStart={(nextSettings) => {
              void processVideo(nextSettings);
            }}
          />
        ) : null}
        {step === 'processing' ? (
          <ProcessingStep
            phase={progress.phase}
            progress={progress.progress}
            onCancel={() => {
              cancelRef.current = true;
            }}
          />
        ) : null}
        {step === 'result' && resultUrl ? (
          <ResultStep
            resultUrl={resultUrl}
            history={history}
            onRetry={() => setStep('select')}
            onNewVideo={() => {
              setVideoFile(null);
              setFirstFrame(null);
              setSelection(null);
              setSettings(null);
              setStep('upload');
            }}
          />
        ) : null}
        {error && step !== 'upload' ? <p className="error-text floating-error">{error}</p> : null}
        {settings ? <span className="sr-only">{settings.fps}</span> : null}
      </div>
    </main>
  );
}

function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available.');
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function scaleSelection(
  selection: SelectionRect,
  sourceFrame: ImageData | null,
  targetFrame: ImageData,
): SelectionRect {
  if (!sourceFrame) return selection;

  const scaleX = targetFrame.width / sourceFrame.width;
  const scaleY = targetFrame.height / sourceFrame.height;
  return {
    x: selection.x * scaleX,
    y: selection.y * scaleY,
    width: selection.width * scaleX,
    height: selection.height * scaleY,
  };
}
