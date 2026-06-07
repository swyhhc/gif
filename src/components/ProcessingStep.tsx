type ProcessingStepProps = {
  phase: string;
  progress: number;
  onCancel(): void;
};

export function ProcessingStep({ phase, progress, onCancel }: ProcessingStepProps) {
  return (
    <section className="step-panel">
      <div className="step-heading">
        <p className="eyebrow">正在处理</p>
        <h1>{phase}</h1>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
      <p className="hint-text">{Math.round(progress)}%</p>
      <button className="secondary-button full-width" type="button" onClick={onCancel}>
        取消
      </button>
    </section>
  );
}
