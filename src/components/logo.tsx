import Image from "next/image";

interface LogoProps {
  height?: number;
  className?: string;
}

export function Logo({ height = 40, className }: LogoProps) {
  return (
    <Image
      src="/logo-rb.png"
      alt="Ride & Bill"
      width={Math.round(height * 2.4)}
      height={height}
      className={className ?? ""}
      priority
    />
  );
}
