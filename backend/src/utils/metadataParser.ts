export interface ParsedMetadata {
  og_title?: string;
  og_description?: string;
  og_image?: string;
  title?: string;
  description?: string;
}

export function parseOgTag(html: string, tagName: string): string | undefined {
  const regex = new RegExp(
    `<meta\\s+property=["']${tagName}["']\\s+content=["']([^"']+)["']`,
    'i'
  );
  const match = html.match(regex);
  return match ? match[1] : undefined;
}

export function parseMetaTag(html: string, tagName: string): string | undefined {
  const regex = new RegExp(
    `<meta\\s+name=["']${tagName}["']\\s+content=["']([^"']+)["']`,
    'i'
  );
  const match = html.match(regex);
  return match ? match[1] : undefined;
}

export function parseTitle(html: string): string | undefined {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim() : undefined;
}

export function extractMetadata(html: string): ParsedMetadata {
  return {
    og_title: parseOgTag(html, 'og:title'),
    og_description: parseOgTag(html, 'og:description'),
    og_image: parseOgTag(html, 'og:image'),
    title: parseTitle(html) || parseMetaTag(html, 'title'),
    description: parseMetaTag(html, 'description'),
  };
}
