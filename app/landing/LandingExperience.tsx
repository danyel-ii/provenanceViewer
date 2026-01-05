"use client";

import { useCallback, useMemo, useState } from "react";
import LandingHero from "../_components/LandingHero";
import MintAuditPanel from "../_components/MintAuditPanel";
import ProvenancePanel from "../_components/ProvenancePanel";
import {
  CANONICAL_FACE_ORDER,
  CANONICAL_OWNERSHIP_HISTORY,
  CANONICAL_OWNERSHIP_NOTE,
  FACE_REGISTRY,
  FaceDefinition,
} from "../_data/landing-provenance";

type ProvenanceMode = "compositional" | "custody";

export default function LandingExperience() {
  const [activeFaceId, setActiveFaceId] = useState<FaceDefinition["id"]>(FACE_REGISTRY[0].id);
  const [mode, setMode] = useState<ProvenanceMode>("compositional");

  const handleFaceChange = useCallback((faceId: FaceDefinition["id"]) => {
    setActiveFaceId(faceId);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "compositional" ? "custody" : "compositional"));
  }, []);

  const activeFace =
    FACE_REGISTRY.find((face) => face.id === activeFaceId) ?? FACE_REGISTRY[0];

  const visualFaces = useMemo(() => {
    const startIndex = FACE_REGISTRY.findIndex((face) => face.id === activeFaceId);
    if (startIndex === -1) {
      return FACE_REGISTRY;
    }
    return [
      ...FACE_REGISTRY.slice(startIndex),
      ...FACE_REGISTRY.slice(0, startIndex),
    ];
  }, [activeFaceId]);

  const canonicalFaces = useMemo(
    () =>
      CANONICAL_FACE_ORDER.map((id) => FACE_REGISTRY.find((face) => face.id === id)).filter(
        (face): face is FaceDefinition => Boolean(face)
      ),
    []
  );

  return (
    <main className="landing-page">
      <LandingHero onFaceChange={handleFaceChange} />
      <ProvenancePanel
        mode={mode}
        onModeToggle={toggleMode}
        activeFace={activeFace}
        visualFaces={visualFaces}
        canonicalFaces={canonicalFaces}
        ownershipHistory={CANONICAL_OWNERSHIP_HISTORY}
        ownershipNote={CANONICAL_OWNERSHIP_NOTE}
      />
      <MintAuditPanel />
    </main>
  );
}
