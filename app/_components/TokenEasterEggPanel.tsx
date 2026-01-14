"use client";

import { useMemo, useState } from "react";

import CollapsiblePanel from "./CollapsiblePanel";
import { withBasePath } from "../_lib/basePath";

type TokenEasterEggPanelProps = {
  tokenId: string;
  chainId: number;
};

type EasterNonceResponse = {
  nonce?: string;
  message?: string;
  expiresAt?: number;
  error?: string;
};

type EasterVerifyResponse = {
  accessToken?: string;
  expiresAt?: number;
  error?: string;
};

type EthereumProvider = {
  request: (options: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (window as Window & { ethereum?: EthereumProvider }).ethereum ?? null;
}

function EggIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 20"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="6" y="1" width="4" height="1" fill="#fbe7c2" />
      <rect x="5" y="2" width="6" height="1" fill="#fbe7c2" />
      <rect x="4" y="3" width="8" height="1" fill="#fbe7c2" />
      <rect x="3" y="4" width="10" height="1" fill="#fbe7c2" />
      <rect x="3" y="5" width="10" height="1" fill="#fbe7c2" />
      <rect x="2" y="6" width="12" height="1" fill="#fbe7c2" />
      <rect x="2" y="7" width="12" height="1" fill="#fbe7c2" />
      <rect x="2" y="8" width="12" height="1" fill="#fbe7c2" />
      <rect x="2" y="9" width="12" height="1" fill="#fbe7c2" />
      <rect x="2" y="10" width="12" height="1" fill="#fbe7c2" />
      <rect x="2" y="11" width="12" height="1" fill="#fbe7c2" />
      <rect x="3" y="12" width="10" height="1" fill="#fbe7c2" />
      <rect x="3" y="13" width="10" height="1" fill="#fbe7c2" />
      <rect x="4" y="14" width="8" height="1" fill="#fbe7c2" />
      <rect x="5" y="15" width="6" height="1" fill="#fbe7c2" />
      <rect x="6" y="16" width="4" height="1" fill="#fbe7c2" />
      <rect x="6" y="6" width="2" height="1" fill="#f4b942" />
      <rect x="9" y="8" width="2" height="1" fill="#f4b942" />
      <rect x="5" y="10" width="2" height="1" fill="#f4b942" />
      <rect x="8" y="12" width="2" height="1" fill="#f4b942" />
    </svg>
  );
}

export default function TokenEasterEggPanel({
  tokenId,
  chainId,
}: TokenEasterEggPanelProps) {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "signing" | "verifying" | "not_owner" | "error"
  >("idle");
  const [detail, setDetail] = useState<string | null>(null);

  const statusMessage = useMemo(() => {
    switch (status) {
      case "connecting":
        return "Connecting wallet...";
      case "signing":
        return "Sign the nonce to prove ownership.";
      case "verifying":
        return "Verifying ownership on-chain...";
      case "not_owner":
        return "Not owner.";
      case "error":
        return detail ?? "Unable to unlock.";
      default:
        return "Click the egg to connect and verify ownership.";
    }
  }, [status, detail]);

  const handleUnlock = async () => {
    setStatus("connecting");
    setDetail(null);

    const provider = getEthereumProvider();
    if (!provider) {
      setStatus("error");
      setDetail("No injected wallet detected.");
      return;
    }

    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = accounts?.[0];
      if (!address) {
        setStatus("error");
        setDetail("No wallet address returned.");
        return;
      }

      setStatus("signing");
      const nonceResponse = await fetch(
        withBasePath(`/api/token/${tokenId}/easter/nonce?chainId=${chainId}`),
        { method: "POST" }
      );
      const nonceData = (await nonceResponse.json()) as EasterNonceResponse;
      if (!nonceResponse.ok || !nonceData.nonce || !nonceData.message) {
        setStatus("error");
        setDetail(nonceData.error ?? "Nonce request failed.");
        return;
      }

      let signature: string | null = null;
      try {
        signature = (await provider.request({
          method: "personal_sign",
          params: [nonceData.message, address],
        })) as string;
      } catch {
        signature = (await provider.request({
          method: "personal_sign",
          params: [address, nonceData.message],
        })) as string;
      }

      if (!signature) {
        setStatus("error");
        setDetail("Signature was not provided.");
        return;
      }

      setStatus("verifying");
      const verifyResponse = await fetch(
        withBasePath(`/api/token/${tokenId}/easter/verify?chainId=${chainId}`),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            address,
            signature,
            nonce: nonceData.nonce,
          }),
        }
      );
      const verifyData = (await verifyResponse.json()) as EasterVerifyResponse;

      if (verifyResponse.status === 403) {
        setStatus("not_owner");
        return;
      }

      if (!verifyResponse.ok || !verifyData.accessToken) {
        setStatus("error");
        setDetail(verifyData.error ?? "Verification failed.");
        return;
      }

      const accessUrl = withBasePath(
        `/token/${tokenId}/easter?access=${encodeURIComponent(
          verifyData.accessToken
        )}`
      );
      window.location.assign(accessUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("error");
      setDetail(message);
    }
  };

  return (
    <CollapsiblePanel
      eyebrow="Collector unlock"
      title="Owner-only easter egg"
      subhead="Wallet signature + server verification required."
      defaultOpen
    >
      <div className="token-easter-egg">
        <button
          type="button"
          className="token-easter-egg-button"
          onClick={handleUnlock}
          disabled={status === "connecting" || status === "signing" || status === "verifying"}
          aria-label="Unlock easter egg"
        >
          <EggIcon className="token-easter-egg-icon" />
        </button>
        <div className="token-easter-egg-copy">
          <p className="token-easter-egg-status">{statusMessage}</p>
          <p className="token-easter-egg-note">
            No transaction required. Server checks ownership before issuing access.
          </p>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
