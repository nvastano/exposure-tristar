export type Drill = {
  key: string;
  name: string;
  description?: string;
  youtubeId: string;
};

// Test placeholders — swap in real drill videos once the coaches send the list.
// youtubeId is the part after "v=" in a YouTube URL (or the share-link id).
export const DRILLS: Drill[] = [
  {
    key: "tee-work",
    name: "Tee Work",
    description: "Placeholder video — swap in the real Tee Work demo.",
    youtubeId: "dQw4w9WgXcQ",
  },
  {
    key: "long-toss",
    name: "Long Toss",
    description: "Placeholder video — swap in the real Long Toss demo.",
    youtubeId: "dQw4w9WgXcQ",
  },
  {
    key: "fielding-footwork",
    name: "Fielding Footwork",
    description: "Placeholder video — swap in the real Fielding Footwork demo.",
    youtubeId: "dQw4w9WgXcQ",
  },
];
