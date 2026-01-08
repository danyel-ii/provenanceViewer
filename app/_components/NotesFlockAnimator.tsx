"use client";

import { useEffect } from "react";

const FLOCK_DELAY_MS = 900;
const MOVE_DURATION_MS = 1800;
const FLOCK_STORAGE_KEY = "cubixles_notes_flock_v1";

export default function NotesFlockAnimator() {
  useEffect(() => {
    const overlay = document.querySelector<HTMLElement>("[data-notes-overlay]");
    if (!overlay) {
      return;
    }

    let timeoutRef: number | null = null;
    let dockTimeoutRef: number | null = null;
    let animationFrameRef: number | null = null;

    try {
      if (window.localStorage.getItem(FLOCK_STORAGE_KEY) === "1") {
        overlay.classList.add("dock");
        document.body.classList.add("notes-docked");
        return;
      }
      window.localStorage.setItem(FLOCK_STORAGE_KEY, "1");
    } catch {
      // Ignore storage access errors (private mode, blocked storage).
    }

    const layoutTiles = () => {
      if (timeoutRef) {
        window.clearTimeout(timeoutRef);
      }
      if (dockTimeoutRef) {
        window.clearTimeout(dockTimeoutRef);
      }
      if (animationFrameRef) {
        window.cancelAnimationFrame(animationFrameRef);
      }

      overlay.classList.remove("flock");
      overlay.classList.remove("dock");
      document.body.classList.remove("notes-docked");

      animationFrameRef = window.requestAnimationFrame(() => {
        const targetNode = document.querySelector<HTMLElement>("[data-cube-icon]");
        const fallbackTarget = {
          x: window.innerWidth * 0.78,
          y: window.innerHeight * 0.2,
        };
        let targetX = fallbackTarget.x;
        let targetY = fallbackTarget.y;

        if (targetNode) {
          const rect = targetNode.getBoundingClientRect();
          targetX = rect.left + rect.width / 2;
          targetY = rect.top + rect.height / 2;
        }

        const tilesNodes = Array.from(
          overlay.querySelectorAll<HTMLElement>(".notes-tile")
        );
        let maxDelay = 0;

        tilesNodes.forEach((tile) => {
          const rect = tile.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = targetX - centerX;
          const dy = targetY - centerY;
          const delayValue = Number.parseFloat(
            tile.style.getPropertyValue("--delay") || "0"
          );
          maxDelay = Math.max(maxDelay, delayValue);
          tile.style.setProperty("--dx", `${dx}px`);
          tile.style.setProperty("--dy", `${dy}px`);
        });

        timeoutRef = window.setTimeout(
          () => overlay.classList.add("flock"),
          FLOCK_DELAY_MS
        );
        dockTimeoutRef = window.setTimeout(() => {
          overlay.classList.add("dock");
          document.body.classList.add("notes-docked");
        }, FLOCK_DELAY_MS + maxDelay + MOVE_DURATION_MS);
      });
    };

    layoutTiles();

    return () => {
      if (timeoutRef) {
        window.clearTimeout(timeoutRef);
      }
      if (dockTimeoutRef) {
        window.clearTimeout(dockTimeoutRef);
      }
      if (animationFrameRef) {
        window.cancelAnimationFrame(animationFrameRef);
      }
      document.body.classList.remove("notes-docked");
    };
  }, []);

  return null;
}
