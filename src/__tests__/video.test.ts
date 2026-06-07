import { describe, expect, it } from 'vitest';
import { getFrameTimes, getPreviewFrameTime, getScaledSize, validateVideoMetadata } from '../domain/video';

describe('video validation', () => {
  it('accepts videos up to 10 seconds', () => {
    expect(validateVideoMetadata({ duration: 10, width: 1080, height: 1920 })).toEqual({ ok: true });
  });

  it('rejects videos longer than 10 seconds', () => {
    expect(validateVideoMetadata({ duration: 10.1, width: 1080, height: 1920 })).toEqual({
      ok: false,
      message: '视频最长支持 10 秒。',
    });
  });

  it('samples frame times by fps without exceeding duration', () => {
    expect(getFrameTimes(1, 6)).toEqual([0, 0.167, 0.333, 0.5, 0.667, 0.833]);
  });

  it('scales dimensions by longest edge', () => {
    expect(getScaledSize(1080, 1920, 320)).toEqual({ width: 180, height: 320 });
  });

  it('uses a near-start decoded frame for upload preview', () => {
    expect(getPreviewFrameTime(10)).toBe(0.05);
    expect(getPreviewFrameTime(0.04)).toBe(0.02);
  });
});
