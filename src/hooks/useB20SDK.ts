/**
 * B20Forge SDK React Hooks
 * Provides easy access to SDK services in React components
 */

'use client';

import { useMemo } from 'react';
import type { PublicClient, WalletClient } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';
import { createB20ForgeSDK, type B20ForgeSDK } from '@/sdk';

/**
 * Hook to get B20Forge SDK instance
 * Automatically updates when wallet connects/disconnects
 */
export function useB20SDK(): B20ForgeSDK | null {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const sdk = useMemo(() => {
    if (!publicClient) return null;

    return createB20ForgeSDK({
      publicClient: publicClient as PublicClient,
      walletClient: walletClient as WalletClient | undefined,
    });
  }, [publicClient, walletClient]);

  return sdk;
}

/**
 * Hook to get Factory service
 */
export function useFactoryService() {
  const sdk = useB20SDK();
  return sdk?.factory;
}

/**
 * Hook to get Liquidity service
 */
export function useLiquidityService() {
  const sdk = useB20SDK();
  return sdk?.liquidity;
}

/**
 * Hook to get Swap service
 */
export function useSwapService() {
  const sdk = useB20SDK();
  return sdk?.swap;
}
