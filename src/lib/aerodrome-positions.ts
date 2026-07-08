'use client';

import { useReadContracts } from 'wagmi';
import { formatUnits, type Address } from 'viem';
import { useMemo } from 'react';
import { AERODROME_FACTORY_ADDRESS } from './aerodrome-liquidity';

/**
 * Aerodrome Pair ABI - for reading LP positions
 */
const PAIR_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
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
  {
    name: 'stable',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

/**
 * Factory ABI for getting pair address
 */
const FACTORY_ABI = [
  {
    name: 'getPair',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'stable', type: 'bool' },
    ],
    outputs: [{ name: 'pair', type: 'address' }],
  },
] as const;

export type LiquidityPosition = {
  pairAddress: Address;
  token0: Address;
  token1: Address;
  symbol0: string;
  symbol1: string;
  lpBalance: bigint;
  lpBalanceFormatted: string;
  totalSupply: bigint;
  reserve0: bigint;
  reserve1: bigint;
  share: number; // percentage
  stable: boolean;
  amount0: string;
  amount1: string;
  valueUSD: number;
};

/**
 * Get pair address for token pair
 */
export function useAerodromePairAddress(
  tokenA: Address | undefined,
  tokenB: Address | undefined,
  stable: boolean = false
) {
  const { data, isLoading } = useReadContracts({
    contracts: tokenA && tokenB ? [{
      address: AERODROME_FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'getPair',
      args: [tokenA, tokenB, stable],
    }] : [],
    query: {
      enabled: !!tokenA && !!tokenB,
    },
  });

  const pairAddress = useMemo(() => {
    if (!data || data.length === 0 || data[0].status === 'failure') {
      return null;
    }
    const addr = data[0].result as Address;
    // Check if it's zero address (pair doesn't exist)
    if (addr === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return addr;
  }, [data]);

  return { pairAddress, isLoading };
}

/**
 * Get LP position info for a pair
 */
export function useLPPosition(
  pairAddress: Address | null,
  userAddress: Address | undefined,
  token0Decimals: number = 18,
  token1Decimals: number = 18,
  token0Price: number = 0,
  token1Price: number = 0
) {
  const contracts = useMemo(() => {
    if (!pairAddress || !userAddress) return [];
    return [
      {
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'balanceOf' as const,
        args: [userAddress],
      },
      {
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'totalSupply' as const,
      },
      {
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'getReserves' as const,
      },
      {
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'token0' as const,
      },
      {
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'token1' as const,
      },
      {
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'stable' as const,
      },
    ];
  }, [pairAddress, userAddress]);

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: !!pairAddress && !!userAddress,
    },
  });

  const position = useMemo(() => {
    if (!data || data.length < 6 || !pairAddress) return null;

    const lpBalance = data[0].status === 'success' ? (data[0].result as bigint) : BigInt(0);
    const totalSupply = data[1].status === 'success' ? (data[1].result as bigint) : BigInt(1);
    const reserves = data[2].status === 'success' ? (data[2].result as [bigint, bigint, bigint]) : [BigInt(0), BigInt(0), BigInt(0)];
    const token0 = data[3].status === 'success' ? (data[3].result as Address) : '0x0000000000000000000000000000000000000000';
    const token1 = data[4].status === 'success' ? (data[4].result as Address) : '0x0000000000000000000000000000000000000000';
    const stable = data[5].status === 'success' ? (data[5].result as boolean) : false;

    if (lpBalance === BigInt(0)) return null;

    const share = totalSupply > BigInt(0) 
      ? Number(lpBalance * BigInt(10000) / totalSupply) / 100 
      : 0;

    const amount0Raw = totalSupply > 0n 
      ? (reserves[0] * lpBalance) / totalSupply 
      : 0n;
    const amount1Raw = totalSupply > 0n 
      ? (reserves[1] * lpBalance) / totalSupply 
      : 0n;

    const amount0 = formatUnits(amount0Raw, token0Decimals);
    const amount1 = formatUnits(amount1Raw, token1Decimals);

    const valueUSD = (parseFloat(amount0) * token0Price) + (parseFloat(amount1) * token1Price);

    return {
      pairAddress,
      token0,
      token1,
      lpBalance,
      lpBalanceFormatted: formatUnits(lpBalance, 18),
      totalSupply,
      reserve0: reserves[0],
      reserve1: reserves[1],
      share,
      stable,
      amount0,
      amount1,
      valueUSD,
    };
  }, [data, pairAddress, token0Decimals, token1Decimals, token0Price, token1Price]);

  return {
    position,
    isLoading,
    refetch,
  };
}

