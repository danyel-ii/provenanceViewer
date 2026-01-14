"use client";

import { useEffect } from "react";

import { withBasePath } from "../_lib/basePath";

type PaletteManifestEntry = {
  palette_id?: string;
  hex_colors?: string[];
  used_hex_colors?: string[];
};

const FALLBACK_COLORS = ["#66D9EF", "#FFD93D", "#FF6B9D", "#A8E6CF"];
const IGNORED_HEX = new Set(["#000000", "#000000FF"]);

function normalizeHex(value: string) {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed.startsWith("#")) {
    return `#${trimmed}`;
  }
  return trimmed;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex).replace("#", "");
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }
  const value = normalized.padEnd(6, "0");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[r, g, b]
    .map((value) => clamp(value).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function mixColors(a: string, b: string, amount: number) {
  const safeAmount = Math.max(0, Math.min(1, amount));
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  return rgbToHex({
    r: rgbA.r + (rgbB.r - rgbA.r) * safeAmount,
    g: rgbA.g + (rgbB.g - rgbA.g) * safeAmount,
    b: rgbA.b + (rgbB.b - rgbA.b) * safeAmount,
  });
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function ensureReadableBackground(color: string, minLuminance = 0.35) {
  const lum = relativeLuminance(color);
  if (lum >= minLuminance) {
    return color;
  }
  return mixColors(color, "#FFFFFF", 0.6);
}

function ensureLightBackground(color: string, minLuminance = 0.75) {
  const lum = relativeLuminance(color);
  if (lum >= minLuminance) {
    return color;
  }
  return mixColors(color, "#FFFFFF", 0.72);
}

function pickPaletteColors(entry: PaletteManifestEntry) {
  const raw = entry.hex_colors?.length
    ? entry.hex_colors
    : entry.used_hex_colors ?? [];
  const normalized = raw
    .map((value) => normalizeHex(value))
    .filter((value) => value && !IGNORED_HEX.has(value));
  return Array.from(new Set(normalized));
}

function pickRandomPalette(entries: PaletteManifestEntry[]) {
  if (!entries.length) {
    return { paletteId: "fallback", colors: FALLBACK_COLORS };
  }
  const entry = entries[Math.floor(Math.random() * entries.length)];
  const colors = pickPaletteColors(entry);
  const resolved =
    colors.length >= 4
      ? colors.slice(0, 4)
      : [...colors, ...FALLBACK_COLORS].slice(0, 4);
  return { paletteId: entry.palette_id ?? "random", colors: resolved };
}

export default function PaletteRandomizer() {
  useEffect(() => {
    let cancelled = false;

    const applyPalette = (palette: { paletteId: string; colors: string[] }) => {
      if (cancelled) {
        return;
      }
      const container = document.querySelector<HTMLElement>(".landing-home");
      if (!container) {
        return;
      }

      const colors = palette.colors;
      const lightest = colors.reduce((current, next) =>
        relativeLuminance(next) > relativeLuminance(current) ? next : current
      );

      const bg = ensureLightBackground(lightest);
      const surface = mixColors(bg, "#FFFFFF", 0.35);

      const primary = ensureReadableBackground(colors[0] ?? FALLBACK_COLORS[0]);
      const secondary = ensureReadableBackground(colors[1] ?? FALLBACK_COLORS[1]);
      const accent = ensureReadableBackground(colors[2] ?? FALLBACK_COLORS[2]);
      const mint = ensureReadableBackground(colors[3] ?? FALLBACK_COLORS[3]);

      const gridBase = colors.reduce((current, next) =>
        relativeLuminance(next) < relativeLuminance(current) ? next : current
      );
      const { r, g, b } = hexToRgb(gridBase);
      const grid = `rgba(${r}, ${g}, ${b}, 0.08)`;

      container.style.setProperty("--neo-bg", bg);
      container.style.setProperty("--neo-surface", surface);
      container.style.setProperty("--neo-primary", primary);
      container.style.setProperty("--neo-secondary", secondary);
      container.style.setProperty("--neo-accent", accent);
      container.style.setProperty("--neo-mint", mint);
      container.style.setProperty("--neo-grid", grid);
      container.dataset.paletteId = palette.paletteId;
    };

    const loadPalette = async () => {
      try {
        const response = await fetch(withBasePath("/palette_outputs/manifest.json"));
        if (!response.ok) {
          applyPalette({ paletteId: "fallback", colors: FALLBACK_COLORS });
          return;
        }
        const entries = (await response.json()) as PaletteManifestEntry[];
        applyPalette(pickRandomPalette(entries));
      } catch {
        applyPalette({ paletteId: "fallback", colors: FALLBACK_COLORS });
      }
    };

    loadPalette();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
