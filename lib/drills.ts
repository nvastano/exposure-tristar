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

// Drill videos can come from a pasted link (YouTube, Google Drive) or from a
// file uploaded directly through the site, which is stored as a Drive
// "preview" link. Direct video files (e.g. served from another host) need a
// <video> tag instead of an <iframe>, so callers need to know which kind a
// given URL is.
export function videoEmbed(videoUrl: string): { kind: "iframe" | "video"; src: string } {
  const trimmed = videoUrl.trim();
  if (/youtube\.com|youtu\.be/.test(trimmed)) {
    return { kind: "iframe", src: toEmbedUrl(trimmed) };
  }
  if (/drive\.google\.com/.test(trimmed)) {
    return { kind: "iframe", src: trimmed };
  }
  if (/\.(mp4|mov|webm|m4v|ogg)(\?.*)?$/i.test(trimmed)) {
    return { kind: "video", src: trimmed };
  }
  return { kind: "iframe", src: trimmed };
}
