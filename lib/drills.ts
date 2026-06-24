export type RawDrillRow = {
  Id: string;
  Name: string;
  Description?: string;
  VideoUrl: string;
  CreatedAt?: string;
};

// Accepts any of the common YouTube link shapes a coach might paste in
// (watch?v=, youtu.be/, embed/, shorts/) and returns an embeddable URL.
// Falls back to the raw URL as-is if it's not a recognizable YouTube link
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
  return trimmed;
}
