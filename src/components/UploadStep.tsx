type UploadStepProps = {
  error: string | null;
  onVideoSelected(file: File): void;
};

export function UploadStep({ error, onVideoSelected }: UploadStepProps) {
  return (
    <section className="step-panel">
      <div>
        <p className="eyebrow">手机端本地处理</p>
        <h1>透明动图工具</h1>
        <p className="intro">上传 10 秒以内视频，框选主体，导出透明 GIF。</p>
      </div>
      <label className="upload-target">
        <input
          className="file-input"
          type="file"
          accept="video/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onVideoSelected(file);
            }
          }}
        />
        <span>选择视频</span>
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <p className="hint-text">视频不会上传到服务器，所有处理都在当前浏览器内完成。</p>
    </section>
  );
}
