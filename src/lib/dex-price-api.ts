'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * DexScreener API - Faster than CoinGecko for DEX prices
 * Free, no API key needed, real-time DEX data
 */
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';
const COINGECKO_SIMPLE_API = 'https://api.coingecko.com/api/v3/simple/price';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const CACHE_DURATION = 30000; // 30 seconds (faster refresh than CoinGecko)

const COINGECKO_SIMPLE_IDS: Record<string, string> = {
  '0x4200000000000000000000000000000000000006': 'ethereum',
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'usd-coin',
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': 'usd-coin',
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'dai',
  '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': 'coinbase-wrapped-staked-eth',
};

export interface DexPrice {
  priceUsd: string;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  fdv: number;
}

interface PriceCache {
  [address: string]: {
    data: DexPrice;
    timestamp: number;
  };
}

const priceCache: PriceCache = {};

/**
 * Fetch token price from DexScreener (Base network)
 */
export async function fetchDexPrice(tokenAddress: string): Promise<DexPrice | null> {
  try {
    // Check cache first
    const cached = priceCache[tokenAddress.toLowerCase()];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const response = await fetch(
      `${DEXSCREENER_API}/tokens/${tokenAddress}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Find Base network pair
    const basePair = data.pairs?.find((p: { chainId?: string; liquidity?: { usd?: number }; priceUsd?: string; priceChange?: { h24?: string }; volume?: { h24?: string }; fdv?: string }) => 
      p.chainId === 'base' && p.liquidity?.usd > 1000 // At least $1k liquidity
    );

    if (!basePair) {
      const fallbackPrice = await fetchCoinGeckoPrice(tokenAddress);
      if (fallbackPrice) {
        priceCache[tokenAddress.toLowerCase()] = {
          data: fallbackPrice,
          timestamp: Date.now(),
        };
        return fallbackPrice;
      }
      return null;
    }

    const price: DexPrice = {
      priceUsd: basePair.priceUsd || '0',
      priceChange24h: parseFloat(basePair.priceChange?.h24 || '0'),
      volume24h: parseFloat(basePair.volume?.h24 || '0'),
      liquidity: parseFloat(basePair.liquidity?.usd || '0'),
      fdv: parseFloat(basePair.fdv || '0'),
    };

    // Cache it
    priceCache[tokenAddress.toLowerCase()] = {
      data: price,
      timestamp: Date.now(),
    };

    return price;
  } catch (error) {
    console.error(`Error fetching price for ${tokenAddress}:`, error);
    const fallbackPrice = await fetchCoinGeckoPrice(tokenAddress);
    if (fallbackPrice) {
      priceCache[tokenAddress.toLowerCase()] = {
        data: fallbackPrice,
        timestamp: Date.now(),
      };
      return fallbackPrice;
    }
    return null;
  }
}

async function fetchCoinGeckoPrice(tokenAddress: string): Promise<DexPrice | null> {
  const coinGeckoId = COINGECKO_SIMPLE_IDS[tokenAddress.toLowerCase()];
  if (!coinGeckoId) {
    return null;
  }

  try {
    const response = await fetch(
      `${COINGECKO_SIMPLE_API}?ids=${coinGeckoId}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: { Accept: 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko price error: ${response.status}`);
    }

    const data = await response.json();
    const priceData = data[coinGeckoId];

    if (!priceData || typeof priceData.usd !== 'number') {
      return null;
    }

    return {
      priceUsd: priceData.usd.toString(),
      priceChange24h: parseFloat(priceData.usd_24h_change?.toString?.() ?? '0') || 0,
      volume24h: 0,
      liquidity: 0,
      fdv: 0,
    };
  } catch (error) {
    console.error(`Error fetching CoinGecko fallback price for ${tokenAddress}:`, error);
    return null;
  }
}

/**
 * Fetch multiple token prices at once
 */
export async function fetchMultipleDexPrices(
  tokenAddresses: string[]
): Promise<Record<string, DexPrice>> {
  const results: Record<string, DexPrice> = {};
  
  // Fetch all in parallel
  const promises = tokenAddresses.map(async (address) => {
    const price = await fetchDexPrice(address);
    if (price) {
      results[address.toLowerCase()] = price;
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * React hook for token prices from DexScreener
 */
export function useDexPrices(tokenAddresses: string[]) {
  const [prices, setPrices] = useState<Record<string, DexPrice>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrices = useCallback(async () => {
    if (tokenAddresses.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const priceData = await fetchMultipleDexPrices(tokenAddresses);
      setPrices(priceData);
      setIsLoading(false);
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, [tokenAddresses]);

  useEffect(() => {
    const startFetch = () => {
      const timer = setTimeout(fetchPrices, 0);
      return () => clearTimeout(timer);
    };

    const cancelTimer = startFetch();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPrices, CACHE_DURATION);
    return () => {
      cancelTimer?.();
      clearInterval(interval);
    };
  }, [fetchPrices]);

  return {
    prices,
    isLoading,
    error,
    refetch: fetchPrices,
  };
}

/**
 * Fallback prices if both APIs fail
 */
export const STATIC_PRICES: Record<string, number> = {
  // Base mainnet addresses (lowercase)  '0x0000000000000000000000000000000000000000': 3842.50, // native ETH fallback  '0x4200000000000000000000000000000000000006': 3842.50, // WETH
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 1.00,    // USDC
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': 1.00,    // USDbC
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 1.00,    // DAI
  '0x2ae3f1ec7f1f5012cfEab0185bfc7aa3cf0dec22': 4021.30, // cbETH
};

/**
 * Get price with fallback
 */
export function getPriceWithFallback(
  address: string,
  dexPrice: DexPrice | undefined
): number {
  if (dexPrice && parseFloat(dexPrice.priceUsd) > 0) {
    return parseFloat(dexPrice.priceUsd);
  }
  return STATIC_PRICES[address.toLowerCase()] || 0;
}

/**
 * CoinGecko API for historical price data
 * Free tier: 10-50 calls/minute
 */
// CoinGecko IDs for Base tokens (use ethereum for WETH since it tracks ETH price)
const COINGECKO_IDS: Record<string, string> = {
  '0x0000000000000000000000000000000000000000': 'ethereum', // ETH (native)
  '0x4200000000000000000000000000000000000006': 'ethereum', // WETH (same as ETH)
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'usd-coin', // USDC
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': 'usd-coin', // USDbC (use USDC as proxy)
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'dai', // DAI
  '0x2ae3f1ec7f1f5012cfEab0185bfc7aa3cf0dec22': 'coinbase-wrapped-staked-eth', // cbETH
};

export interface HistoricalDataPoint {
  time: string;
  value: number;
}

/**
 * Fetch historical price data from CoinGecko
 * @param tokenAddress Token contract address
 * @param days Number of days (1, 7, 30, 90, 180, 365, max)
 */
export async function fetchHistoricalPrices(
  tokenAddress: string,
  days: number
): Promise<HistoricalDataPoint[]> {
  try {
    const coinId = COINGECKO_IDS[tokenAddress.toLowerCase()];
    
    if (!coinId) {
      console.warn(`No CoinGecko ID for token ${tokenAddress}`);
      return [];
    }

    const response = await fetch(
      `${COINGECKO_API}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${days === 1 ? 'hourly' : 'daily'}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    // data.prices is array of [timestamp, price]
    if (!data.prices || data.prices.length === 0) {
      return [];
    }

    // Format data
    const isHourly = days === 1;
    const result: HistoricalDataPoint[] = data.prices.map(([timestamp, price]: [number, number]) => {
      const date = new Date(timestamp);
      const timeLabel = isHourly
        ? date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      return {
        time: timeLabel,
        value: price,
      };
    });

    return result;
  } catch (error) {
    console.error(`Error fetching historical data for ${tokenAddress}:`, error);
    return [];
  }
}

/**
 * React hook for historical price data
 */
export function useHistoricalPrices(tokenAddress: string | null, days: number) {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!tokenAddress) {
        setData([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await fetchHistoricalPrices(tokenAddress, days);
      setData(result);
      setIsLoading(false);
    };

    fetchData();
  }, [tokenAddress, days]);

  return { data, isLoading };
}
