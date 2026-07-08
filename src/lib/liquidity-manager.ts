'use client';

import { type Address, parseUnits } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useCallback } from 'react';
import { AERODROME_ROUTER } from './swap-router';

/**
 * Aerodrome Pool ABI (simplified for liquidity operations)
 */
export const AERODROME_POOL_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getReserves',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint256' },
      { name: 'reserve1', type: 'uint256' },
      { name: 'blockTimestampLast', type: 'uint256' },
    ],
  },
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'token1',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

/**
 * Extended Router ABI for liquidity operations
 */
export const LIQUIDITY_ROUTER_ABI = [
  {
    name: 'addLiquidity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'stable', type: 'bool' },
      { name: 'amountADesired', type: 'uint256' },
      { name: 'amountBDesired', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'amountB', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
    ],
  },
  {
    name: 'removeLiquidity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'stable', type: 'bool' },
      { name: 'liquidity', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'amountB', type: 'uint256' },
    ],
  },
] as const;

export interface AddLiquidityParams {
  tokenA: Address;
  tokenB: Address;
  amountA: string;
  amountB: string;
  decimalsA: number;
  decimalsB: number;
  slippage: number; // percentage (e.g., 0.5 for 0.5%)
  stable: boolean;
  userAddress: Address;
}

export interface RemoveLiquidityParams {
  tokenA: Address;
  tokenB: Address;
  lpTokenAmount: string;
  decimals: number;
  slippage: number;
  stable: boolean;
  userAddress: Address;
}

/**
 * Hook for liquidity management
 */
export function useLiquidityManager() {
  const [isProcessing, setIsProcessing] = useState(false);

  const { writeContract, data: hash, isPending, isError, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Add liquidity to a pool
   */
  const addLiquidity = useCallback(async (params: AddLiquidityParams) => {
    setIsProcessing(true);
    try {
      const {
        tokenA,
        tokenB,
        amountA,
        amountB,
        decimalsA,
        decimalsB,
        slippage,
        stable,
        userAddress,
      } = params;

      // Parse amounts to wei
      const amountAWei = parseUnits(amountA, decimalsA);
      const amountBWei = parseUnits(amountB, decimalsB);

      // Calculate minimum amounts with slippage
      const slippageMultiplier = 1 - (slippage / 100);
      const amountAMin = BigInt(Math.floor(Number(amountAWei) * slippageMultiplier));
      const amountBMin = BigInt(Math.floor(Number(amountBWei) * slippageMultiplier));

      // Deadline: 20 minutes from now
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

      const result = await writeContract({
        address: AERODROME_ROUTER,
        abi: LIQUIDITY_ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [
          tokenA,
          tokenB,
          stable,
          amountAWei,
          amountBWei,
          amountAMin,
          amountBMin,
          userAddress,
          deadline,
        ],
      });

      setIsProcessing(false);
      return result;
    } catch (err) {
      setIsProcessing(false);
      throw err;
    }
  }, [writeContract]);

  /**
   * Remove liquidity from a pool
   */
  const removeLiquidity = useCallback(async (params: RemoveLiquidityParams) => {
    setIsProcessing(true);
    try {
      const {
        tokenA,
        tokenB,
        lpTokenAmount,
        decimals,
        stable,
        userAddress,
      } = params;

      // Parse LP token amount
      const liquidityWei = parseUnits(lpTokenAmount, decimals);

      // For remove, we set minimums to 0 for simplicity (or calculate based on reserves)
      const amountAMin = BigInt(0);
      const amountBMin = BigInt(0);

      // Deadline: 20 minutes from now
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

      const result = await writeContract({
        address: AERODROME_ROUTER,
        abi: LIQUIDITY_ROUTER_ABI,
        functionName: 'removeLiquidity',
        args: [
          tokenA,
          tokenB,
          stable,
          liquidityWei,
          amountAMin,
          amountBMin,
          userAddress,
          deadline,
        ],
      });

      setIsProcessing(false);
      return result;
    } catch (err) {
      setIsProcessing(false);
      throw err;
    }
  }, [writeContract]);

  return {
    addLiquidity,
    removeLiquidity,
    hash,
    isPending: isPending || isProcessing,
    isConfirming,
    isSuccess,
    isError,
    error,
  };
}

/**
 * Calculate optimal amounts for adding liquidity
 */
export function calculateOptimalAmounts(
  amountA: number,
  amountB: number,
  reserve0: number,
  reserve1: number
): { optimalA: number; optimalB: number } {
  if (reserve0 === 0 || reserve1 === 0) {
    // New pool, amounts are as provided
    return { optimalA: amountA, optimalB: amountB };
  }

  // Calculate optimal amount B based on amount A
  const optimalB = (amountA * reserve1) / reserve0;
  
  if (optimalB <= amountB) {
    return { optimalA: amountA, optimalB };
  }

  // Calculate optimal amount A based on amount B
  const optimalA = (amountB * reserve0) / reserve1;
  return { optimalA, optimalB: amountB };
}

/**
 * Calculate share of pool
 */
export function calculatePoolShare(
  liquidity: number,
  totalLiquidity: number
): number {
  if (totalLiquidity === 0) return 0;
  return (liquidity / totalLiquidity) * 100;
}

/**
 * Estimate LP tokens to receive
 */
export function estimateLPTokens(
  amountA: number,
  amountB: number,
  reserve0: number,
  reserve1: number,
  totalSupply: number
): number {
  if (totalSupply === 0) {
    // First liquidity provider
    return Math.sqrt(amountA * amountB);
  }

  const liquidityA = (amountA * totalSupply) / reserve0;
  const liquidityB = (amountB * totalSupply) / reserve1;
  
  return Math.min(liquidityA, liquidityB);
}
