import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

export interface DocxExtractionResult {
  text: string;
  word_count: number;
  metadata: {
    title: string;
    file_size: number;
  };
}

/**
 * Extract text and metadata from a DOCX file.
 */
export async function extractFromDocx(filePath: string): Promise<DocxExtractionResult> {
  const stat = fs.statSync(filePath);
  
  const result = await mammoth.extractRawText({ path: filePath });
  const rawText = result.value || '';
  
  // Normalize extracted text
  const cleanText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Simple word count
  const wordCount = cleanText.split(/\s+/).filter((word: string) => word.length > 0).length;

  return {
    text: cleanText,
    word_count: wordCount,
    metadata: {
      title: path.basename(filePath, path.extname(filePath)) || 'Untitled',
      file_size: stat.size,
    },
  };
}
