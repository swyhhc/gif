import { FilesetResolver, InteractiveSegmenter, type InteractiveSegmenterResult } from '@mediapipe/tasks-vision';
import { getSelectionCenter, type SelectionRect } from '../domain/selection';

export const MEDIAPIPE_TASKS_VERSION = '0.10.35';
export function getVisionWasmUrl() {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VERSION}/wasm`;
}

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite';

type SegmentableImage = HTMLCanvasElement | HTMLImageElement | ImageBitmap;

export type SegmenterAdapter = {
  segmentFrame(image: SegmentableImage, selection: SelectionRect): Promise<Float32Array>;
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
    async segmentFrame(image, selection) {
      const size = getImageSize(image);
      const point = getSelectionCenter(selection, size.width, size.height);
      const result = await new Promise<InteractiveSegmenterResult>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => reject(new Error('Segmentation timed out.')), 30_000);

        segmenter.segment(image, { keypoint: { x: point.x, y: point.y } }, (segmenterResult) => {
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
