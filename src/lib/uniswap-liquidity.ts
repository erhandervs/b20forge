'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, type Address } from 'viem';

/**
 * Uniswap V3 NonfungiblePositionManager Address on Base
 */
export const UNISWAP_V3_POSITION_MANAGER = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1' as const;
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const;

/**
 * Uniswap V3 NonfungiblePositionManager ABI (Simplified for adding liquidity)
 */
export const UNISWAP_V3_POSITION_MANAGER_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickLower', type: 'int24' },
          { name: 'tickUpper', type: 'int24' },
          { name: 'amount0Desired', type: 'uint256' },
          { name: 'amount1Desired', type: 'uint256' },
          { name: 'amount0Min', type: 'uint256' },
          { name: 'amount1Min', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
    ],
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
  {
    name: 'increaseLiquidity',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'amount0Desired', type: 'uint256' },
          { name: 'amount1Desired', type: 'uint256' },
          { name: 'amount0Min', type: 'uint256' },
          { name: 'amount1Min', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
    ],
    outputs: [
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
  {
    name: 'decreaseLiquidity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'liquidity', type: 'uint128' },
          { name: 'amount0Min', type: 'uint256' },
          { name: 'amount1Min', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
    ],
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
  {
    name: 'collect',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'amount0Max', type: 'uint128' },
          { name: 'amount1Max', type: 'uint128' },
        ],
      },
    ],
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
] as const;

/**
 * Fee tiers in Uniswap V3 (in hundredths of a bip, so 3000 = 0.30%)
 */
export const FEE_TIERS = {
  '0.01%': 100,
  '0.05%': 500,
  '0.30%': 3000,
  '1.00%': 10000,
} as const;

/**
 * Calculate tick range for full range position
 * Full range: -887220 to 887220 (for all fee tiers)
 */
export function getFullRangeTicks() {
  return {
    tickLower: -887220,
    tickUpper: 887220,
  };
}

/**
 * Hook to add/remove liquidity on Uniswap V3
 */
export function useUniswapV3Liquidity() {
  const { writeContract, data: hash, isPending, isError, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  /**
   * Add liquidity to Uniswap V3 pool
   * Creates a new NFT position
   */
  const addLiquidity = async (
    token0: Address,
    token1: Address,
    amount0: string,
    amount1: string,
    decimals0: number,
    decimals1: number,
    userAddress: Address,
    feeTier: '0.01%' | '0.05%' | '0.30%' | '1.00%' = '0.30%',
    slippageBps: number = 50 // 0.5% default
  ) => {
    // Ensure token0 < token1 (Uniswap requirement)
    const [sortedToken0, sortedToken1, sortedAmount0, sortedAmount1, sortedDecimals0, sortedDecimals1] =
      token0.toLowerCase() < token1.toLowerCase()
        ? [token0, token1, amount0, amount1, decimals0, decimals1]
        : [token1, token0, amount1, amount0, decimals1, decimals0];

    const amount0Wei = parseUnits(sortedAmount0, sortedDecimals0);
    const amount1Wei = parseUnits(sortedAmount1, sortedDecimals1);

    // Apply slippage tolerance to minimum amounts
    const amount0Min = (amount0Wei * BigInt(10000 - slippageBps)) / BigInt(10000);
    const amount1Min = (amount1Wei * BigInt(10000 - slippageBps)) / BigInt(10000);

    // Deadline: 20 minutes from now
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

    // Full range position
    const { tickLower, tickUpper } = getFullRangeTicks();

    // Replace native ETH (0x000...000) with WETH for Uniswap V3
    const finalToken0 = sortedToken0.toLowerCase() === '0x0000000000000000000000000000000000000000'
      ? WETH_ADDRESS
      : sortedToken0;
    const finalToken1 = sortedToken1.toLowerCase() === '0x0000000000000000000000000000000000000000'
      ? WETH_ADDRESS
      : sortedToken1;

    const params = {
      token0: finalToken0,
      token1: finalToken1,
      fee: FEE_TIERS[feeTier],
      tickLower,
      tickUpper,
      amount0Desired: amount0Wei,
      amount1Desired: amount1Wei,
      amount0Min,
      amount1Min,
      recipient: userAddress,
      deadline,
    };

    console.log('📝 Mint params:', {
      token0: finalToken0,
      token1: finalToken1,
      fee: FEE_TIERS[feeTier],
      amount0: amount0Wei.toString(),
      amount1: amount1Wei.toString(),
    });

    return writeContract({
      address: UNISWAP_V3_POSITION_MANAGER,
      abi: UNISWAP_V3_POSITION_MANAGER_ABI,
      functionName: 'mint',
      args: [params],
    } as Parameters<typeof writeContract>[0]);
  };

  /**
   * Increase liquidity on existing position
   */
  const increaseLiquidity = async (
    tokenId: bigint,
    amount0: string,
    amount1: string,
    decimals0: number,
    decimals1: number,
    slippageBps: number = 50
  ) => {
    const amount0Wei = parseUnits(amount0, decimals0);
    const amount1Wei = parseUnits(amount1, decimals1);

    const amount0Min = (amount0Wei * BigInt(10000 - slippageBps)) / BigInt(10000);
    const amount1Min = (amount1Wei * BigInt(10000 - slippageBps)) / BigInt(10000);

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

    const params = {
      tokenId,
      amount0Desired: amount0Wei,
      amount1Desired: amount1Wei,
      amount0Min,
      amount1Min,
      deadline,
    };

    return writeContract({
      address: UNISWAP_V3_POSITION_MANAGER,
      abi: UNISWAP_V3_POSITION_MANAGER_ABI,
      functionName: 'increaseLiquidity',
      args: [params],
    } as Parameters<typeof writeContract>[0]);
  };

  /**
   * Decrease liquidity from position
   */
  const decreaseLiquidity = async (
    tokenId: bigint,
    liquidity: bigint,
    _slippageBps: number = 50
  ) => {
    void _slippageBps;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

    const params = {
      tokenId,
      liquidity,
      amount0Min: BigInt(0), // Can calculate based on slippage
      amount1Min: BigInt(0),
      deadline,
    };

    return writeContract({
      address: UNISWAP_V3_POSITION_MANAGER,
      abi: UNISWAP_V3_POSITION_MANAGER_ABI,
      functionName: 'decreaseLiquidity',
      args: [params],
    } as Parameters<typeof writeContract>[0]);
  };

  /**
   * Collect fees and tokens from position
   */
  const collectFees = async (tokenId: bigint, userAddress: Address) => {
    const MAX_UINT128 = BigInt('0xffffffffffffffffffffffffffffffff');

    const params = {
      tokenId,
      recipient: userAddress,
      amount0Max: MAX_UINT128,
      amount1Max: MAX_UINT128,
    };

    return writeContract({
      address: UNISWAP_V3_POSITION_MANAGER,
      abi: UNISWAP_V3_POSITION_MANAGER_ABI,
      functionName: 'collect',
      args: [params],
    } as Parameters<typeof writeContract>[0]);
  };

  return {
    addLiquidity,
    increaseLiquidity,
    decreaseLiquidity,
    collectFees,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
  };
}
