"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import type { MintedCube, CubeProvenanceNFT } from "../_data/minted-cube";

type PaperCubeViewerProps = {
  cube: MintedCube;
  requestedTokenId: string;
};

type RollDirection = "up" | "down" | "left" | "right";

type CubeFaces = {
  front?: CubeProvenanceNFT;
  back?: CubeProvenanceNFT;
  left?: CubeProvenanceNFT;
  right?: CubeProvenanceNFT;
  top?: CubeProvenanceNFT;
  bottom?: CubeProvenanceNFT;
};

const ROLL_DURATION_MS = 760;
const CUBE_TILT = { x: -22, y: 32 };

function truncateMiddle(value: string, start = 6, end = 4) {
  if (value.length <= start + end + 3) {
    return value;
  }
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function resolveGatewayUrl(value: string): string {
  if (value.startsWith("ipfs://") || value.toLowerCase().startsWith("ipfs://")) {
    const path = value.replace(/^ipfs:\/\/ipfs\//i, "").replace(/^ipfs:\/\//i, "");
    return `https://ipfs.io/ipfs/${path}`;
  }
  if (value.startsWith("ar://") || value.toLowerCase().startsWith("ar://")) {
    const path = value.replace(/^ar:\/\//i, "");
    return `https://arweave.net/${path}`;
  }
  return value;
}

function getMediaCandidates(media?: MintedCube["media"]) {
  if (media?.imageCandidates?.length) {
    return media.imageCandidates;
  }
  if (media?.image) {
    return [media.image];
  }
  return [];
}

function mapFaces(nfts: CubeProvenanceNFT[]): CubeFaces {
  return nfts.reduce<CubeFaces>((acc, nft) => {
    switch (nft.faceId) {
      case "+Z":
        acc.front = nft;
        break;
      case "-Z":
        acc.back = nft;
        break;
      case "+X":
        acc.right = nft;
        break;
      case "-X":
        acc.left = nft;
        break;
      case "+Y":
        acc.top = nft;
        break;
      case "-Y":
        acc.bottom = nft;
        break;
      default:
        break;
    }
    return acc;
  }, {});
}

function pickFaceImage(nft?: CubeProvenanceNFT): string | null {
  if (!nft) {
    return null;
  }
  const candidates = getMediaCandidates(nft.media);
  if (!candidates.length) {
    return null;
  }
  return resolveGatewayUrl(candidates[0]);
}

export default function PaperCubeViewer({
  cube,
  requestedTokenId,
}: PaperCubeViewerProps) {
  const [unfolded, setUnfolded] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [rollDirection, setRollDirection] = useState<RollDirection | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setUnfolded(true), 240);
    return () => window.clearTimeout(handle);
  }, []);

  const faces = useMemo(() => mapFaces(cube.provenanceNFTs), [cube.provenanceNFTs]);

  const faceTextures = useMemo(
    () => ({
      front: pickFaceImage(faces.front),
      back: pickFaceImage(faces.back),
      left: pickFaceImage(faces.left),
      right: pickFaceImage(faces.right),
      top: pickFaceImage(faces.top),
      bottom: pickFaceImage(faces.bottom),
    }),
    [faces]
  );

  const roll = useCallback((direction: RollDirection) => {
    if (isRolling) {
      return;
    }
    setIsRolling(true);
    setRollDirection(direction);
    setRotation((prev) => {
      switch (direction) {
        case "up":
          return { x: prev.x - 90, y: prev.y };
        case "down":
          return { x: prev.x + 90, y: prev.y };
        case "left":
          return { x: prev.x, y: prev.y - 90 };
        case "right":
          return { x: prev.x, y: prev.y + 90 };
        default:
          return prev;
      }
    });
    window.setTimeout(() => {
      setIsRolling(false);
      setRollDirection(null);
    }, ROLL_DURATION_MS);
  }, [isRolling]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        roll("up");
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        roll("down");
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        roll("left");
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        roll("right");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [roll]);

  const isMismatch = cube.tokenId !== requestedTokenId;
  const cubeStyle = {
    "--cube-rotate-x": `${rotation.x}deg`,
    "--cube-rotate-y": `${rotation.y}deg`,
    "--cube-tilt-x": `${CUBE_TILT.x}deg`,
    "--cube-tilt-y": `${CUBE_TILT.y}deg`,
  } as CSSProperties;
  const truncatedTokenId = truncateMiddle(cube.tokenId);

  return (
    <div className={`paper-viewer-shell${unfolded ? " is-unfolded" : ""}`}>
      <div className="paper-stage">
        <div className="paper-sheet" aria-hidden="true" />
        <div className="paper-grain" aria-hidden="true" />
      </div>

      <header className="paper-viewer-header">
        <div>
          <p className="paper-viewer-eyebrow">Token viewer 02</p>
          <h1 className="paper-viewer-title" title={cube.tokenId}>
            cubixles_ #{truncatedTokenId}
          </h1>
          <p className="paper-viewer-subhead">
            The cube unwraps from paper into a full-sheet field. Roll it with
            arrow keys or the compass below.
          </p>
          {isMismatch && (
            <p className="paper-viewer-note">
              Showing the verified cube for {truncatedTokenId} because that is the
              minted token at this index.
            </p>
          )}
        </div>
        <div className="paper-viewer-meta">
          <span>Minted {cube.mintedAt}</span>
          <span>{cube.network}</span>
          <span>{cube.mintedBy}</span>
        </div>
      </header>

      <div className="paper-cube-center">
        <div className="paper-cube-pad" aria-hidden="true" />
        <div
          className="paper-cube-roller"
          data-roll={rollDirection ?? "idle"}
          style={cubeStyle}
        >
          <div className="paper-cube-physics">
            <div className="paper-cube" aria-label="Provenance cube">
              <div
                className="paper-cube-face face-front"
                data-face="+Z"
                style={
                  faceTextures.front
                    ? { backgroundImage: `url(${faceTextures.front})` }
                    : undefined
                }
              />
              <div
                className="paper-cube-face face-back"
                data-face="-Z"
                style={
                  faceTextures.back
                    ? { backgroundImage: `url(${faceTextures.back})` }
                    : undefined
                }
              />
              <div
                className="paper-cube-face face-left"
                data-face="-X"
                style={
                  faceTextures.left
                    ? { backgroundImage: `url(${faceTextures.left})` }
                    : undefined
                }
              />
              <div
                className="paper-cube-face face-right"
                data-face="+X"
                style={
                  faceTextures.right
                    ? { backgroundImage: `url(${faceTextures.right})` }
                    : undefined
                }
              />
              <div
                className="paper-cube-face face-top"
                data-face="+Y"
                style={
                  faceTextures.top
                    ? { backgroundImage: `url(${faceTextures.top})` }
                    : undefined
                }
              />
              <div
                className="paper-cube-face face-bottom"
                data-face="-Y"
                style={
                  faceTextures.bottom
                    ? { backgroundImage: `url(${faceTextures.bottom})` }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
        <div className="paper-cube-shadow" aria-hidden="true" />
        <div className="paper-wrap" aria-hidden="true" />
      </div>

      <div className="paper-viewer-controls" role="group" aria-label="Cube roll">
        <button type="button" onClick={() => roll("up")}>
          ↑
        </button>
        <div className="paper-viewer-controls-row">
          <button type="button" onClick={() => roll("left")}>
            ←
          </button>
          <button type="button" onClick={() => roll("down")}>
            ↓
          </button>
          <button type="button" onClick={() => roll("right")}>
            →
          </button>
        </div>
      </div>

      <footer className="paper-viewer-footer">
        <span>Token viewer variant · paper fold study</span>
        <span>Faces mapped from mint metadata</span>
      </footer>
    </div>
  );
}
