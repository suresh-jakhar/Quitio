import httpClient from '../utils/httpClient';
import { extractMetadata } from '../utils/metadataParser';

export interface SocialMetadata {
  url: string;
  platform: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  title?: string;
}

export function detectPlatform(url: string): string {
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter';
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('linkedin.com')) {
    return 'linkedin';
  }
  if (url.includes('instagram.com')) {
    return 'instagram';
  }
  return 'generic';
}

export async function extractSocialMetadata(url: string): Promise<SocialMetadata> {
  try {
    const response = await httpClient.get(url);
    const html = response.data;
    const metadata = extractMetadata(html);
    const platform = detectPlatform(url);

    return {
      url,
      platform,
      og_title: metadata.og_title,
      og_description: metadata.og_description,
      og_image: metadata.og_image,
      title: metadata.og_title || metadata.title || 'Untitled',
    };
  } catch (error: any) {
    console.error('Failed to extract metadata:', error);
    throw error;
  }
}
