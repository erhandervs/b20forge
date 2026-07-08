'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import { formatUnits } from 'viem';

/**
 * Custom wallet hook with real Web3 integration
 */
export function useWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  const shortAddress = useMemo(() => {
    if (!address) return null;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const formattedBalance = useMemo(() => {
    if (!balance) return '0';
    return parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4);
  }, [balance]);

  const currentChain = useMemo(() => {
    if (chainId === base.id) return base;
    return base; // default to base mainnet
  }, [chainId]);

  const connectWallet = useCallback(async () => {
    const connector = connectors[0]; // Use first available connector
    if (connector) {
      connect({ connector });
    }
  }, [connect, connectors]);

  return {
    address,
    shortAddress,
    isConnected,
    isConnecting: isConnecting || isReconnecting,
    connect: connectWallet,
    disconnect,
    balance: formattedBalance,
    balanceSymbol: balance?.symbol || 'ETH',
    chainId,
    chainName: currentChain.name,
    switchChain,
    isBaseMainnet: chainId === base.id,
  };
}

// Debounce hook for search/input
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Local storage hook
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(next));
      }
      return next;
    });
  }, [key]);

  return [value, set] as const;
}

// Price ticker simulation
export function usePriceTicker(basePrice: number, volatility = 0.002) {
  const [price, setPrice] = useState(basePrice);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrice(p => {
        const change = p * volatility * (Math.random() * 2 - 1);
        return Math.max(0.000001, p + change);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [volatility]);

  return price;
}
