export type RawDrillRow = {
  Id: string;
  Name: string;
  Description?: string;
  VideoUrl: string;
  CreatedAt?: string;
};

// Accepts any of the common YouTube link shapes a coach might paste in
// (watch?v=, youtu.be/, embed/, shorts/) and returns an embeddable URL.
// Facebook video pages refuse to load in an iframe directly, so those go
// through Facebook's video plugin endpoint instead, which is iframe-safe.
// Falls back to the raw URL as-is if it's not a recognizable link
// (e.g. a direct video file or another host), so embedding still works.
export function toEmbedUrl(videoUrl: string): string {
  const trimmed = videoUrl.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/,
  ];
  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  if (/(?:facebook\.com|fb\.watch)/.test(trimmed)) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=false`;
  }
  return trimmed;
}
