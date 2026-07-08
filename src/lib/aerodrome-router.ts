'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, type Address } from 'viem';

/**
 * Aerodrome Router V2 on Base Mainnet
 * @see https://aerodrome.finance
 */
export const AERODROME_ROUTER_ADDRESS = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' as const;

/**
 * Aerodrome Router ABI - Simplified for swap operations
 */
export const AERODROME_ROUTER_ABI = [
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { 
        name: 'routes', 
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' },
        ],
      },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amounts', type: 'uint256[]' },
    ],
  },
  {
    name: 'swapExactETHForTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { 
        name: 'routes', 
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' },
        ],
      },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amounts', type: 'uint256[]' },
    ],
  },
  {
    name: 'swapExactTokensForETH',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { 
        name: 'routes', 
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' },
        ],
      },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amounts', type: 'uint256[]' },
    ],
  },
  {
    name: 'getAmountsOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { 
        name: 'routes', 
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' },
        ],
      },
    ],
    outputs: [
      { name: 'amounts', type: 'uint256[]' },
    ],
  },
] as const;

/**
 * Aerodrome Factory Address (for routes)
 */
export const AERODROME_FACTORY_ADDRESS = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da' as const;

/**
 * WETH Address on Base
 */
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const;

/**
 * Create route for swap
 */
export function createSwapRoute(
  fromToken: Address,
  toToken: Address,
  stable: boolean = false
) {
  return {
    from: fromToken,
    to: toToken,
    stable,
    factory: AERODROME_FACTORY_ADDRESS,
  };
}

/**
 * Hook to perform token swap on Aerodrome
 */
export function useAerodromeSwap() {
  const { writeContract, data: hash, isPending, isError, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Swap exact tokens for tokens
   */
  const swapTokens = async (
    fromToken: Address,
    toToken: Address,
    amountIn: string,
    amountOutMin: string,
    fromDecimals: number,
    toDecimals: number,
    userAddress: Address,
    slippageBps: number = 50, // 0.5% default
    stable: boolean = false
  ) => {
    const amountInWei = parseUnits(amountIn, fromDecimals);
    const amountOutMinWei = parseUnits(amountOutMin, toDecimals);
    
    // Apply slippage tolerance
    const amountOutMinWithSlippage = (amountOutMinWei * BigInt(10000 - slippageBps)) / BigInt(10000);
    
    // Deadline: 20 minutes from now
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    
    const routes = [createSwapRoute(fromToken, toToken, stable)];
    
    return writeContract({
      address: AERODROME_ROUTER_ADDRESS,
      abi: AERODROME_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountInWei, amountOutMinWithSlippage, routes, userAddress, deadline],
    });
  };

  /**
   * Swap ETH for tokens
   */
  const swapETHForTokens = async (
    toToken: Address,
    amountIn: string, // ETH amount
    amountOutMin: string,
    toDecimals: number,
    userAddress: Address,
    slippageBps: number = 50,
    stable: boolean = false
  ) => {
    const amountInWei = parseUnits(amountIn, 18); // ETH has 18 decimals
    const amountOutMinWei = parseUnits(amountOutMin, toDecimals);
    const amountOutMinWithSlippage = (amountOutMinWei * BigInt(10000 - slippageBps)) / BigInt(10000);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    
    const routes = [createSwapRoute(WETH_ADDRESS, toToken, stable)];
    
    return writeContract({
      address: AERODROME_ROUTER_ADDRESS,
      abi: AERODROME_ROUTER_ABI,
      functionName: 'swapExactETHForTokens',
      args: [amountOutMinWithSlippage, routes, userAddress, deadline],
      value: amountInWei,
    });
  };

  /**
   * Swap tokens for ETH
   */
  const swapTokensForETH = async (
    fromToken: Address,
    amountIn: string,
    amountOutMin: string, // ETH amount
    fromDecimals: number,
    userAddress: Address,
    slippageBps: number = 50,
    stable: boolean = false
  ) => {
    const amountInWei = parseUnits(amountIn, fromDecimals);
    const amountOutMinWei = parseUnits(amountOutMin, 18);
    const amountOutMinWithSlippage = (amountOutMinWei * BigInt(10000 - slippageBps)) / BigInt(10000);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    
    const routes = [createSwapRoute(fromToken, WETH_ADDRESS, stable)];
    
    return writeContract({
      address: AERODROME_ROUTER_ADDRESS,
      abi: AERODROME_ROUTER_ABI,
      functionName: 'swapExactTokensForETH',
      args: [amountInWei, amountOutMinWithSlippage, routes, userAddress, deadline],
    });
  };

  return {
    swapTokens,
    swapETHForTokens,
    swapTokensForETH,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
  };
}
