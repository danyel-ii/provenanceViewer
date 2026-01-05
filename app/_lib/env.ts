const REQUIRED_ENV = ["ALCHEMY_KEY", "CUBIXLES_CONTRACT", "NETWORK"] as const;

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

function requireEnv(name: (typeof REQUIRED_ENV)[number]): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
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

  const alchemyKey = requireEnv("ALCHEMY_KEY");
  const network = requireEnv("NETWORK");
  const contractAddress = requireEnv("CUBIXLES_CONTRACT");

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
