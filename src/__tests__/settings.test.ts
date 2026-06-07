import { describe, expect, it } from 'vitest';
import { EXPORT_PRESETS, validateExportSettings } from '../domain/settings';

describe('export settings', () => {
  it('accepts the default transparent GIF preset', () => {
    expect(validateExportSettings(EXPORT_PRESETS.default)).toEqual({
      ok: true,
      settings: EXPORT_PRESETS.default,
    });
  });

  it('keeps the default preset conservative for mobile phones', () => {
    expect(EXPORT_PRESETS.default).toEqual({
      format: 'gif',
      longestEdge: 320,
      fps: 6,
      quality: 'standard',
    });
  });

  it('allows manually selected high-motion 12 fps', () => {
    expect(validateExportSettings(EXPORT_PRESETS.smoothMotion)).toEqual({
      ok: true,
      settings: EXPORT_PRESETS.smoothMotion,
    });
  });

  it('rejects 720px because the MVP max is 480px', () => {
    expect(validateExportSettings({ format: 'gif', longestEdge: 720, fps: 8, quality: 'high' })).toEqual({
      ok: false,
      message: '清晰度最高支持 480px。',
    });
  });

  it('rejects unsupported frame rates', () => {
    expect(validateExportSettings({ format: 'gif', longestEdge: 320, fps: 24, quality: 'standard' })).toEqual({
      ok: false,
      message: '帧率请选择 6、8 或 12 fps。',
    });
  });
});
