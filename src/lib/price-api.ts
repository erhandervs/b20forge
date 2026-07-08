'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * CoinGecko API configuration
 * Free tier: 10-50 calls/minute
 */
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const CACHE_DURATION = 60000; // 1 minute cache

interface TokenPrice {
  usd: number;
  usd_24h_change: number;
  usd_24h_vol?: number;
  usd_market_cap?: number;
  last_updated_at: number;
}

interface PriceCache {
  [key: string]: {
    data: TokenPrice;
    timestamp: number;
  };
}

const priceCache: PriceCache = {};

/**
 * Fetch token prices from CoinGecko
 * @param coingeckoIds - Array of CoinGecko token IDs
 */
export async function fetchTokenPrices(coingeckoIds: string[]): Promise<Record<string, TokenPrice>> {
  try {
    const ids = coingeckoIds.join(',');
    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`,
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
    
    // Cache the results
    const now = Date.now();
    Object.keys(data).forEach(id => {
      priceCache[id] = {
        data: data[id],
        timestamp: now,
      };
    });

    return data;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return {};
  }
}

/**
 * Get cached price or fetch from API
 */
export function getCachedPrice(coingeckoId: string): TokenPrice | null {
  const cached = priceCache[coingeckoId];
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    return null; // Cache expired
  }
  
  return cached.data;
}

/**
 * React hook for token prices
 */
export function useTokenPrices(coingeckoIds: string[]) {
  const [prices, setPrices] = useState<Record<string, TokenPrice>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      const cachedPrices: Record<string, TokenPrice> = {};
      const idsToFetch: string[] = [];

      coingeckoIds.forEach(id => {
        const cached = getCachedPrice(id);
        if (cached) {
          cachedPrices[id] = cached;
        } else {
          idsToFetch.push(id);
        }
      });

      // If we have all prices cached, use them
      if (idsToFetch.length === 0) {
        setPrices(cachedPrices);
        setIsLoading(false);
        return;
      }

      // Fetch missing prices
      const freshPrices = await fetchTokenPrices(idsToFetch);
      const allPrices = { ...cachedPrices, ...freshPrices };
      
      setPrices(allPrices);
      setIsLoading(false);
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, [coingeckoIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPrices();
    }, 0);

    // Refresh every minute
    const interval = window.setInterval(() => {
      void fetchPrices();
    }, CACHE_DURATION);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
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
 * Format price with appropriate decimals
 */
export function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString('en', { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
}

/**
 * Format market cap
 */
export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1_000_000_000) return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
  if (marketCap >= 1_000_000) return `$${(marketCap / 1_000_000).toFixed(2)}M`;
  if (marketCap >= 1_000) return `$${(marketCap / 1_000).toFixed(2)}K`;
  return `$${marketCap.toFixed(2)}`;
}

/**
 * Format volume
 */
export function formatVolume(volume: number): string {
  return formatMarketCap(volume);
}

/**
 * Mock prices fallback (when API fails or rate limited)
 */
export const FALLBACK_PRICES: Record<string, TokenPrice> = {
  'weth': {
    usd: 3842.50,
    usd_24h_change: 2.14,
    usd_24h_vol: 25_000_000,
    usd_market_cap: 120_000_000_000,
    last_updated_at: Date.now() / 1000,
  },
  'usd-coin': {
    usd: 1.00,
    usd_24h_change: 0.01,
    usd_24h_vol: 98_000_000,
    usd_market_cap: 24_000_000_000,
    last_updated_at: Date.now() / 1000,
  },
  'bridged-usd-coin-base': {
    usd: 1.00,
    usd_24h_change: 0.02,
    usd_24h_vol: 12_000_000,
    usd_market_cap: 850_000_000,
    last_updated_at: Date.now() / 1000,
  },
  'dai': {
    usd: 1.00,
    usd_24h_change: -0.03,
    usd_24h_vol: 8_500_000,
    usd_market_cap: 5_300_000_000,
    last_updated_at: Date.now() / 1000,
  },
  'coinbase-wrapped-staked-eth': {
    usd: 4021.30,
    usd_24h_change: 1.87,
    usd_24h_vol: 3_200_000,
    usd_market_cap: 425_000_000,
    last_updated_at: Date.now() / 1000,
  },
};
