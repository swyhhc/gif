import { describe, expect, it } from 'vitest';
import { MEDIAPIPE_TASKS_VERSION, getVisionWasmUrl } from '../mediapipe/interactiveSegmenter';

describe('mediapipe config', () => {
  it('loads wasm assets from the app origin', () => {
    expect(MEDIAPIPE_TASKS_VERSION).toBe('0.10.35');
    expect(getVisionWasmUrl()).toBe('/mediapipe/tasks-vision/wasm');
  });
});
