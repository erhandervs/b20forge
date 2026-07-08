'use client';

import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import { useMemo } from 'react';
import { ERC20_ABI } from './b20-config';

/**
 * Hook to read ERC20 token balance
 */
export function useTokenBalance(tokenAddress: Address | undefined, userAddress: Address | undefined) {
  const { data, isLoading, isError, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  const balance = useMemo(() => {
    if (!data) return '0';
    return data.toString();
  }, [data]);

  return {
    balance,
    isLoading,
    isError,
    refetch,
  };
}

/**
 * Hook to read multiple token balances at once
 * Fixed: Proper error handling and consistent return format
 */
export function useMultipleTokenBalances(
  tokens: { address: Address; decimals: number }[],
  userAddress: Address | undefined
) {
  const contracts = useMemo(() => {
    if (!userAddress || !tokens || tokens.length === 0) return [];
    return tokens.map(token => ({
      address: token.address,
      abi: ERC20_ABI,
      functionName: 'balanceOf' as const,
      args: [userAddress],
    }));
  }, [tokens, userAddress]);

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: !!userAddress && tokens.length > 0,
      refetchInterval: 10000,
      staleTime: 5000, // Consider data stale after 5 seconds
      gcTime: 30000, // Keep in cache for 30 seconds
    },
  });

  const balances = useMemo(() => {
    if (!data || !tokens || tokens.length === 0) {
      return tokens?.map(() => '0') || [];
    }
    
    return data.map((result, index) => {
      // Handle both success and failure cases properly
      if (!result || result.status !== 'success' || !result.result) {
        return '0';
      }
      
      try {
        const balance = result.result as bigint;
        return formatUnits(balance, tokens[index].decimals);
      } catch (error) {
        console.error(`Error formatting balance for token ${index}:`, error);
        return '0';
      }
    });
  }, [data, tokens]);

  return {
    balances,
    isLoading,
    isError,
    refetch,
  };
}

/**
 * Hook to read token metadata (name, symbol, decimals)
 */
export function useTokenMetadata(tokenAddress: Address | undefined) {
  const contracts = useMemo(() => {
    if (!tokenAddress) return [];
    return [
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'name' as const,
      },
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol' as const,
      },
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals' as const,
      },
    ];
  }, [tokenAddress]);

  const { data, isLoading, isError } = useReadContracts({
    contracts,
    query: {
      enabled: !!tokenAddress,
    },
  });

  const metadata = useMemo(() => {
    if (!data || data.length < 3) {
      return { name: '', symbol: '', decimals: 18 };
    }
    return {
      name: (data[0].status === 'success' ? data[0].result : '') as string,
      symbol: (data[1].status === 'success' ? data[1].result : '') as string,
      decimals: (data[2].status === 'success' ? data[2].result : 18) as number,
    };
  }, [data]);

  return {
    ...metadata,
    isLoading,
    isError,
  };
}

/**
 * Hook to approve token spending
 */
export function useTokenApproval() {
  const publicClient = usePublicClient();
  const { writeContractAsync, data: hash, isPending, isError, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = async (tokenAddress: Address, spenderAddress: Address, amount: string, decimals: number) => {
    const amountWei = parseUnits(amount, decimals);
    const txHash = await writeContractAsync({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, amountWei],
    } as Parameters<typeof writeContractAsync>[0]);

    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash: txHash });
    }

    return txHash;
  };

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
  };
}

/**
 * Hook to transfer tokens
 */
export function useTokenTransfer() {
  const { writeContract, data: hash, isPending, isError, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const transfer = async (tokenAddress: Address, toAddress: Address, amount: string, decimals: number) => {
    const amountWei = parseUnits(amount, decimals);
    return writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [toAddress, amountWei],
    } as Parameters<typeof writeContract>[0]);
  };

  return {
    transfer,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
  };
}

/**
 * Hook to check token allowance
 */
export function useTokenAllowance(
  tokenAddress: Address | undefined,
  ownerAddress: Address | undefined,
  spenderAddress: Address | undefined
) {
  const { data, isLoading, isError, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: ownerAddress && spenderAddress ? [ownerAddress, spenderAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress,
    },
  });

  const allowance = useMemo(() => {
    if (!data) return '0';
    return data.toString();
  }, [data]);

  return {
    allowance,
    isLoading,
    isError,
    refetch,
  };
}

/**
 * Utility to format token amount with proper decimals
 */
export function formatTokenAmount(amount: string | bigint, decimals: number, displayDecimals = 4): string {
  try {
    const amountStr = typeof amount === 'bigint' ? amount.toString() : amount;
    const formatted = formatUnits(BigInt(amountStr), decimals);
    const num = parseFloat(formatted);
    
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    
    return num.toFixed(displayDecimals);
  } catch {
    return '0';
  }
}

/**
 * Utility to parse token amount to wei
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  try {
    return parseUnits(amount, decimals);
  } catch {
    return BigInt(0);
  }
}

/**
 * Hook to get token logo URI from contract (if available)
 */
export function useTokenLogoURI(tokenAddress: Address | undefined) {
  const { data, isLoading } = useReadContracts({
    contracts: tokenAddress ? [
      {
        address: tokenAddress,
        abi: [
          {
            inputs: [],
            name: 'logoURI',
            outputs: [{ type: 'string' }],
            stateMutability: 'view',
            type: 'function',
          },
        ] as const,
        functionName: 'logoURI',
      },
    ] : [],
    query: {
      enabled: !!tokenAddress,
    },
  });

  return useMemo(() => {
    if (!data || data.length === 0 || data[0].status === 'failure') {
      return { logoURI: null, isLoading };
    }
    return {
      logoURI: (data[0].result as string) || null,
      isLoading,
    };
  }, [data, isLoading]);
}

/**
 * Hook to get multiple token logo URIs
 */
export function useMultipleTokenLogos(tokenAddresses: Address[]) {
  const contracts = useMemo(() => {
    return tokenAddresses.map((address) => ({
      address,
      abi: [
        {
          inputs: [],
          name: 'logoURI',
          outputs: [{ type: 'string' }],
          stateMutability: 'view',
          type: 'function',
        },
      ] as const,
      functionName: 'logoURI' as const,
    }));
  }, [tokenAddresses]);

  const { data, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: tokenAddresses.length > 0,
    },
  });

  const logos = useMemo(() => {
    const result: Record<Address, string | null> = {};
    if (data) {
      tokenAddresses.forEach((address, index) => {
        const item = data[index];
        result[address] = item.status === 'success' ? (item.result as string) || null : null;
      });
    }
    return result;
  }, [data, tokenAddresses]);

  return {
    logos,
    isLoading,
  };
}
