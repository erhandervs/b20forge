'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, type Address } from 'viem';

/**
 * Aerodrome Router Address for Liquidity
 */
export const AERODROME_ROUTER_ADDRESS = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' as const;
export const AERODROME_FACTORY_ADDRESS = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da' as const;
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const;

/**
 * Aerodrome Router ABI for Liquidity
 */
export const AERODROME_LIQUIDITY_ABI = [
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
    name: 'addLiquidityETH',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'stable', type: 'bool' },
      { name: 'amountTokenDesired', type: 'uint256' },
      { name: 'amountTokenMin', type: 'uint256' },
      { name: 'amountETHMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountToken', type: 'uint256' },
      { name: 'amountETH', type: 'uint256' },
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
  {
    name: 'removeLiquidityETH',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'stable', type: 'bool' },
      { name: 'liquidity', type: 'uint256' },
      { name: 'amountTokenMin', type: 'uint256' },
      { name: 'amountETHMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountToken', type: 'uint256' },
      { name: 'amountETH', type: 'uint256' },
    ],
  },
] as const;

/**
 * Hook to add liquidity to Aerodrome
 */
export function useAerodromeLiquidity() {
  const { writeContract, data: hash, isPending, isError, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  /**
   * Add liquidity for token pair
   */
  const addLiquidity = async (
    tokenA: Address,
    tokenB: Address,
    amountA: string,
    amountB: string,
    decimalsA: number,
    decimalsB: number,
    userAddress: Address,
    stable: boolean = false,
    slippageBps: number = 50 // 0.5% default
  ) => {
    const amountAWei = parseUnits(amountA, decimalsA);
    const amountBWei = parseUnits(amountB, decimalsB);
    
    // Apply slippage tolerance to minimum amounts
    const amountAMin = (amountAWei * BigInt(10000 - slippageBps)) / BigInt(10000);
    const amountBMin = (amountBWei * BigInt(10000 - slippageBps)) / BigInt(10000);
    
    // Deadline: 20 minutes from now
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    
    return writeContract({
      address: AERODROME_ROUTER_ADDRESS,
      abi: AERODROME_LIQUIDITY_ABI,
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
  };

  /**
   * Add liquidity for ETH/Token pair
   */
  const addLiquidityETH = async (
    token: Address,
    amountToken: string,
    amountETH: string,
    decimalsToken: number,
    userAddress: Address,
    stable: boolean = false,
    slippageBps: number = 50
  ) => {
    const amountTokenWei = parseUnits(amountToken, decimalsToken);
    const amountETHWei = parseUnits(amountETH, 18);
    
    const amountTokenMin = (amountTokenWei * BigInt(10000 - slippageBps)) / BigInt(10000);
    const amountETHMin = (amountETHWei * BigInt(10000 - slippageBps)) / BigInt(10000);
    
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    
    return writeContract({
      address: AERODROME_ROUTER_ADDRESS,
      abi: AERODROME_LIQUIDITY_ABI,
      functionName: 'addLiquidityETH',
      args: [
        token,
        stable,
        amountTokenWei,
        amountTokenMin,
        amountETHMin,
        userAddress,
        deadline,
      ],
      value: amountETHWei,
    });
  };

  /**
   * Remove liquidity from token pair
   */
  const removeLiquidity = async (
    tokenA: Address,
    tokenB: Address,
    liquidityAmount: string,
    amountAMin: string,
    amountBMin: string,
    decimalsA: number,
    decimalsB: number,
    userAddress: Address,
    stable: boolean = false
  ) => {
    const liquidityWei = parseUnits(liquidityAmount, 18); // LP tokens have 18 decimals
    const amountAMinWei = parseUnits(amountAMin, decimalsA);
    const amountBMinWei = parseUnits(amountBMin, decimalsB);
    
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    
    return writeContract({
      address: AERODROME_ROUTER_ADDRESS,
      abi: AERODROME_LIQUIDITY_ABI,
      functionName: 'removeLiquidity',
      args: [
        tokenA,
        tokenB,
        stable,
        liquidityWei,
        amountAMinWei,
        amountBMinWei,
        userAddress,
        deadline,
      ],
    });
  };

  /**
   * Remove liquidity from ETH/Token pair
   */
  const removeLiquidityETH = async (
    token: Address,
    liquidityAmount: string,
    amountTokenMin: string,
    amountETHMin: string,
    decimalsToken: number,
    userAddress: Address,
    stable: boolean = false
  ) => {
    const liquidityWei = parseUnits(liquidityAmount, 18);
    const amountTokenMinWei = parseUnits(amountTokenMin, decimalsToken);
    const amountETHMinWei = parseUnits(amountETHMin, 18);
    
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    
    return writeContract({
      address: AERODROME_ROUTER_ADDRESS,
      abi: AERODROME_LIQUIDITY_ABI,
      functionName: 'removeLiquidityETH',
      args: [
        token,
        stable,
        liquidityWei,
        amountTokenMinWei,
        amountETHMinWei,
        userAddress,
        deadline,
      ],
    });
  };

  return {
    addLiquidity,
    addLiquidityETH,
    removeLiquidity,
    removeLiquidityETH,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
  };
}
