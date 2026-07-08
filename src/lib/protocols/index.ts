/**
 * Protocol Adapters Registry
 * Tüm DEX adapter'larını yönetir
 */

import type { ILiquidityAdapter, DexId } from './types';
import { uniswapV3Adapter } from './uniswap/uniswap-v3-adapter';
import { aerodromeV2Adapter } from './aerodrome/aerodrome-v2-adapter';

/**
 * Kullanılabilir DEX'lerin registry'si
 */
export const LIQUIDITY_ADAPTERS: Record<DexId, ILiquidityAdapter> = {
  'uniswap-v3': uniswapV3Adapter,
  'aerodrome-v2': aerodromeV2Adapter,
  'aerodrome-cl': aerodromeV2Adapter, // TODO: Implement AerodromeCLAdapter
};

/**
 * DEX ID'sine göre adapter getir
 */
export function getAdapter(dexId: DexId): ILiquidityAdapter {
  return LIQUIDITY_ADAPTERS[dexId];
}

/**
 * Tüm adapter'ları getir
 */
export function getAllAdapters(): ILiquidityAdapter[] {
  return Object.values(LIQUIDITY_ADAPTERS);
}

/**
 * DEX seçenekleri (UI için)
 */
export const DEX_OPTIONS = [
  {
    id: 'uniswap-v3' as DexId,
    name: 'Uniswap V3',
    logo: 'https://assets.coingecko.com/coins/images/12504/standard/uni.jpg',
    description: 'Concentrated liquidity DEX',
    color: '#FF007A',
  },
  {
    id: 'aerodrome-v2' as DexId,
    name: 'Aerodrome',
    logo: 'https://assets.coingecko.com/coins/images/31745/standard/token.png',
    description: "Base's native liquidity hub",
    color: '#0052FF',
  },
] as const;

// Re-export types
export * from './types';
