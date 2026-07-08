/**
 * Liquidity Protocol Hooks
 * DEX-agnostic hooks for liquidity management
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';

import { 
  getAdapter,
  getAllAdapters,
  DEX_OPTIONS,
} from './protocols';

import type { DexId, PoolInfo, PositionInfo } from './protocols/types';

// Re-export protocol types for consumers
export type { DexId, PoolInfo, PositionInfo } from './protocols/types';

const LIQUIDITY_POSITIONS_STORAGE_KEY = 'b20:liquidity-positions';

function readStoredPositions(): PositionInfo[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(LIQUIDITY_POSITIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredPositions(positions: PositionInfo[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LIQUIDITY_POSITIONS_STORAGE_KEY, JSON.stringify(positions));
  window.dispatchEvent(new Event('b20:liquidity-updated'));
}

export function addStoredLiquidityPosition(position: PositionInfo) {
  const positions = readStoredPositions();
  const next = [position, ...positions.filter(item => item.id !== position.id)];
  writeStoredPositions(next);
  return next;
}

export function removeStoredLiquidityPosition(positionId: string) {
  const positions = readStoredPositions().filter(item => item.id !== positionId);
  writeStoredPositions(positions);
  return positions;
}


/**
 * DEX seçici hook
 * Kullanıcının seçtiği DEX'i yönetir ve otomatik en iyi DEX'i önerir
 */
export function useDexSelection(defaultDex?: DexId) {
  const [selectedDex, setSelectedDex] = useState<DexId>(defaultDex || 'aerodrome-v2');
  
  const adapter = useMemo(() => getAdapter(selectedDex), [selectedDex]);
  
  const dexOption = useMemo(
    () => DEX_OPTIONS.find(opt => opt.id === selectedDex),
    [selectedDex]
  );

  return {
    selectedDex,
    setSelectedDex,
    adapter,
    dexOption,
    availableDexes: DEX_OPTIONS,
  };
}

/**
 * Pool listesi hook
 * Seçili DEX'in havuzlarını getirir
 */
export function usePoolsData(dexId: DexId, filters?: { tokenA?: Address; tokenB?: Address }) {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const adapter = useMemo(() => getAdapter(dexId), [dexId]);

  const fetchPools = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const poolData = await adapter.getPools(filters);
      setPools(poolData ?? []);
    } catch (err) {
      console.error('Error fetching pools:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [adapter, filters]);

  useEffect(() => {
    const execute = async () => {
      await fetchPools();
    };

    execute();
  }, [fetchPools]);

  return {
    pools,
    isLoading,
    error,
    refetch: fetchPools,
  };
}

/**
 * Tüm DEX'lerden pool listesi (aggregated)
 */
export function useAllPoolsData(filters?: { tokenA?: Address; tokenB?: Address }) {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllPools = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const adapters = getAllAdapters();
      const poolPromises = adapters.map(adapter => adapter.getPools(filters));
      const allPoolData = await Promise.all(poolPromises);
      
      // Flatten and combine all pools
      const combined = allPoolData.flat().filter(Boolean) as PoolInfo[];
      
      // Sort by TVL descending
      combined.sort((a, b) => b.tvl - a.tvl);
      
      setPools(combined);
    } catch (err) {
      console.error('Error fetching all pools:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const execute = async () => {
      await fetchAllPools();
    };

    execute();
  }, [fetchAllPools]);

  return {
    pools,
    isLoading,
    error,
    refetch: fetchAllPools,
  };
}

/**
 * Kullanıcı pozisyonları hook
 * Seçili DEX'teki pozisyonları getirir
 */
