'use client'

import { useCallback } from 'react'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { type Hex, parseUnits } from 'viem'

export interface SwapExecutionParams {
  tokenIn: { address: string; decimals: number }
  tokenOut: { address: string; decimals: number }
  amountIn: string
  quote: {
    dex: string
    amountOut: bigint
    amountOutFormatted: string
    fee: string
    priceImpact: number
  }
  slippage: number
}

export function useSwapExecution() {
  const { address } = useAccount()
  const { sendTransactionAsync, data: hash, isPending, isError, error } = useSendTransaction()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const executeSwap = useCallback(
    async (params: SwapExecutionParams) => {
      if (!address) {
        throw new Error('Wallet not connected')
      }

      const amountInRaw = parseUnits(params.amountIn, params.tokenIn.decimals).toString()
      const body = JSON.stringify({
        tokenIn: params.tokenIn.address,
        tokenOut: params.tokenOut.address,
        tokenInDecimals: params.tokenIn.decimals,
        amountInRaw,
        amountOutRaw: params.quote.amountOut.toString(),
        dex: params.quote.dex,
        fee: params.quote.fee,
        slippage: params.slippage,
        userAddress: address,
      })

      const response = await fetch('/api/swap/execute-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (!response.ok) {
        const json = await response.json()
        throw new Error(json?.error || 'Swap execute failed')
      }

      const result = await response.json() as {
        to: `0x${string}`
        data: Hex
        value: string
      }

      const tx = await sendTransactionAsync({
        to: result.to,
        data: result.data,
        ...(result.value && BigInt(result.value) > 0n ? { value: BigInt(result.value) } : {}),
      })

      return tx
    },
    [address, sendTransactionAsync]
  )

  return {
    executeSwap,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
  }
}
