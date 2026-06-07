export type ExportFormat = 'gif';
export type ExportQuality = 'standard' | 'high';

export type ExportSettings = {
  format: ExportFormat;
  longestEdge: 240 | 320 | 480;
  fps: 6 | 8 | 12;
  quality: ExportQuality;
};

export const EXPORT_PRESETS = {
  small: { format: 'gif', longestEdge: 240, fps: 6, quality: 'standard' },
  default: { format: 'gif', longestEdge: 320, fps: 6, quality: 'standard' },
  balancedMotion: { format: 'gif', longestEdge: 320, fps: 8, quality: 'standard' },
  highQuality: { format: 'gif', longestEdge: 480, fps: 6, quality: 'high' },
  smoothMotion: { format: 'gif', longestEdge: 320, fps: 12, quality: 'standard' },
} as const satisfies Record<string, ExportSettings>;

export type ValidationResult =
  | { ok: true; settings: ExportSettings }
  | { ok: false; message: string };

export function validateExportSettings(input: {
  format: string;
  longestEdge: number;
  fps: number;
  quality: string;
}): ValidationResult {
  if (input.format !== 'gif') {
    return { ok: false, message: '当前版本只支持透明 GIF。' };
  }

  if (![240, 320, 480].includes(input.longestEdge)) {
    return { ok: false, message: '清晰度最高支持 480px。' };
  }

  if (![6, 8, 12].includes(input.fps)) {
    return { ok: false, message: '帧率请选择 6、8 或 12 fps。' };
  }

  if (!['standard', 'high'].includes(input.quality)) {
    return { ok: false, message: '质量模式请选择标准或高质量。' };
  }

  return { ok: true, settings: input as ExportSettings };
}
