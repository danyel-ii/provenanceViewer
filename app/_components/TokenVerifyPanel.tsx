"use client";

import { useState } from "react";

type VerifyResponse = {
  tokenId?: string;
  owner?: string;
  tokenUri?: string;
  verified?: boolean;
  readOnly?: boolean;
  error?: string;
  detail?: string;
};

type TokenVerifyPanelProps = {
  tokenId: string;
};

export default function TokenVerifyPanel({ tokenId }: TokenVerifyPanelProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [result, setResult] = useState<VerifyResponse | null>(null);

  const handleVerify = async () => {
    setStatus("loading");
    setResult(null);

    try {
      const response = await fetch(`/api/token/${tokenId}/verify`, {
        method: "POST",
      });
      const data = (await response.json()) as VerifyResponse;

      if (!response.ok) {
        setStatus("error");
        setResult(data);
        return;
      }

      setStatus("success");
      setResult(data);
    } catch (error) {
      setStatus("error");
      setResult({ error: "network_error", detail: String(error) });
    }
  };

  return (
    <section className="provenance-panel token-verify">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">Verification</p>
          <h2 className="panel-title">Read-only contract check</h2>
          <p className="panel-subhead">
            Confirms ownerOf + tokenURI on-chain with no wallet or writes.
          </p>
        </div>
        <button
          type="button"
          className="landing-button primary"
          onClick={handleVerify}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Verifying..." : "Run verification"}
        </button>
      </div>

      {status === "idle" && (
        <p className="panel-body-text">
          Verification is rate limited to protect the RPC endpoint.
        </p>
      )}

      {status === "error" && (
        <p className="token-verify-status error">
          Verification failed. {result?.error ?? "unknown_error"}
        </p>
      )}

      {status === "success" && result && (
        <div className="token-verify-grid">
          <div className="token-detail-row">
            <span className="token-detail-label">Owner</span>
            <span className="token-detail-value">{result.owner ?? "n/a"}</span>
          </div>
          <div className="token-detail-row">
            <span className="token-detail-label">Token URI</span>
            <span className="token-detail-value">{result.tokenUri ?? "n/a"}</span>
          </div>
          <div className="token-detail-row">
            <span className="token-detail-label">Read-only</span>
            <span className="token-detail-value">
              {result.readOnly ? "Yes" : "No"}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
