import type { HistoryItem } from '../domain/history';

type ResultStepProps = {
  resultUrl: string;
  history: HistoryItem[];
  onRetry(): void;
  onNewVideo(): void;
};

export function ResultStep({ resultUrl, history, onRetry, onNewVideo }: ResultStepProps) {
  return (
    <section className="step-panel">
      <div className="step-heading">
        <p className="eyebrow">已完成</p>
        <h1>透明 GIF</h1>
      </div>
      <div className="checkerboard preview-box">
        <img src={resultUrl} alt="透明 GIF 预览" />
      </div>
      <a className="primary-button download-link" href={resultUrl} download="transparent-gif.gif">
        保存 GIF
      </a>
      <div className="button-row">
        <button className="secondary-button" type="button" onClick={onRetry}>
          重新框选
        </button>
        <button className="secondary-button" type="button" onClick={onNewVideo}>
          新视频
        </button>
      </div>
      {history.length > 0 ? (
        <div className="history-list">
          <p className="section-label">最近记录</p>
          {history.map((item) => (
            <div className="history-item" key={item.id}>
              <span>{item.longestEdge}px / {item.fps}fps</span>
              <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
