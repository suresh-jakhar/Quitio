import { useState, useRef } from 'react';

export interface UseFileUploadOptions {
  /** Accepted MIME types, e.g. ['application/pdf'] */
  allowedMimes?: string[];
  /** Maximum file size in bytes (default: 50 MB) */
  maxSizeBytes?: number;
}

export interface UseFileUploadResult {
  /** The currently selected file, or null */
  file: File | null;
  /** Validation / upload error message */
  error: string;
  /** 0–100 upload progress (simulated) */
  progress: number;
  /** Whether an upload is currently in progress */
  isUploading: boolean;
  /** Select a file programmatically */
  selectFile: (f: File) => void;
  /** Clear the selected file */
  clearFile: () => void;
  /** Wrap an async upload function to track progress */
  upload: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Ref to attach to a hidden <input type="file"> */
  inputRef: React.RefObject<HTMLInputElement>;
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export default function useFileUpload({
  allowedMimes = [],
  maxSizeBytes = DEFAULT_MAX_SIZE,
}: UseFileUploadOptions = {}): UseFileUploadResult {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const validate = (f: File): string | null => {
    if (allowedMimes.length > 0 && !allowedMimes.includes(f.type)) {
      return `Invalid file type. Allowed: ${allowedMimes.join(', ')}`;
    }
    if (f.size > maxSizeBytes) {
      const mb = (maxSizeBytes / 1024 / 1024).toFixed(0);
      return `File is too large. Maximum size is ${mb} MB.`;
    }
    return null;
  };

  const selectFile = (f: File) => {
    setError('');
    const validationError = validate(f);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(f);
    setProgress(0);
  };

  const clearFile = () => {
    setFile(null);
    setProgress(0);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const startProgressSimulation = () => {
    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8;
      });
    }, 200);
  };

  const stopProgressSimulation = (finalValue: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(finalValue);
  };

  const upload = async <T>(fn: () => Promise<T>): Promise<T> => {
    setIsUploading(true);
    setError('');
    startProgressSimulation();

    try {
      const result = await fn();
      stopProgressSimulation(100);
      return result;
    } catch (err: any) {
      stopProgressSimulation(0);
      const message = err.message || 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return { file, error, progress, isUploading, selectFile, clearFile, upload, inputRef };
}