/**
 * Hook to get all LP positions for common pairs
 */
export function useAllLPPositions(
  userAddress: Address | undefined,
  tokenPairs: Array<{
    tokenA: Address;
    tokenB: Address;
    symbolA: string;
    symbolB: string;
    decimalsA: number;
    decimalsB: number;
    priceA: number;
    priceB: number;
    stable?: boolean;
  }>
) {
  // Get all pair addresses
  const pairQueries = useMemo(() => {
    if (!userAddress) return [];
    return tokenPairs.flatMap(pair => [
      {
        address: AERODROME_FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'getPair' as const,
        args: [pair.tokenA, pair.tokenB, pair.stable || false],
      },
    ]);
  }, [userAddress, tokenPairs]);

  const { data: pairAddresses, isLoading: isLoadingPairs } = useReadContracts({
    contracts: pairQueries,
    query: {
      enabled: !!userAddress && tokenPairs.length > 0,
    },
  });

  // Get LP balances and info for each pair
  const lpQueries = useMemo(() => {
    if (!pairAddresses || !userAddress) return [];
    
    return pairAddresses.flatMap((pairResult) => {
      if (pairResult.status === 'failure') return [];
      const pairAddr = pairResult.result as Address;
      if (pairAddr === '0x0000000000000000000000000000000000000000') return [];

      return [
        { address: pairAddr, abi: PAIR_ABI, functionName: 'balanceOf' as const, args: [userAddress] },
        { address: pairAddr, abi: PAIR_ABI, functionName: 'totalSupply' as const },
        { address: pairAddr, abi: PAIR_ABI, functionName: 'getReserves' as const },
      ];
    });
  }, [pairAddresses, userAddress]);

  const { data: lpData, isLoading: isLoadingLP, refetch } = useReadContracts({
    contracts: lpQueries,
    query: {
      enabled: lpQueries.length > 0,
    },
  });

  const positions = useMemo(() => {
    if (!pairAddresses || !lpData) return [];

    const result: Array<LiquidityPosition & { symbolA: string; symbolB: string }> = [];
    let lpDataIndex = 0;

    pairAddresses.forEach((pairResult, pairIndex) => {
      if (pairResult.status === 'failure') return;
      
      const pairAddr = pairResult.result as Address;
      if (pairAddr === '0x0000000000000000000000000000000000000000') return;

      const pair = tokenPairs[pairIndex];
      if (!pair) return;

      // Get data for this pair (3 calls per pair)
      const balanceData = lpData[lpDataIndex];
      const supplyData = lpData[lpDataIndex + 1];
      const reservesData = lpData[lpDataIndex + 2];
      lpDataIndex += 3;

      if (!balanceData || !supplyData || !reservesData) return;
      if (balanceData.status === 'failure' || supplyData.status === 'failure' || reservesData.status === 'failure') return;

      const lpBalance = balanceData.result as bigint;
      if (lpBalance === 0n) return; // Skip if no balance

      const totalSupply = supplyData.result as bigint;
      const reserves = reservesData.result as [bigint, bigint, bigint];

      const share = totalSupply > 0n ? Number(lpBalance * 10000n / totalSupply) / 100 : 0;

      const amount0Raw = totalSupply > 0n ? (reserves[0] * lpBalance) / totalSupply : 0n;
      const amount1Raw = totalSupply > 0n ? (reserves[1] * lpBalance) / totalSupply : 0n;

      const amount0 = formatUnits(amount0Raw, pair.decimalsA);
      const amount1 = formatUnits(amount1Raw, pair.decimalsB);

      const valueUSD = (parseFloat(amount0) * pair.priceA) + (parseFloat(amount1) * pair.priceB);

      result.push({
        pairAddress: pairAddr,
        token0: pair.tokenA,
        token1: pair.tokenB,
        symbol0: pair.symbolA,
        symbol1: pair.symbolB,
        symbolA: pair.symbolA,
        symbolB: pair.symbolB,
        lpBalance,
        lpBalanceFormatted: formatUnits(lpBalance, 18),
        totalSupply,
        reserve0: reserves[0],
        reserve1: reserves[1],
        share,
        stable: pair.stable || false,
        amount0,
        amount1,
        valueUSD,
      });
    });

    return result;
  }, [pairAddresses, lpData, tokenPairs]);

  return {
    positions,
    isLoading: isLoadingPairs || isLoadingLP,
    refetch,
  };
}
