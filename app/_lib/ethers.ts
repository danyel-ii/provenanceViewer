import { Contract, Interface, JsonRpcProvider } from "ethers";

import { getAlchemyRpcUrl, getEnvConfig } from "./env";
import { normalizeAddress, normalizeTokenId } from "./normalize";

const ERC721_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

const TRANSFER_EVENT = "Transfer";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

let provider: JsonRpcProvider | null = null;
let erc721Interface: Interface | null = null;

export function getProvider() {
  if (!provider) {
    provider = new JsonRpcProvider(getAlchemyRpcUrl());
  }
  return provider;
}

export function getErc721Interface() {
  if (!erc721Interface) {
    erc721Interface = new Interface(ERC721_ABI);
  }
  return erc721Interface;
}

export function getErc721Contract() {
  const { contractAddress } = getEnvConfig();
  return new Contract(contractAddress, ERC721_ABI, getProvider());
}

export async function getMintedTokenIdsFromReceipt(txHash: string) {
  const receipt = await getProvider().getTransactionReceipt(txHash);
  if (!receipt) {
    return [];
  }

  const { contractAddress } = getEnvConfig();
  const normalizedContract = normalizeAddress(contractAddress);
  const iface = getErc721Interface();
  const mintedTokenIds: string[] = [];

  receipt.logs.forEach((log) => {
    if (normalizeAddress(log.address) !== normalizedContract) {
      return;
    }

    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (!parsed || parsed.name !== TRANSFER_EVENT) {
        return;
      }

      const from = normalizeAddress(parsed.args.from as string);
      if (from !== ZERO_ADDRESS) {
        return;
      }

      const tokenIdValue = parsed.args.tokenId;
      const tokenId = normalizeTokenId(String(tokenIdValue));
      if (tokenId) {
        mintedTokenIds.push(tokenId);
      }
    } catch {
      return;
    }
  });

  return Array.from(new Set(mintedTokenIds));
}

export async function readOwnerOf(tokenId: string) {
  const contract = getErc721Contract();
  return contract.ownerOf(tokenId);
}

export async function readTokenUri(tokenId: string) {
  const contract = getErc721Contract();
  return contract.tokenURI(tokenId);
}
