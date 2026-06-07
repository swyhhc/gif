import { useState } from 'react';
import { EXPORT_PRESETS, validateExportSettings, type ExportSettings } from '../domain/settings';

type SettingsStepProps = {
  onBack(): void;
  onStart(settings: ExportSettings): void;
};

const sizes = [240, 320, 480] as const;
const rates = [6, 8, 12] as const;

export function SettingsStep({ onBack, onStart }: SettingsStepProps) {
  const [settings, setSettings] = useState<ExportSettings>(EXPORT_PRESETS.default);
  const [error, setError] = useState<string | null>(null);

  function update(partial: Partial<ExportSettings>) {
    setSettings((current) => ({ ...current, ...partial }));
    setError(null);
  }

  function start() {
    const validation = validateExportSettings(settings);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    onStart(validation.settings);
  }

  return (
    <section className="step-panel">
      <div className="step-heading">
        <p className="eyebrow">导出设置</p>
        <h1>选择清晰度</h1>
      </div>
      <ControlGroup label="尺寸">
        {sizes.map((size) => (
          <button
            className={settings.longestEdge === size ? 'segmented active' : 'segmented'}
            type="button"
            key={size}
            onClick={() => update({ longestEdge: size })}
          >
            {size}px
          </button>
        ))}
      </ControlGroup>
      <ControlGroup label="帧率">
        {rates.map((fps) => (
          <button
            className={settings.fps === fps ? 'segmented active' : 'segmented'}
            type="button"
            key={fps}
            onClick={() => update({ fps })}
          >
            {fps}fps
          </button>
        ))}
      </ControlGroup>
      <ControlGroup label="质量">
        <button
          className={settings.quality === 'standard' ? 'segmented active' : 'segmented'}
          type="button"
          onClick={() => update({ quality: 'standard' })}
        >
          标准
        </button>
        <button
          className={settings.quality === 'high' ? 'segmented active' : 'segmented'}
          type="button"
          onClick={() => update({ quality: 'high' })}
        >
          高质量
        </button>
      </ControlGroup>
      <p className="hint-text">默认 6fps 更稳。动作很多时可以手动调到 8fps 或 12fps。</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="button-row">
        <button className="secondary-button" type="button" onClick={onBack}>
          返回
        </button>
        <button className="primary-button" type="button" onClick={start}>
          开始处理
        </button>
      </div>
    </section>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="control-group">
      <span>{label}</span>
      <div className="segmented-row">{children}</div>
    </div>
  );
}
