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

function normalizeUrl(inputUrl: string): string {
  return new URL(inputUrl.trim()).toString();
}

function buildFallbackMetadata(url: string, platform: string): SocialMetadata {
  return {
    url,
    platform,
    title: platform.charAt(0).toUpperCase() + platform.slice(1),
  };
}

async function fetchYouTubeMetadata(url: string): Promise<SocialMetadata> {
  const response = await httpClient.get('https://www.youtube.com/oembed', {
    params: {
      url,
      format: 'json',
    },
  });

  return {
    url,
    platform: 'youtube',
    og_title: response.data.title,
    og_description: response.data.author_name,
    og_image: response.data.thumbnail_url,
    title: response.data.title || 'Untitled',
  };
}

export async function extractSocialMetadata(url: string): Promise<SocialMetadata> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const platform = detectPlatform(normalizedUrl);

    if (platform === 'youtube') {
      try {
        return await fetchYouTubeMetadata(normalizedUrl);
      } catch (error) {
        console.warn('YouTube oEmbed fetch failed, falling back to generic metadata:', error);
        return buildFallbackMetadata(normalizedUrl, platform);
      }
    }

    const response = await httpClient.get(normalizedUrl);
    const html = response.data;
    const metadata = extractMetadata(html);

    return {
      url: normalizedUrl,
      platform,
      og_title: metadata.og_title,
      og_description: metadata.og_description,
      og_image: metadata.og_image,
      title: metadata.og_title || metadata.title || 'Untitled',
    };
  } catch (error: any) {
    console.error('Failed to extract metadata:', error);
    if (error instanceof TypeError || String(error?.message || '').includes('Invalid URL')) {
      throw error;
    }

    const platform = detectPlatform(url);
    return buildFallbackMetadata(url, platform);
  }
}
