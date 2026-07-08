/**
 * Liquidity Protocol Adapter Types
 * Ortak interface ile farklı DEX'ler arasında geçiş yapılabilir
 */

import type { Address } from 'viem';

export type DexId = 'uniswap-v3' | 'aerodrome-v2' | 'aerodrome-cl';

export interface PoolInfo {
  id: string;
  dexId: DexId;
  dexName: string;
  token0: {
    address: Address;
    symbol: string;
    decimals: number;
    logo: string;
  };
  token1: {
    address: Address;
    symbol: string;
    decimals: number;
    logo: string;
  };
  fee: number; // basis points (e.g., 3000 = 0.3%)
  feeFormatted: string; // "0.30%"
  poolType: 'volatile' | 'stable' | 'concentrated';
  poolAddress: Address;
  tvl: number; // USD
  apr: number; // percentage
  volume24h: number; // USD
  // Aerodrome specific
  isGauge?: boolean;
  gaugeAddress?: Address;
  emissionApr?: number; // AERO emission APR
}

export interface PositionInfo {
  id: string; // tokenId for NFT positions, or poolAddress for LP tokens
  dexId: DexId;
  dexName: string;
  poolAddress: Address;
  token0: {
    address: Address;
    symbol: string;
    decimals: number;
    logo: string;
    amount: string; // formatted amount
  };
  token1: {
    address: Address;
    symbol: string;
    decimals: number;
    logo: string;
    amount: string;
  };
  liquidity: string; // liquidity value
  feeFormatted: string; // "0.30%"
  currentValue: number; // USD
  feesEarned0: string;
  feesEarned1: string;
  apr: number;
  // CL specific (Uniswap V3 / Aerodrome CL)
  isNFT?: boolean;
  tokenId?: string;
  tickLower?: number;
  tickUpper?: number;
  inRange?: boolean;
  // V2 specific (Aerodrome V2)
  lpTokenAddress?: Address;
  lpTokenBalance?: string;
  // Aerodrome specific
  isStaked?: boolean;
  stakedAmount?: string;
  pendingRewards?: string; // AERO rewards
  ownerAddress?: Address;
}

export interface AddLiquidityParams {
  token0: Address;
  token1: Address;
  amount0: string;
  amount1: string;
  decimals0: number;
  decimals1: number;
  userAddress: Address;
  slippageBps: number;
  deadline?: number;
  // CL specific
  tickLower?: number;
  tickUpper?: number;
  // V2 specific
  stable?: boolean;
}

export interface IncreaseLiquidityParams {
  positionId: string; // tokenId or poolAddress
  amount0: string;
  amount1: string;
  decimals0: number;
  decimals1: number;
  slippageBps: number;
  deadline?: number;
}

export interface DecreaseLiquidityParams {
  positionId: string;
  liquidity: string; // amount to remove (percentage or absolute)
  slippageBps: number;
  deadline?: number;
  token0?: Address;
  token1?: Address;
  stable?: boolean;
  recipient?: Address;
}

export interface CollectFeesParams {
  positionId: string;
  userAddress: Address;
  token0?: Address;
  token1?: Address;
  poolAddress?: Address;
}

export interface TransactionRequest {
  to: Address;
  data: `0x${string}`;
  value?: bigint;
}

/**
 * Liquidity Adapter Interface
 * Her DEX bu interface'i implement eder
 */
export interface ILiquidityAdapter {
  readonly dexId: DexId;
  readonly dexName: string;
  
  /**
   * Havuz listesini getir
   * @param tokenA - Opsiyonel token filtresi
   * @param tokenB - Opsiyonel token filtresi
   */
  getPools(params?: { tokenA?: Address; tokenB?: Address }): Promise<PoolInfo[]>;
  
  /**
   * Kullanıcının pozisyonlarını getir
   */
  getUserPositions(owner: Address): Promise<PositionInfo[]>;
  
  /**
   * Likidite ekleme transaction'larını oluştur
   * @returns Approve + Mint/Deposit transaction'ları
   */
  buildAddLiquidityTx(params: AddLiquidityParams): Promise<TransactionRequest[]>;
  
  /**
   * Likidite artırma transaction'ını oluştur
   */
  buildIncreaseLiquidityTx(params: IncreaseLiquidityParams): Promise<TransactionRequest[]>;
  
  /**
   * Likidite azaltma transaction'ını oluştur
   */
  buildDecreaseLiquidityTx(params: DecreaseLiquidityParams): Promise<TransactionRequest>;
  
  /**
   * Fee toplama transaction'ını oluştur
   */
  buildCollectFeesTx(params: CollectFeesParams): Promise<TransactionRequest>;
}
