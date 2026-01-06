"use client";

import { useEffect, useRef } from "react";

export default function FrostOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const strengthRef = useRef(1);
  const directionRef = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    let width = 0;
    let height = 0;
    let frostPattern: CanvasPattern | null = null;
    let veinPattern: CanvasPattern | null = null;

    const createFrostPatterns = () => {
      const size = 260;
      const noiseCanvas = document.createElement("canvas");
      noiseCanvas.width = size;
      noiseCanvas.height = size;
      const noiseCtx = noiseCanvas.getContext("2d");
      if (!noiseCtx) {
        return;
      }

      const imageData = noiseCtx.createImageData(size, size);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const seed = Math.random();
        const shade = 200 + Math.random() * 55;
        const alpha =
          seed > 0.985
            ? 200 + Math.random() * 55
            : seed > 0.92
              ? 90 + Math.random() * 120
              : Math.random() * 40;
        imageData.data[i] = shade;
        imageData.data[i + 1] = shade;
        imageData.data[i + 2] = 255;
        imageData.data[i + 3] = alpha;
      }
      noiseCtx.putImageData(imageData, 0, 0);

      noiseCtx.lineWidth = 0.6;
      for (let i = 0; i < 160; i += 1) {
        noiseCtx.strokeStyle = `rgba(210, 230, 255, ${0.2 + Math.random() * 0.45})`;
        noiseCtx.beginPath();
        const startX = Math.random() * size;
        const startY = Math.random() * size;
        const length = 18 + Math.random() * 90;
        const angle = Math.random() * Math.PI * 2;
        noiseCtx.moveTo(startX, startY);
        noiseCtx.lineTo(
          startX + Math.cos(angle) * length,
          startY + Math.sin(angle) * length
        );
        noiseCtx.stroke();
      }

      frostPattern = ctx.createPattern(noiseCanvas, "repeat");

      const veinCanvas = document.createElement("canvas");
      veinCanvas.width = size * 1.4;
      veinCanvas.height = size * 1.4;
      const veinCtx = veinCanvas.getContext("2d");
      if (!veinCtx) {
        return;
      }
      veinCtx.lineWidth = 1;
      for (let i = 0; i < 90; i += 1) {
        const startX = Math.random() * veinCanvas.width;
        const startY = Math.random() * veinCanvas.height;
        const branches = 3 + Math.floor(Math.random() * 3);
        for (let branch = 0; branch < branches; branch += 1) {
          const length = 50 + Math.random() * 150;
          const angle = Math.random() * Math.PI * 2;
          veinCtx.strokeStyle = `rgba(220, 235, 255, ${0.15 + Math.random() * 0.25})`;
          veinCtx.beginPath();
          veinCtx.moveTo(startX, startY);
          veinCtx.lineTo(
            startX + Math.cos(angle) * length,
            startY + Math.sin(angle) * length
          );
          veinCtx.stroke();
        }
      }
      veinPattern = ctx.createPattern(veinCanvas, "repeat");
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      createFrostPatterns();
    };

    const updateStrength = () => {
      const next = strengthRef.current + directionRef.current * 0.004;
      strengthRef.current = Math.max(0, Math.min(1, next));
      return strengthRef.current > 0;
    };

    const draw = () => {
      const shouldContinue = updateStrength();
      const strength = strengthRef.current;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      if (frostPattern) {
        ctx.globalAlpha = 0.85 * strength;
        ctx.fillStyle = frostPattern;
        ctx.fillRect(0, 0, width, height);
      }

      if (veinPattern) {
        ctx.globalAlpha = 0.55 * strength;
        ctx.fillStyle = veinPattern;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.globalAlpha = 0.75 * strength;
      const edgeRadius = Math.max(width, height) * 0.75;
      const edgeGradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.2,
        width / 2,
        height / 2,
        edgeRadius
      );
      edgeGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      edgeGradient.addColorStop(1, "rgba(215, 235, 255, 0.85)");
      ctx.fillStyle = edgeGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.globalAlpha = 0.45 * strength;
      ctx.fillStyle = "rgba(225, 240, 255, 0.65)";
      ctx.fillRect(0, 0, width, height);

      if (shouldContinue) {
        animationRef.current = window.requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="frost-overlay" aria-hidden="true" />;
}
