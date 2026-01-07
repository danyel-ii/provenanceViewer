"use client";

type CubixlesLogoProps = {
  className?: string;
};

export default function CubixlesLogo({ className }: CubixlesLogoProps) {
  return (
    <span className={["cubixles-logo", className].filter(Boolean).join(" ")}>
      cubixles_
    </span>
  );
}
