import fs from 'fs';
import path from 'path';

import { PDFParse } from 'pdf-parse';


export interface PdfExtractionResult {
  text: string;
  page_count: number;
  metadata: {
    title: string;
    author: string;
    created_date: string | null;
    file_size: number;
  };
}

/**
 * Extract text and metadata from a PDF file.
 */
export async function extractFromPdf(filePath: string): Promise<PdfExtractionResult> {
  const fileBuffer = fs.readFileSync(filePath);
  const stat = fs.statSync(filePath);
  
  const parser = new PDFParse({ data: fileBuffer });
  const textResult = await parser.getText();
  const infoResult = await parser.getInfo();
  
  const data = {
    text: textResult.text,
    numpages: textResult.total,
    info: infoResult.info || {}
  };

  // Normalise extracted text: collapse excessive whitespace / blank lines
  const cleanText = (data.text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const info = data.info || {};

  return {
    text: cleanText,
    page_count: data.numpages || 0,
    metadata: {
      title: info.Title || path.basename(filePath, path.extname(filePath)) || 'Untitled',
      author: info.Author || 'Unknown',
      created_date: info.CreationDate ? String(info.CreationDate) : null,
      file_size: stat.size,
    },
  };
}
