"use client";

import { useEffect, useRef } from "react";
import { PALETTE_COLORS } from "../_data/paletteColors";

type DiamondState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRotation: number;
};

const DIAMOND_COUNT = 3;
const DIAMOND_SIZE = 86;

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

const TILE_COLORS = Array.from({ length: DIAMOND_COUNT }).map((_, index) => {
  const rand = seededRandom(index + 21);
  return (
    PALETTE_COLORS[Math.floor(rand() * PALETTE_COLORS.length)] ?? "#f5efe5"
  );
});

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createState(width: number, height: number): DiamondState {
  return {
    x: randomBetween(0, Math.max(0, width - DIAMOND_SIZE)),
    y: randomBetween(0, Math.max(0, height - DIAMOND_SIZE)),
    vx: randomBetween(-0.7, 0.7),
    vy: randomBetween(-0.7, 0.7),
    rotation: randomBetween(-12, 12),
    vRotation: randomBetween(-0.12, 0.12),
  };
}

export default function FloatingDiamonds() {
  const anchorsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const nodes = anchorsRef.current.filter(
      (node): node is HTMLAnchorElement => Boolean(node)
    );
    if (!nodes.length) {
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    const states = nodes.map(() => createState(width, height));

    const animate = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      nodes.forEach((node, index) => {
        const state = states[index];
        if (!state) {
          return;
        }

        state.vx += randomBetween(-0.04, 0.04);
        state.vy += randomBetween(-0.04, 0.04);
        state.vx = Math.max(-1.2, Math.min(1.2, state.vx));
        state.vy = Math.max(-1.2, Math.min(1.2, state.vy));
        state.x += state.vx;
        state.y += state.vy;
        state.rotation += state.vRotation;

        if (state.x > width + DIAMOND_SIZE) {
          state.x = -DIAMOND_SIZE;
        }
        if (state.x < -DIAMOND_SIZE) {
          state.x = width + DIAMOND_SIZE;
        }
        if (state.y > height + DIAMOND_SIZE) {
          state.y = -DIAMOND_SIZE;
        }
        if (state.y < -DIAMOND_SIZE) {
          state.y = height + DIAMOND_SIZE;
        }

        node.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rotation}deg)`;
      });

      animationRef.current = window.requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    animationRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const studybookUrl = "https://studybook.eth.link";

  return (
    <>
      {Array.from({ length: DIAMOND_COUNT }).map((_, index) => (
        <a
          key={`diamond-${index}`}
          ref={(node) => {
            anchorsRef.current[index] = node;
          }}
          className="floating-tile"
          href={studybookUrl}
          aria-label="Open Studybook"
          style={{ backgroundColor: TILE_COLORS[index] }}
        />
      ))}
    </>
  );
}
