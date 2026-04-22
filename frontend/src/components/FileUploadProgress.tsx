interface FileUploadProgressProps {
  /** 0–100 */
  progress: number;
  label?: string;
}

export default function FileUploadProgress({
  progress,
  label = 'Uploading…',
}: FileUploadProgressProps): JSX.Element {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="upload-progress" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className="upload-progress__header">
        <span className="upload-progress__label">{label}</span>
        <span className="upload-progress__percent">{Math.round(clamped)}%</span>
      </div>
      <div className="upload-progress__track">
        <div
          className="upload-progress__fill"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
