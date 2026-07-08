/**
 * Base Activation Registry Integration
 * Required for B20 token deployment
 * 
 * @see https://docs.base.org/get-started/launch-b20-token#verify-the-activation-registry-is-enabled
 */

import { useMemo } from 'react';
import type { Address, PublicClient } from 'viem';
import { keccak256, toBytes } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { base } from 'wagmi/chains';
import { BERYL_STATUS } from '@/lib/b20-config';

/**
 * Activation Registry precompile address from Base docs.
 * This registry tracks whether a feature variant is activated on Base.
 */
export const ACTIVATION_REGISTRY_ADDRESS = '0x8453000000000000000000000000000000000001' as Address;

export const DEFAULT_B20_ACTIVATION_FEATURE = 'base.b20_asset' as const;

export function getActivationFeatureKey(feature = DEFAULT_B20_ACTIVATION_FEATURE) {
  return keccak256(toBytes(feature));
}

/**
 * Activation Registry ABI (simplified)
 */
export const ACTIVATION_REGISTRY_ABI = [
  {
    name: 'isActivated',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'featureKey', type: 'bytes32' }],
    outputs: [{ name: 'activated', type: 'bool' }],
  },
  {
    name: 'activate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'getActivationFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'fee', type: 'uint256' }],
  },
  {
    name: 'activationTimestamp',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'featureKey', type: 'bytes32' }],
    outputs: [{ name: 'timestamp', type: 'uint256' }],
  },
] as const;

/**
 * Hook to check if an address is activated for B20 token creation
 */
export function useIsActivated(feature = DEFAULT_B20_ACTIVATION_FEATURE) {
  const { chain } = useAccount();
  const activationKey = useMemo(() => getActivationFeatureKey(feature), [feature]);
  const chainId = chain?.id ?? base.id;
  const isMainnetLaunchpadActive = chainId === base.id && BERYL_STATUS.MAINNET_ACTIVE;

  const { data: isActivated, isLoading, error, refetch } = useReadContract({
    address: ACTIVATION_REGISTRY_ADDRESS,
    abi: ACTIVATION_REGISTRY_ABI,
    functionName: 'isActivated',
    args: [activationKey],
    chainId,
    query: {
      enabled: !!activationKey && !isMainnetLaunchpadActive,
    },
  });

  return {
    isActivated: isMainnetLaunchpadActive || Boolean(isActivated),
    isLoading: isMainnetLaunchpadActive ? false : isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get activation fee
 */
export function useActivationFee() {
  const { chain } = useAccount();
  const chainId = chain?.id ?? base.id;
  const isMainnetLaunchpadActive = chainId === base.id && BERYL_STATUS.MAINNET_ACTIVE;

  const { data: fee, isLoading, error } = useReadContract({
    address: ACTIVATION_REGISTRY_ADDRESS,
    abi: ACTIVATION_REGISTRY_ABI,
    functionName: 'getActivationFee',
    chainId,
    query: {
      enabled: !isMainnetLaunchpadActive,
    },
  });

  return {
    fee: isMainnetLaunchpadActive ? BigInt(0) : (fee ?? BigInt(0)),
    isLoading: isMainnetLaunchpadActive ? false : isLoading,
    error,
  };
}

/**
 * Hook to get activation timestamp
 */
export function useActivationTimestamp(feature = DEFAULT_B20_ACTIVATION_FEATURE) {
  const activationKey = useMemo(() => getActivationFeatureKey(feature), [feature]);

  const { data: timestamp, isLoading, error } = useReadContract({
    address: ACTIVATION_REGISTRY_ADDRESS,
    abi: ACTIVATION_REGISTRY_ABI,
    functionName: 'activationTimestamp',
    args: [activationKey],
    query: {
      enabled: !!activationKey,
    },
  });

  return {
    timestamp: timestamp ? Number(timestamp) : 0,
    isLoading,
    error,
  };
}

/**
 * Check if activation registry is properly configured
 * This should be called during app initialization
 */
export async function verifyActivationRegistry(
  publicClient: PublicClient,
  feature = DEFAULT_B20_ACTIVATION_FEATURE
): Promise<{
  registryExists: boolean;
  isActivated: boolean;
  activationFee: bigint;
  error?: string;
}> {
  try {
    const activationKey = getActivationFeatureKey(feature);

    const [isActivated, activationFee] = await Promise.all([
      publicClient.readContract({
        address: ACTIVATION_REGISTRY_ADDRESS,
        abi: ACTIVATION_REGISTRY_ABI,
        functionName: 'isActivated',
        args: [activationKey],
        authorizationList: undefined,
      }),
      publicClient.readContract({
        address: ACTIVATION_REGISTRY_ADDRESS,
        abi: ACTIVATION_REGISTRY_ABI,
        functionName: 'getActivationFee',
        authorizationList: undefined,
      }),
    ]);

    return {
      registryExists: true,
      isActivated: Boolean(isActivated),
      activationFee: BigInt(activationFee as bigint),
    };
  } catch (error) {
    console.error('Activation Registry verification failed:', error);
    return {
      registryExists: false,
      isActivated: false,
      activationFee: BigInt(0),
      error: (error as Error).message,
    };
  }
}
