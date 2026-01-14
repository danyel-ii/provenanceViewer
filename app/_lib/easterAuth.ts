import { createHmac, randomBytes, timingSafeEqual } from "crypto";

import { getCacheValue, setCacheValue } from "./cache";
import { normalizeAddress } from "./normalize";

type NonceRecord = {
  tokenId: string;
  chainId: number;
  domain: string;
  issuedAt: number;
  usedAt?: number;
};

export type AccessTokenPayload = {
  tokenId: string;
  chainId: number;
  address: string;
  exp: number;
};

type AccessTokenVerification = {
  valid: boolean;
  reason?: string;
  payload?: AccessTokenPayload;
};

const DEFAULT_NONCE_TTL_SECONDS = 300;
const DEFAULT_NONCE_USED_TTL_SECONDS = 30;
const DEFAULT_ACCESS_TTL_SECONDS = 300;

function parseNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getEasterSecret(): string {
  const secret = process.env.EASTER_EGG_SECRET ?? process.env.CUBIXLES_EASTER_SECRET;
  if (!secret) {
    throw new Error("Missing required env var: EASTER_EGG_SECRET");
  }
  return secret;
}

function getNonceTtlSeconds() {
  return parseNumberEnv("EASTER_NONCE_TTL_SECONDS", DEFAULT_NONCE_TTL_SECONDS);
}

function getNonceUsedTtlSeconds() {
  return parseNumberEnv(
    "EASTER_NONCE_USED_TTL_SECONDS",
    DEFAULT_NONCE_USED_TTL_SECONDS
  );
}

function getAccessTtlSeconds() {
  return parseNumberEnv("EASTER_ACCESS_TTL_SECONDS", DEFAULT_ACCESS_TTL_SECONDS);
}

function getNonceKey(nonce: string) {
  return `easter:nonce:${nonce}`;
}

function signPayload(payload: string) {
  const secret = getEasterSecret();
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function buildAccessToken(payload: AccessTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

function parseAccessToken(accessToken: string): AccessTokenPayload | null {
  const [encoded, signature] = accessToken.split(".");
  if (!encoded || !signature) {
    return null;
  }

  let expectedSignature: string;
  try {
    expectedSignature = signPayload(encoded);
  } catch {
    return null;
  }
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as AccessTokenPayload;
    if (
      !decoded ||
      typeof decoded.tokenId !== "string" ||
      typeof decoded.chainId !== "number" ||
      typeof decoded.address !== "string" ||
      typeof decoded.exp !== "number"
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function getRequestDomain(request: Request): string {
  return (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "unknown"
  );
}

export function buildEasterSignMessage(options: {
  tokenId: string;
  chainId: number;
  nonce: string;
  domain: string;
}): string {
  const { tokenId, chainId, nonce, domain } = options;
  return [
    "cubixles Easter Egg access",
    `Domain: ${domain}`,
    `Token: ${tokenId}`,
    `Chain: ${chainId}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

export async function createEasterNonce(options: {
  tokenId: string;
  chainId: number;
  domain: string;
}) {
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = Date.now();
  const record: NonceRecord = {
    tokenId: options.tokenId,
    chainId: options.chainId,
    domain: options.domain,
    issuedAt,
  };
  const ttlSeconds = getNonceTtlSeconds();
  await setCacheValue(getNonceKey(nonce), JSON.stringify(record), ttlSeconds);
  return {
    nonce,
    message: buildEasterSignMessage({
      tokenId: options.tokenId,
      chainId: options.chainId,
      nonce,
      domain: options.domain,
    }),
    expiresAt: issuedAt + ttlSeconds * 1000,
  };
}

export async function consumeEasterNonce(options: {
  nonce: string;
  tokenId: string;
  chainId: number;
  domain: string;
}) {
  const raw = await getCacheValue(getNonceKey(options.nonce));
  if (!raw) {
    return { ok: false, reason: "nonce_missing" } as const;
  }

  let record: NonceRecord | null = null;
  try {
    record = JSON.parse(raw) as NonceRecord;
  } catch {
    return { ok: false, reason: "nonce_invalid" } as const;
  }

  if (!record || record.usedAt) {
    return { ok: false, reason: "nonce_used" } as const;
  }

  if (
    record.tokenId !== options.tokenId ||
    record.chainId !== options.chainId ||
    record.domain !== options.domain
  ) {
    return { ok: false, reason: "nonce_mismatch" } as const;
  }

  await setCacheValue(
    getNonceKey(options.nonce),
    JSON.stringify({ ...record, usedAt: Date.now() }),
    getNonceUsedTtlSeconds()
  );

  return { ok: true, record } as const;
}

export function createEasterAccessToken(options: {
  tokenId: string;
  chainId: number;
  address: string;
}) {
  const ttlSeconds = getAccessTtlSeconds();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const normalized = normalizeAddress(options.address);
  if (!normalized) {
    throw new Error("Invalid address for access token");
  }

  const payload: AccessTokenPayload = {
    tokenId: options.tokenId,
    chainId: options.chainId,
    address: normalized,
    exp: nowSeconds + ttlSeconds,
  };

  return {
    accessToken: buildAccessToken(payload),
    expiresAt: payload.exp * 1000,
  };
}

export function verifyEasterAccessToken(
  accessToken: string | null | undefined,
  expectedTokenId?: string
): AccessTokenVerification {
  if (!accessToken) {
    return { valid: false, reason: "missing" };
  }

  const parsed = parseAccessToken(accessToken);
  if (!parsed) {
    return { valid: false, reason: "invalid" };
  }

  if (expectedTokenId && parsed.tokenId !== expectedTokenId) {
    return { valid: false, reason: "token_mismatch" };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (parsed.exp <= nowSeconds) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, payload: parsed };
}
