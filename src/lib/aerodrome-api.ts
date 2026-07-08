'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Aerodrome API Configuration
 * Base: https://aerodrome.finance
 */
const AERODROME_API_BASE = 'https://api.aerodrome.finance/api/v1';
const CACHE_DURATION = 30000; // 30 seconds cache

export interface AerodromePool {
  address: string;
  symbol: string;
  name: string;
  token0: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  token1: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  tvl: number;
  volume24h: number;
  apr: number;
  fee: number;
  stable: boolean;
  reserve0: string;
  reserve1: string;
}

interface PoolCache {
  data: AerodromePool[];
  timestamp: number;
}

interface AerodromePoolApi {
  address?: string;
  pool_address?: string;
  symbol?: string;
  name?: string;
  token0?: {
    address?: string;
    symbol?: string;
    name?: string;
    decimals?: number;
  };
  token1?: {
    address?: string;
    symbol?: string;
    name?: string;
    decimals?: number;
  };
  tvl?: number | string;
  volume_24h?: number | string;
  volume?: number | string;
  apr?: number | string;
  apy?: number | string;
  fee?: number | string;
  stable?: boolean;
  type?: string;
  reserve0?: string;
  reserve1?: string;
  total_liquidity?: number | string;
}

let poolCache: PoolCache | null = null;

/**
 * Fetch Aerodrome pools
 */
export async function fetchAerodromePools(): Promise<AerodromePool[]> {
  try {
    // Check cache first
    if (poolCache && Date.now() - poolCache.timestamp < CACHE_DURATION) {
      return poolCache.data;
    }

    const response = await fetch(`${AERODROME_API_BASE}/pools`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Aerodrome API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform to our format
    const pools: AerodromePool[] = (data.data as AerodromePoolApi[] | undefined)?.map((pool) => ({
      address: pool.address || pool.pool_address,
      symbol: pool.symbol || `${pool.token0?.symbol}-${pool.token1?.symbol}`,
      name: pool.name || `${pool.token0?.symbol}/${pool.token1?.symbol}`,
      token0: {
        address: pool.token0?.address || '',
        symbol: pool.token0?.symbol || '',
        name: pool.token0?.name || '',
        decimals: pool.token0?.decimals || 18,
      },
      token1: {
        address: pool.token1?.address || '',
        symbol: pool.token1?.symbol || '',
        name: pool.token1?.name || '',
        decimals: pool.token1?.decimals || 18,
      },
      tvl: parseFloat(pool.tvl || pool.total_liquidity || '0'),
      volume24h: parseFloat(pool.volume_24h || pool.volume || '0'),
      apr: parseFloat(pool.apr || pool.apy || '0'),
      fee: parseFloat(pool.fee || '0.003'),
      stable: pool.stable === true || pool.type === 'stable',
      reserve0: pool.reserve0 || '0',
      reserve1: pool.reserve1 || '0',
    })) || [];

    // Cache the results
    poolCache = {
      data: pools,
      timestamp: Date.now(),
    };

    return pools;
  } catch (error) {
    console.error('Error fetching Aerodrome pools:', error);
    
    // Return fallback mock data if API fails
    return getFallbackPools();
  }
}

/**
 * React hook for Aerodrome pools
 */
export function useAerodromePools() {
  const [pools, setPools] = useState<AerodromePool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPools = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchAerodromePools();
      setPools(data);
      setIsLoading(false);
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPools();
    }, 0);

    // Refresh every 30 seconds
    const interval = window.setInterval(() => {
      void fetchPools();
    }, CACHE_DURATION);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [fetchPools]);

  return {
    pools,
    isLoading,
    error,
    refetch: fetchPools,
  };
}

/**
 * Format TVL
 */
export function formatTVL(tvl: number): string {
  if (tvl >= 1_000_000_000) return `$${(tvl / 1_000_000_000).toFixed(2)}B`;
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(2)}M`;
  if (tvl >= 1_000) return `$${(tvl / 1_000).toFixed(2)}K`;
  return `$${tvl.toFixed(2)}`;
}

/**
 * Format APR
 */
export function formatAPR(apr: number): string {
  if (apr >= 1000) return `${(apr / 1000).toFixed(1)}K%`;
  if (apr >= 100) return `${apr.toFixed(0)}%`;
  return `${apr.toFixed(2)}%`;
}

/**
 * Fallback pools (when API is down)
 */
function getFallbackPools(): AerodromePool[] {
  return [
    {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'WETH-USDC',
      name: 'WETH/USDC',
      token0: {
        address: '0x4200000000000000000000000000000000000006',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
      },
      token1: {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
      tvl: 12_500_000,
      volume24h: 3_200_000,
      apr: 15.6,
      fee: 0.003,
      stable: false,
      reserve0: '3250000000000000000000',
      reserve1: '12500000000000',
    },
    {
      address: '0x2345678901234567890123456789012345678901',
      symbol: 'USDC-USDbC',
      name: 'USDC/USDbC',
      token0: {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
      token1: {
        address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
        symbol: 'USDbC',
        name: 'USD Base Coin',
        decimals: 6,
      },
      tvl: 8_300_000,
      volume24h: 1_100_000,
      apr: 8.2,
      fee: 0.0001,
      stable: true,
      reserve0: '8300000000000',
      reserve1: '8300000000000',
    },
    {
      address: '0x3456789012345678901234567890123456789012',
      symbol: 'cbETH-WETH',
      name: 'cbETH/WETH',
      token0: {
        address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
        symbol: 'cbETH',
        name: 'Coinbase Wrapped Staked ETH',
        decimals: 18,
      },
      token1: {
        address: '0x4200000000000000000000000000000000000006',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
      },
      tvl: 5_600_000,
      volume24h: 890_000,
      apr: 12.4,
      fee: 0.003,
      stable: false,
      reserve0: '1390000000000000000000',
      reserve1: '1450000000000000000000',
    },
    {
      address: '0x4567890123456789012345678901234567890123',
      symbol: 'DAI-USDC',
      name: 'DAI/USDC',
      token0: {
        address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
      },
      token1: {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
      tvl: 4_200_000,
      volume24h: 620_000,
      apr: 6.8,
      fee: 0.0001,
      stable: true,
      reserve0: '4200000000000000000000000',
      reserve1: '4200000000000',
    },
    {
      address: '0x5678901234567890123456789012345678901234',
      symbol: 'WETH-DAI',
      name: 'WETH/DAI',
      token0: {
        address: '0x4200000000000000000000000000000000000006',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
      },
      token1: {
        address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
      },
      tvl: 3_800_000,
      volume24h: 520_000,
      apr: 18.3,
      fee: 0.003,
      stable: false,
      reserve0: '990000000000000000000',
      reserve1: '3800000000000000000000000',
    },
  ];
}
