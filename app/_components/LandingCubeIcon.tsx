"use client";

import { useCallback, useMemo, useRef, type CSSProperties } from "react";
import LandingSketch from "./LandingSketch";
import { PALETTE_COLORS } from "../_data/paletteColors";

type CubeTile = {
  id: string;
  left: string;
  top: string;
  size: string;
  delay: string;
  color: string;
};

const CUBE_TILE_COUNT = 24;

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
}

export default function LandingCubeIcon() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tiles = useMemo<CubeTile[]>(() => {
    return Array.from({ length: CUBE_TILE_COUNT }).map((_, index) => {
      const rand = seededRandom(index + 7);
      const size = 14 + rand() * 18;
      return {
        id: `cube-tile-${index}`,
        left: `${12 + rand() * 64}%`,
        top: `${12 + rand() * 64}%`,
        size: `${size}px`,
        delay: `${rand() * 1.8}s`,
        color:
          PALETTE_COLORS[Math.floor(rand() * PALETTE_COLORS.length)] ??
          "#F5F2F2",
      };
    });
  }, []);

  const handleRotationChange = useCallback(
    (rotationX: number, rotationY: number) => {
      const node = containerRef.current;
      if (!node) {
        return;
      }
      const composite = (rotationX + rotationY) / 2;
      node.style.setProperty("--cube-rotation", `${composite}rad`);
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className="landing-cube-icon"
      data-cube-icon
      aria-hidden="true"
    >
      <LandingSketch onFaceChange={() => {}} onRotationChange={handleRotationChange} />
      <div className="cube-notes" aria-hidden="true">
        {tiles.map((tile) => (
          <span
            key={tile.id}
            className="cube-note"
            style={
              {
                left: tile.left,
                top: tile.top,
                width: tile.size,
                height: tile.size,
                backgroundColor: tile.color,
                animationDelay: tile.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