export function useLiquidityPositions(dexId: DexId) {
  const { address } = useAccount();
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const adapter = useMemo(() => getAdapter(dexId), [dexId]);

  const fetchPositions = useCallback(async () => {
    if (!address) {
      setPositions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const positionData = await adapter.getUserPositions(address);
      setPositions(positionData ?? []);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [adapter, address]);

  useEffect(() => {
    const execute = async () => {
      await fetchPositions();
    };

    execute();
  }, [fetchPositions]);

  return {
    positions,
    isLoading,
    error,
    refetch: fetchPositions,
  };
}

/**
 * Tüm DEX'lerden kullanıcı pozisyonları (aggregated)
 */
export function useAllLiquidityPositions() {
  const { address } = useAccount();
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllPositions = useCallback(async () => {
    if (!address) {
      setPositions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const adapters = getAllAdapters();
      const positionPromises = adapters.map(adapter => adapter.getUserPositions(address));
      const allPositionData = await Promise.all(positionPromises);
      const adapterPositions = allPositionData.flat().filter(Boolean) as PositionInfo[];
      const storedPositions = readStoredPositions().filter(item => item.ownerAddress?.toLowerCase() === address.toLowerCase());
      const combined = [...storedPositions, ...adapterPositions];
      const uniqueById = new Map(combined.map(position => [position.id, position]));

      setPositions(Array.from(uniqueById.values()).sort((a, b) => b.currentValue - a.currentValue));
    } catch (err) {
      console.error('Error fetching all positions:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    const execute = async () => {
      await fetchAllPositions();
    };

    execute();

    const handleRefresh = () => {
      void fetchAllPositions();
    };

    window.addEventListener('b20:liquidity-updated', handleRefresh);
    return () => window.removeEventListener('b20:liquidity-updated', handleRefresh);
  }, [fetchAllPositions]);

  return {
    positions,
    isLoading,
    error,
    refetch: fetchAllPositions,
  };
}

/**
 * En iyi likidite DEX'ini öner (bir token pair için)
 * TVL ve APR'ye göre karar verir
 */
export function useBestDexForPair(tokenA?: Address, tokenB?: Address) {
  const { pools, isLoading } = useAllPoolsData(
    tokenA && tokenB ? { tokenA, tokenB } : undefined
  );

  const bestDex = useMemo(() => {
    if (!pools || pools.length === 0) return 'aerodrome-v2' as DexId;
    
    // En yüksek TVL'li pool'u bul
    const sorted = [...pools].sort((a, b) => b.tvl - a.tvl);
    return sorted[0].dexId;
  }, [pools]);

  const bestPool = useMemo(() => {
    if (!pools || pools.length === 0) return null;
    return [...pools].sort((a, b) => b.tvl - a.tvl)[0];
  }, [pools]);

  return {
    bestDex,
    bestPool,
    allPools: pools,
    isLoading,
  };
}

/**
 * Pool istatistikleri formatter
 */
export function formatPoolStats(pool: PoolInfo) {
  return {
    tvlFormatted: pool.tvl >= 1_000_000 
      ? `$${(pool.tvl / 1_000_000).toFixed(2)}M`
      : `$${(pool.tvl / 1_000).toFixed(0)}K`,
    aprFormatted: `${pool.apr.toFixed(2)}%`,
    volumeFormatted: pool.volume24h >= 1_000_000
      ? `$${(pool.volume24h / 1_000_000).toFixed(2)}M`
      : `$${(pool.volume24h / 1_000).toFixed(0)}K`,
    totalApr: pool.emissionApr ? pool.apr + pool.emissionApr : pool.apr,
  };
}

/**
 * Position istatistikleri formatter
 */
export function formatPositionStats(position: PositionInfo) {
  return {
    valueFormatted: position.currentValue >= 1_000
      ? `$${(position.currentValue / 1_000).toFixed(2)}K`
      : `$${position.currentValue.toFixed(2)}`,
    aprFormatted: `${position.apr.toFixed(2)}%`,
    token0Display: `${parseFloat(position.token0.amount).toFixed(6)} ${position.token0.symbol}`,
    token1Display: `${parseFloat(position.token1.amount).toFixed(6)} ${position.token1.symbol}`,
  };
}
