const BASE_PATH = "/exposure-tristar";

export default function PlayerPhoto({
  photo,
  name,
  size = 56,
}: {
  photo?: string;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${BASE_PATH}/players/${photo}`}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-white/10 flex-shrink-0"
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
