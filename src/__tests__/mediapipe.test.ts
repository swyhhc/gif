import { describe, expect, it } from 'vitest';
import { MEDIAPIPE_TASKS_VERSION, getVisionWasmUrl } from '../mediapipe/interactiveSegmenter';

describe('mediapipe config', () => {
  it('uses the installed tasks-vision version for wasm assets', () => {
    expect(MEDIAPIPE_TASKS_VERSION).toBe('0.10.35');
    expect(getVisionWasmUrl()).toBe('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm');
  });
});
