type CacheTtls = {
  tokens: number;
  metadata: number;
  provenance: number;
  owners: number;
  verify: number;
};

export type EnvConfig = {
  alchemyKey: string;
  network: string;
  contractAddress: string;
  cacheProvider: string;
  redisUrl?: string;
  cacheTtls: CacheTtls;
};

let cachedConfig: EnvConfig | null = null;

const NETWORK_BY_CHAIN_ID: Record<number, string> = {
  1: "eth-mainnet",
  5: "eth-goerli",
  11155111: "eth-sepolia",
  137: "polygon-mainnet",
  80001: "polygon-mumbai",
  8453: "base-mainnet",
  84532: "base-sepolia",
};

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireEnv(names: string[], label: string): string {
  for (const name of names) {
    const value = readEnv(name);
    if (value) {
      return value;
    }
  }
  throw new Error(`Missing required env var: ${label}`);
}

function resolveNetwork(): string {
  const direct = readEnv("NETWORK");
  if (direct) {
    return direct;
  }

  const chainIdRaw = readEnv("CUBIXLES_CHAIN_ID") ?? readEnv("BASE_CHAIN_ID");
  if (chainIdRaw) {
    const chainId = Number.parseInt(chainIdRaw, 10);
    if (Number.isFinite(chainId) && NETWORK_BY_CHAIN_ID[chainId]) {
      return NETWORK_BY_CHAIN_ID[chainId];
    }
  }

  throw new Error("Missing required env var: NETWORK");
}

function parseNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getEnvConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const alchemyKey = requireEnv(["ALCHEMY_KEY", "ALCHEMY_API_KEY"], "ALCHEMY_KEY");
  const network = resolveNetwork();
  const contractAddress = requireEnv(
    ["CUBIXLES_CONTRACT", "CUBIXLES_CONTRACT_ADDRESS"],
    "CUBIXLES_CONTRACT"
  );

  cachedConfig = {
    alchemyKey,
    network,
    contractAddress,
    cacheProvider: process.env.CACHE_PROVIDER ?? "memory",
    redisUrl: process.env.REDIS_URL,
    cacheTtls: {
      tokens: parseNumberEnv("CACHE_TTL_TOKENS", 600),
      metadata: parseNumberEnv("CACHE_TTL_METADATA", 86400),
      provenance: parseNumberEnv("CACHE_TTL_PROVENANCE", 600),
      owners: parseNumberEnv("CACHE_TTL_OWNERS", 600),
      verify: parseNumberEnv("CACHE_TTL_VERIFY", 60),
    },
  };

  return cachedConfig;
}

export function getAlchemyNftBaseUrl(): string {
  const { network, alchemyKey } = getEnvConfig();
  return `https://${network}.g.alchemy.com/nft/v3/${alchemyKey}`;
}

export function getAlchemyRpcUrl(): string {
  const { network, alchemyKey } = getEnvConfig();
  return `https://${network}.g.alchemy.com/v2/${alchemyKey}`;
}
