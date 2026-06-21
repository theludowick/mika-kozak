/**
 * Convert a Google Drive share link to a direct image URL.
 * Any other URL (already direct, empty) is returned unchanged.
 *
 * Drive share link formats handled:
 *   https://drive.google.com/file/d/<ID>/view?...
 *   https://drive.google.com/open?id=<ID>
 */
export function resizeImageUrl(url: string | null, size: string): string | null {
  if (!url) return null;
  return url.replace(/sz=w\d+/, `sz=${size}`);
}

export function normaliseImageUrl(raw: string | undefined, size = 'w400'): string | null {
  const url = (raw ?? '').trim();
  if (!url) return null;

  // Extract Drive file ID
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (match?.[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=${size}`;
  }

  return url;
}
