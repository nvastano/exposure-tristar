export default function Logo({ size = 64 }: { size?: number }) {
  return (
    <img
      src="/te-logo.png"
      alt="Team Elite Prime logo"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", filter: "brightness(0) invert(1)" }}
    />
  );
}
