/**
 * Liquidity Service
 * Business logic for liquidity management across multiple DEXes
 * Separates DEX operations from UI components
 */

import type { Address, PublicClient, WalletClient } from 'viem';
import type { 
  PoolInfo, 
  PositionInfo,
  AddLiquidityParams,
  DexId,
} from '@/lib/protocols/types';
import { getAdapter } from '@/lib/protocols';

export interface LiquidityServiceOptions {
  publicClient: PublicClient;
  walletClient?: WalletClient;
}

/**
 * Liquidity Service Class
 * Handles all liquidity operations across DEXes
 */
export class LiquidityService {
  constructor(private options: LiquidityServiceOptions) {}

  /**
   * Get pools from a specific DEX
   */
  async getPools(
    dexId: DexId,
    filters?: { tokenA?: Address; tokenB?: Address }
  ): Promise<PoolInfo[]> {
    const adapter = getAdapter(dexId);
    return adapter.getPools(filters);
  }

  /**
   * Get pools from all DEXes
   */
  async getAllPools(
    filters?: { tokenA?: Address; tokenB?: Address }
  ): Promise<PoolInfo[]> {
    // Get all adapters and fetch pools in parallel
    const dexIds: DexId[] = ['uniswap-v3', 'aerodrome-v2'];
    
    const poolPromises = dexIds.map(dexId => 
      this.getPools(dexId, filters).catch(err => {
        console.error(`Failed to fetch pools from ${dexId}:`, err);
        return [];
      })
    );

    const allPools = await Promise.all(poolPromises);
    
    // Flatten and sort by TVL
    return allPools.flat().sort((a, b) => b.tvl - a.tvl);
  }

  /**
   * Get user positions from a specific DEX
   */
  async getUserPositions(
    dexId: DexId,
    userAddress: Address
  ): Promise<PositionInfo[]> {
    const adapter = getAdapter(dexId);
    return adapter.getUserPositions(userAddress);
  }

  /**
   * Get user positions from all DEXes
   */
  async getAllUserPositions(userAddress: Address): Promise<PositionInfo[]> {
    const dexIds: DexId[] = ['uniswap-v3', 'aerodrome-v2'];
    
    const positionPromises = dexIds.map(dexId =>
      this.getUserPositions(dexId, userAddress).catch(err => {
        console.error(`Failed to fetch positions from ${dexId}:`, err);
        return [];
      })
    );

    const allPositions = await Promise.all(positionPromises);
    
    // Flatten and sort by value
    return allPositions.flat().sort((a, b) => b.currentValue - a.currentValue);
  }

  /**
   * Add liquidity to a pool
   */
  async addLiquidity(
    dexId: DexId,
    params: AddLiquidityParams
  ): Promise<{
    success: boolean;
    txHashes?: `0x${string}`[];
    error?: string;
  }> {
    try {
      if (!this.options.walletClient) {
        throw new Error('Wallet client not available');
      }

      const adapter = getAdapter(dexId);
      
      // Build transactions
      const transactions = await adapter.buildAddLiquidityTx(params);

      // Execute transactions sequentially
      const txHashes: `0x${string}`[] = [];

      for (const tx of transactions) {
        // Simulate transaction first
        await this.options.publicClient.simulateContract({
          address: tx.to,
          data: tx.data,
          value: tx.value,
          account: params.userAddress,
        });

        // Execute transaction
        const hash = await this.options.walletClient.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value,
          account: params.userAddress,
        });

        txHashes.push(hash);

        // Wait for confirmation before next transaction
        await this.options.publicClient.waitForTransactionReceipt({ hash });
      }

      return {
        success: true,
        txHashes,
      };
    } catch (error) {
      console.error('Add liquidity failed:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Remove liquidity from a position
   */
  async removeLiquidity(
    dexId: DexId,
    positionId: string,
    liquidity: string,
    slippageBps: number,
    userAddress: Address,
    context?: {
      token0?: Address;
      token1?: Address;
      stable?: boolean;
      recipient?: Address;
    }
  ): Promise<{
    success: boolean;
    txHash?: `0x${string}`;
    error?: string;
  }> {
    try {
      if (!this.options.walletClient) {
        throw new Error('Wallet client not available');
      }

      const adapter = getAdapter(dexId);
      
      // Build transaction
      const tx = await adapter.buildDecreaseLiquidityTx({
        positionId,
        liquidity,
        slippageBps,
        token0: context?.token0,
        token1: context?.token1,
        stable: context?.stable,
        recipient: context?.recipient ?? userAddress,
      });

      // Simulate
      await this.options.publicClient.simulateContract({
        address: tx.to,
        data: tx.data,
        account: userAddress,
      } as Parameters<PublicClient['simulateContract']>[0]);

      // Execute
      const hash = await this.options.walletClient.sendTransaction({
        to: tx.to,
        data: tx.data,
        account: userAddress,
      } as Parameters<WalletClient['sendTransaction']>[0]);

      // Wait for confirmation
      await this.options.publicClient.waitForTransactionReceipt({ hash });

      return {
        success: true,
        txHash: hash,
      };
    } catch (error) {
      console.error('Remove liquidity failed:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Collect fees from a position
   */
  async collectFees(
    dexId: DexId,
    positionId: string,
    userAddress: Address,
    context?: {
      token0?: Address;
      token1?: Address;
      poolAddress?: Address;
    }
  ): Promise<{
    success: boolean;
    txHash?: `0x${string}`;
    error?: string;
  }> {
    try {
      if (!this.options.walletClient) {
        throw new Error('Wallet client not available');
      }

      const adapter = getAdapter(dexId);
      
      // Build transaction
      const tx = await adapter.buildCollectFeesTx({
        positionId,
        userAddress,
        token0: context?.token0,
        token1: context?.token1,
        poolAddress: context?.poolAddress,
      });

      // Simulate
      await this.options.publicClient.simulateContract({
        address: tx.to,
        data: tx.data,
        account: userAddress,
      } as Parameters<PublicClient['simulateContract']>[0]);

      // Execute
      const hash = await this.options.walletClient.sendTransaction({
        to: tx.to,
        data: tx.data,
        account: userAddress,
      } as Parameters<WalletClient['sendTransaction']>[0]);

      // Wait for confirmation
      await this.options.publicClient.waitForTransactionReceipt({ hash });

      return {
        success: true,
        txHash: hash,
      };
    } catch (error) {
      console.error('Collect fees failed:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Find best DEX for a token pair based on TVL
   */
  async findBestDex(
    tokenA: Address,
    tokenB: Address
  ): Promise<{ dexId: DexId; pool: PoolInfo } | null> {
    const pools = await this.getAllPools({ tokenA, tokenB });
    
    if (pools.length === 0) return null;
    
    // Sort by TVL and return best
    const bestPool = pools.sort((a, b) => b.tvl - a.tvl)[0];
    
    return {
      dexId: bestPool.dexId,
      pool: bestPool,
    };
  }
}

/**
 * Create Liquidity Service instance
 */
export function createLiquidityService(
  options: LiquidityServiceOptions
): LiquidityService {
  return new LiquidityService(options);
}
