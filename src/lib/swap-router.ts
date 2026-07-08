'use client';

import { type Address } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useCallback } from 'react';

/**
 * Aerodrome Router on Base Mainnet
 */
export const AERODROME_ROUTER = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' as const;

/**
 * Aerodrome Router ABI (simplified)
 */
export const AERODROME_ROUTER_ABI = [
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'routes', type: 'tuple[]', components: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'stable', type: 'bool' },
      ]},
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
      { name: 'routes', type: 'tuple[]', components: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'stable', type: 'bool' },
      ]},
    ],
    outputs: [
      { name: 'amounts', type: 'uint256[]' },
    ],
  },
] as const;

export interface SwapRoute {
  from: Address;
  to: Address;
  stable: boolean;
}

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  amountOutMin: string; // with slippage
  priceImpact: number;
  route: SwapRoute[];
}

/**
 * Get swap quote from Aerodrome Router
 */
export async function getSwapQuote(
  amountIn: string,
  tokenInAddress: Address,
  tokenOutAddress: Address,
  tokenInDecimals: number,
  tokenOutDecimals: number,
  slippage: number = 0.5, // 0.5% default
  stable: boolean = false
): Promise<SwapQuote | null> {
  try {
    const route: SwapRoute[] = [{
      from: tokenInAddress,
      to: tokenOutAddress,
      stable,
    }];

    // In a real implementation, this would call the router contract
    // For now, we'll simulate the quote
    const mockAmountOut = simulateSwapQuote(
      Number(amountIn),
      tokenInAddress,
      tokenOutAddress
    );

    const amountOutFormatted = mockAmountOut.toFixed(tokenOutDecimals);
    const slippageMultiplier = 1 - (slippage / 100);
    const amountOutMin = (mockAmountOut * slippageMultiplier).toFixed(tokenOutDecimals);

    return {
      amountIn,
      amountOut: amountOutFormatted,
      amountOutMin,
      priceImpact: 0.15, // Mock 0.15% price impact
      route,
    };
  } catch (error) {
    console.error('Error getting swap quote:', error);
    return null;
  }
}

/**
 * Simulate swap quote (mock implementation)
 * In production, this would call the actual router contract
 */
function simulateSwapQuote(
  amountIn: number,
  tokenIn: Address,
  tokenOut: Address
): number {
  // Mock exchange rates based on common pairs
  const mockRates: Record<string, number> = {
    // WETH -> USDC
    '0x4200000000000000000000000000000000000006_0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': 3840,
    // USDC -> WETH
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913_0x4200000000000000000000000000000000000006': 1 / 3840,
    // USDC -> USDbC (1:1)
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913_0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA': 1,
    // USDbC -> USDC (1:1)
    '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA_0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': 1,
    // DAI -> USDC (1:1)
    '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb_0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': 1,
    // cbETH -> WETH (1.05:1)
    '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22_0x4200000000000000000000000000000000000006': 1.05,
  };

  const key = `${tokenIn}_${tokenOut}`;
  const rate = mockRates[key] || mockRates[key.toLowerCase()] || 1;
  
  // Apply 0.3% fee
  const fee = 0.003;
  return amountIn * rate * (1 - fee);
}

/**
 * Hook for swap functionality
 */
export function useSwap() {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);

  const { writeContract, data: hash, isPending, isError, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const fetchQuote = useCallback(async (
    amountIn: string,
    tokenInAddress: Address,
    tokenOutAddress: Address,
    tokenInDecimals: number,
    tokenOutDecimals: number,
    slippage?: number,
    stable?: boolean
  ) => {
    setIsQuoteLoading(true);
    const q = await getSwapQuote(
      amountIn,
      tokenInAddress,
      tokenOutAddress,
      tokenInDecimals,
      tokenOutDecimals,
      slippage,
      stable
    );
    setQuote(q);
    setIsQuoteLoading(false);
    return q;
  }, []);

  const executeSwap = useCallback(async (
    quote: SwapQuote,
    userAddress: Address,
    tokenInDecimals: number,
    tokenOutDecimals: number
  ) => {
    if (!quote) throw new Error('No quote available');

    const amountInWei = parseUnits(quote.amountIn, tokenInDecimals);
    const amountOutMinWei = parseUnits(quote.amountOutMin, tokenOutDecimals);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes

    return writeContract({
      address: AERODROME_ROUTER,
      abi: AERODROME_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [
        amountInWei,
        amountOutMinWei,
        quote.route,
        userAddress,
        deadline,
      ],
    });
  }, [writeContract]);

  return {
    quote,
    isQuoteLoading,
    fetchQuote,
    executeSwap,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
  };
}

/**
 * Calculate price impact
 */
export function calculatePriceImpact(
  amountIn: number,
  amountOut: number,
  expectedRate: number
): number {
  const actualRate = amountOut / amountIn;
  const impact = ((expectedRate - actualRate) / expectedRate) * 100;
  return Math.abs(impact);
}

/**
 * Format slippage tolerance
 */
export function formatSlippage(slippage: number): string {
  return `${slippage.toFixed(2)}%`;
}

/**
 * Calculate minimum received with slippage
 */
export function calculateMinReceived(
  amountOut: string,
  slippage: number
): string {
  const amount = parseFloat(amountOut);
  const slippageMultiplier = 1 - (slippage / 100);
  return (amount * slippageMultiplier).toFixed(6);
}
