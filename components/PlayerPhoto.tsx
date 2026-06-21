"use client";

import { useState } from "react";

const BASE_PATH = "/exposure-tristar";

function slugifyName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

export default function PlayerPhoto({
  name,
  size = 56,
}: {
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${BASE_PATH}/players/${slugifyName(name)}.jpg`}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-white/10 flex-shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/50 font-bold flex-shrink-0"
    >
      {initials || "?"}
    </div>
  );
}
