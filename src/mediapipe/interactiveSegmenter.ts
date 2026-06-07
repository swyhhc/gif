import { FilesetResolver, InteractiveSegmenter, type InteractiveSegmenterResult } from '@mediapipe/tasks-vision';
import { getSelectionCenter, type SelectionRect, type SubjectPrompt } from '../domain/selection';

export const MEDIAPIPE_TASKS_VERSION = '0.10.35';
export function getVisionWasmUrl() {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VERSION}/wasm`;
}

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite';

type SegmentableImage = HTMLCanvasElement | HTMLImageElement | ImageBitmap;

export type SegmenterAdapter = {
  segmentFrame(image: SegmentableImage, prompt: SubjectPrompt): Promise<Float32Array>;
  close(): void;
};

function getImageSize(image: SegmentableImage) {
  if (image instanceof ImageBitmap) {
    return { width: image.width, height: image.height };
  }

  return { width: image.width, height: image.height };
}

export async function createInteractiveSegmenter(): Promise<SegmenterAdapter> {
  const vision = await FilesetResolver.forVisionTasks(getVisionWasmUrl());
  const segmenter = await InteractiveSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU',
    },
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });

  return {
    async segmentFrame(image, prompt) {
      const size = getImageSize(image);
      const roi =
        prompt.points.length > 1
          ? {
              scribble: prompt.points.map((point) => ({
                x: point.x / size.width,
                y: point.y / size.height,
              })),
            }
          : { keypoint: getSelectionCenter(prompt.bounds, size.width, size.height) };
      const result = await new Promise<InteractiveSegmenterResult>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => reject(new Error('Segmentation timed out.')), 30_000);

        segmenter.segment(image, roi, (segmenterResult) => {
          window.clearTimeout(timeoutId);
          resolve(segmenterResult);
        });
      });

      const mask = result.categoryMask;
      if (!mask) {
        throw new Error('Segmentation did not return a mask.');
      }

      const values = mask.getAsFloat32Array();
      mask.close();
      return values;
    },
    close() {
      segmenter.close();
    },
  };
}
