import fs from 'fs';
import path from 'path';

/**
 * Delete a temporary uploaded file after processing.
 * Errors are swallowed so they don't abort the main request flow.
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`[storageService] Failed to delete temp file: ${filePath}`, err);
  }
}

/**
 * Return the byte size of a file on disk.
 */
export function getFileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

/**
 * In production this would upload to S3 / GCS.
 * For development we keep files in the temp directory and return a relative path.
 * This function is a stub that can be extended later.
 */
export async function storeFile(tempPath: string): Promise<string> {
  // Development: return the temp path as-is
  return tempPath;
}
