import { extractFromPdf } from '../extractors/pdfExtractor';
import { extractFromDocx } from '../extractors/docxExtractor';
import { extractSocialMetadata } from '../extractors/socialLinkExtractor';

/**
 * Text Extraction Service (Phase 18)
 * Consolidates all text extraction logic for different content types.
 */
export const extractText = async (
  contentType: string,
  data: any
): Promise<string> => {
  let text = '';

  switch (contentType) {
    case 'pdf':
      // data is filePath
      const pdfResult = await extractFromPdf(data);
      text = pdfResult.text;
      break;

    case 'docx':
      // data is filePath
      const docxResult = await extractFromDocx(data);
      text = docxResult.text;
      break;

    case 'social_link':
      // data is metadata object or URL
      if (typeof data === 'string') {
        const metadata = await extractSocialMetadata(data);
        text = `${metadata.title || ''}\n${metadata.og_description || ''}`;
      } else {
        text = `${data.title || ''}\n${data.og_description || ''}`;
      }
      break;

    default:
      text = '';
  }

  // Clean up text: normalize whitespace
  return text.replace(/\s+/g, ' ').trim();
};
