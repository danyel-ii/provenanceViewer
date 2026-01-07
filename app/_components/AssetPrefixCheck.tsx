"use client";

import { useEffect } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/inspecta_deck";

type NextData = {
  assetPrefix?: string;
};

function getNextData(): NextData | undefined {
  return (window as Window & { __NEXT_DATA__?: NextData }).__NEXT_DATA__;
}

export default function AssetPrefixCheck() {
  useEffect(() => {
    const basePath = BASE_PATH && BASE_PATH !== "/" ? BASE_PATH.replace(/\/$/, "") : "";
    const assetPrefix = getNextData()?.assetPrefix ?? "";
    if (basePath && !assetPrefix.startsWith(basePath)) {
      console.warn(
        "[inspecta] assetPrefix mismatch:",
        { basePath, assetPrefix }
      );
    }

    const asset = document.querySelector(
      'script[src*="/_next/"], link[rel="stylesheet"][href*="/_next/"]'
    );
    const assetUrl =
      asset instanceof HTMLScriptElement
        ? asset.src
        : asset instanceof HTMLLinkElement
        ? asset.href
        : "";
    if (assetUrl && basePath && !assetUrl.includes(`${basePath}/_next/`)) {
      console.warn("[inspecta] asset URL not under basePath:", assetUrl);
    }
  }, []);

  return null;
}
