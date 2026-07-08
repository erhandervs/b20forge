import { type NextRequest, NextResponse } from 'next/server'
import { encodeFunctionData, type Hex } from 'viem'
import { AERODROME_ROUTER_ABI, AERODROME_V2_CONTRACTS } from '@/lib/protocols/aerodrome/contracts'

const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as const
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const

const WETH_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'wad', type: 'uint256' }],
    outputs: [],
  },
] as const

interface ExecuteRequest {
  tokenIn: string
  tokenOut: string
  tokenInDecimals: number
  amountInRaw: string
  amountOutRaw: string
  dex: string
  fee: string
  slippage: number
  userAddress: string
}

function applySlippage(amount: bigint, slippage: number) {
  const slippageBps = Math.round(slippage * 100)
  return (amount * BigInt(10000 - slippageBps)) / BigInt(10000)
}

function getDeadline(minutes = 20) {
  return BigInt(Math.floor(Date.now() / 1000) + minutes * 60)
}

export async function executeSwapHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ExecuteRequest
    const { tokenIn, tokenOut, amountInRaw, amountOutRaw, dex, slippage, userAddress } = body

    if (!tokenIn || !tokenOut || !amountInRaw || !amountOutRaw || !dex || !userAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const amountInParsed = BigInt(amountInRaw)
    const amountOut = BigInt(amountOutRaw)
    const amountOutMin = applySlippage(amountOut, slippage ?? 50)
    const deadline = getDeadline(20)
    const user = userAddress as `0x${string}`
    const isETHIn = tokenIn.toLowerCase() === ETH_ADDRESS
    const isETHOut = tokenOut.toLowerCase() === ETH_ADDRESS

    let to: `0x${string}`
    let data: Hex
    let value = '0'

    if (dex === 'wrap') {
      to = WETH_ADDRESS
      if (isETHIn) {
        data = encodeFunctionData({ abi: WETH_ABI, functionName: 'deposit' })
        value = amountInParsed.toString()
      } else {
        data = encodeFunctionData({ abi: WETH_ABI, functionName: 'withdraw', args: [amountInParsed] })
      }
    } else if (['aerodrome', 'uniswap', 'sushiswap', 'pancakeswap'].includes(dex)) {
      const resolvedIn = isETHIn ? WETH_ADDRESS : tokenIn as `0x${string}`
      const resolvedOut = isETHOut ? WETH_ADDRESS : tokenOut as `0x${string}`
      const route = [{
        from: resolvedIn,
        to: resolvedOut,
        stable: false,
        factory: AERODROME_V2_CONTRACTS.FACTORY,
      }]

      to = AERODROME_V2_CONTRACTS.ROUTER
      if (isETHIn) {
        data = encodeFunctionData({
          abi: AERODROME_ROUTER_ABI,
          functionName: 'swapExactETHForTokens',
          args: [amountOutMin, route, user, deadline],
        })
        value = amountInParsed.toString()
      } else if (isETHOut) {
        data = encodeFunctionData({
          abi: AERODROME_ROUTER_ABI,
          functionName: 'swapExactTokensForETH',
          args: [amountInParsed, amountOutMin, route, user, deadline],
        })
      } else {
        data = encodeFunctionData({
          abi: AERODROME_ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [amountInParsed, amountOutMin, route, user, deadline],
        })
      }
    } else {
      return NextResponse.json({ error: 'Unsupported dex' }, { status: 400 })
    }

    return NextResponse.json({
      to: to!,
      data: data!,
      value,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
