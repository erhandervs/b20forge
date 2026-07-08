'use client'

import { useQuery } from '@tanstack/react-query'
import { parseUnits } from 'viem'
import { useMemo } from 'react'

const DEX_NAMES: Record<string, string> = {
  wrap: 'Wrap / Unwrap',
  aerodrome: 'Aerodrome',
  uniswap: 'Uniswap V3',
  sushiswap: 'SushiSwap',
  pancakeswap: 'PancakeSwap',
}

function formatDexName(value?: string) {
  if (!value) return 'DEX';
  return value
    .replace(/\s*\(https?:\/\/[^)]+\)\s*/gi, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SwapQuoteResult {
  dex: string
  dexName: string
  amountOut: bigint
  amountOutFormatted: string
  fee: string
  priceImpact: number
  gasEstimate?: bigint
  isBest: boolean
}

interface UseSwapQuotesParams {
  tokenIn: { address: string; decimals: number } | null
  tokenOut: { address: string; decimals: number } | null
  amountIn: string
  enabled: boolean
}

async function fetchQuotes(
  tokenIn: { address: string; decimals: number },
  tokenOut: { address: string; decimals: number },
  amountIn: string
): Promise<SwapQuoteResult[]> {
  if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) === 0) {
    return []
  }

  const amountInRaw = parseUnits(amountIn, tokenIn.decimals).toString()

  const response = await fetch('/api/quotes', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amountIn: amountInRaw,
      decimalsOut: tokenOut.decimals,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch swap quotes')
  }

  const data = await response.json() as {
    quotes?: Array<{
      dex: string
      dexName: string
      amountOut: string
      amountOutFormatted: string
      fee: string
      priceImpact: number
      isBest: boolean
    }>
    error?: string
  }

  if (!data.quotes) {
    return []
  }

  const sorted = [...data.quotes].sort((a, b) => {
    const aOut = BigInt(a.amountOut)
    const bOut = BigInt(b.amountOut)
    return aOut === bOut ? 0 : (aOut > bOut ? -1 : 1)
  })

  return sorted.map((quote, index) => ({
    dex: quote.dex,
    dexName: formatDexName(quote.dexName || DEX_NAMES[quote.dex] || quote.dex),
    amountOut: BigInt(quote.amountOut),
    amountOutFormatted: quote.amountOutFormatted,
    fee: quote.fee,
    priceImpact: quote.priceImpact,
    gasEstimate: BigInt(200000),
    isBest: index === 0,
  }))
}

export function useSwapQuotes({ tokenIn, tokenOut, amountIn, enabled }: UseSwapQuotesParams) {
  // Aggressive debouncing - only update when values actually change meaningfully
  const debouncedParams = useMemo(() => {
    const tokenInAddr = tokenIn?.address ?? null
    const tokenOutAddr = tokenOut?.address ?? null
    const amountTruncated = amountIn?.substring(0, 10) ?? '' // Only consider first 10 chars to avoid rapid re-queries
    
    return { tokenIn: tokenInAddr, tokenOut: tokenOutAddr, amountIn: amountTruncated }
  }, [tokenIn?.address, tokenOut?.address, amountIn])

  return useQuery({
    queryKey: ['swapQuotes', debouncedParams.tokenIn, debouncedParams.tokenOut, debouncedParams.amountIn],
    queryFn: () => fetchQuotes(tokenIn!, tokenOut!, amountIn),
    enabled: enabled && !!tokenIn && !!tokenOut && !!amountIn && amountIn !== '0',
    refetchInterval: 45_000, // Less frequent updates - 45 seconds
    staleTime: 8_000, // Cache for 8 seconds
    gcTime: 1_000 * 60 * 2, // Keep for 2 minutes
    retry: 1,
  })
}
