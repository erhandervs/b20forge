import type { Address, PublicClient } from 'viem';
import { ERC20_ABI } from '@/lib/b20-config';

export interface DeployedTokenRecord {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  chainId: number;
  creator: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  variant?: string;
  deployedAt: number;
  metadataUri?: string;
}

const STORAGE_KEY = 'b20.deployed-tokens-v1';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function loadDeployedTokens(): DeployedTokenRecord[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as DeployedTokenRecord[];
    return Array.isArray(parsed)
      ? parsed.filter((token) => !!token?.address).sort((a, b) => b.deployedAt - a.deployedAt)
      : [];
  } catch {
    return [];
  }
}

export function persistDeployedToken(token: DeployedTokenRecord) {
  if (!isBrowser()) return;

  const existing = loadDeployedTokens();
  const next = [
    { ...token, address: token.address.toLowerCase() },
    ...existing.filter((item) => item.address.toLowerCase() !== token.address.toLowerCase()),
  ];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function fetchTokenOnChainMetadata(publicClient: PublicClient, address: Address) {
  try {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      publicClient.readContract({
        address,
        abi: ERC20_ABI,
        functionName: 'name',
      }) as Promise<string>,
      publicClient.readContract({
        address,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }) as Promise<string>,
      publicClient.readContract({
        address,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }) as Promise<number>,
      publicClient.readContract({
        address,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      }) as Promise<bigint>,
    ]);

    return {
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: totalSupply.toString(),
    };
  } catch {
    return null;
  }
}
