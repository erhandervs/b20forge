/**
 * B20 Factory Service
 * Business logic for B20 token deployment
 * Separates blockchain operations from UI components
 */

import type { Address, PublicClient, WalletClient } from 'viem';
import { encodeAbiParameters, encodePacked, keccak256 } from 'viem';
import type { B20TokenConfig } from '@/lib/b20-config';
import { B20_FACTORY_ADDRESS, B20_FACTORY_ABI, BERYL_STATUS } from '@/lib/b20-config';
import { verifyActivationRegistry } from '@/lib/activation-registry';
import { uploadTokenMetadata } from '@/lib/ipfs-metadata';
import { base } from 'wagmi/chains';

export interface DeploymentOptions {
  config: B20TokenConfig;
  userAddress: Address;
  logoFile?: File;
  onProgress?: (step: string, details?: unknown) => void;
}

export interface DeploymentResult {
  success: boolean;
  tokenAddress?: Address;
  txHash?: `0x${string}`;
  metadataUri?: string;
  error?: string;
}

/**
 * B20 Factory Service Class
 * Handles all B20 token deployment operations
 */
export class B20FactoryService {
  constructor(
    private publicClient: PublicClient,
    private walletClient?: WalletClient
  ) {}

  /**
   * Check if address is activated for B20 token creation
   */
  async checkActivation(): Promise<{
    isActivated: boolean;
    activationFee: bigint;
    error?: string;
  }> {
    try {
      const chainId = await this.publicClient.getChainId();
      const isMainnetLaunchpadActive = chainId === base.id && BERYL_STATUS.MAINNET_ACTIVE;

      if (isMainnetLaunchpadActive) {
        return {
          isActivated: true,
          activationFee: BigInt(0),
        };
      }

      const result = await verifyActivationRegistry(this.publicClient);
      
      if (!result.registryExists) {
        return {
          isActivated: false,
          activationFee: BigInt(0),
          error: 'Activation Registry not deployed. B20 tokens not available yet.',
        };
      }

      return {
        isActivated: result.isActivated,
        activationFee: result.activationFee,
      };
    } catch (error) {
      return {
        isActivated: false,
        activationFee: BigInt(0),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Upload token metadata to IPFS
   */
  async uploadMetadata(
    config: B20TokenConfig,
    logoFile: File
  ): Promise<{ success: boolean; contractUri?: string; error?: string }> {
    try {
      const result = await uploadTokenMetadata(logoFile, {
        name: config.name,
        symbol: config.symbol,
        description: '', // Add description to config if needed
        decimals: config.decimals,
        totalSupply: config.totalSupply.toString(),
        variant: config.variant === 0 ? 'governance' : 'asset',
        features: this.getFeaturesList(config),
        website: config.website,
        twitter: config.twitter,
        telegram: config.telegram,
      });

      return {
        success: result.success,
        contractUri: result.contractUri,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Deploy B20 token
   */
  async deployToken(options: DeploymentOptions): Promise<DeploymentResult> {
    const { config, userAddress, logoFile, onProgress } = options;

    try {
      // Step 1: Check activation
      onProgress?.('checking-activation');
      const activationCheck = await this.checkActivation();
      
      if (!activationCheck.isActivated) {
        throw new Error(
          activationCheck.error || 'Address not activated for B20 token creation'
        );
      }

      // Step 2: Upload metadata (if logo provided)
      let metadataUri = config.contractURI || '';
      if (logoFile) {
        onProgress?.('uploading-metadata');
        try {
          const uploadResult = await this.uploadMetadata(config, logoFile);
          if (uploadResult.success) {
            metadataUri = uploadResult.contractUri || metadataUri;
          } else {
            console.warn('Metadata upload failed, continuing without IPFS metadata:', uploadResult.error);
          }
        } catch (error) {
          console.warn('Metadata upload threw an error, continuing deployment:', error);
        }
      }

      // Step 3: Prepare deployment
      onProgress?.('deploying-token');
      
      if (!this.walletClient) {
        throw new Error('Wallet client not available');
      }

      // Generate salt for CREATE2
      const salt = this.generateSalt(userAddress, config.symbol);

      const params = encodeAbiParameters(
        [
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'initialAdmin', type: 'address' },
          { name: 'decimals', type: 'uint8' },
        ],
        [config.name, config.symbol, userAddress, config.decimals]
      );

      const initCalls: `0x${string}`[] = [];

      let txHash: `0x${string}` | undefined;

      try {
        txHash = await this.walletClient.writeContract({
          address: B20_FACTORY_ADDRESS,
          abi: B20_FACTORY_ABI,
          functionName: 'createB20',
          args: [config.variant, salt, params, initCalls],
          account: userAddress,
        } as Parameters<WalletClient['writeContract']>[0]);

        onProgress?.('waiting-confirmation', { txHash });
      } catch (err) {
        console.warn('writeContract failed, attempting fallback via simulate + sendTransaction', err);

        try {
          const simulateResult = await this.publicClient.simulateContract({
            address: B20_FACTORY_ADDRESS,
            abi: B20_FACTORY_ABI,
            functionName: 'createB20',
            args: [config.variant, salt, params, initCalls],
            account: userAddress,
          } as Parameters<PublicClient['simulateContract']>[0]);

          if (!simulateResult?.request) throw new Error('simulateContract did not return a request');

          // prefer sendTransaction when writeContract is not available/failed
          txHash = await this.walletClient.sendTransaction({
            to: simulateResult.request.to ?? B20_FACTORY_ADDRESS,
            data: simulateResult.request.data,
            value: (simulateResult.request as any).value ?? 0n,
            account: (simulateResult.request as any).account ?? userAddress,
          } as Parameters<WalletClient['sendTransaction']>[0]);

          onProgress?.('waiting-confirmation', { txHash });
        } catch (innerErr) {
          console.error('Fallback sendTransaction failed:', innerErr);
          throw new Error((innerErr as Error).message || 'Transaction submission failed');
        }
      }

      // Wait for receipt
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed');
      }

      // Predict the token address deterministically
      const tokenAddress = await this.predictTokenAddress(userAddress, salt);

      onProgress?.('completed', { tokenAddress, txHash });

      return {
        success: true,
        tokenAddress,
        txHash,
        metadataUri,
      };

    } catch (error) {
      console.error('B20 deployment failed:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Calculate token address before deployment (CREATE2)
   */
  async predictTokenAddress(
    creator: Address,
    salt: `0x${string}`
  ): Promise<Address> {
    // Call factory's getTokenAddress
    const address = await this.publicClient.readContract({
      address: B20_FACTORY_ADDRESS,
      abi: B20_FACTORY_ABI,
      functionName: 'getTokenAddress',
      args: [creator, salt],
    } as Parameters<PublicClient['readContract']>[0]);

    return address as Address;
  }

  /**
   * Generate deterministic salt
   */
  private generateSalt(address: Address, symbol: string): `0x${string}` {
    return keccak256(
      encodePacked(
        ['address', 'string', 'uint256'],
        [address, symbol, BigInt(Date.now())]
      )
    );
  }

  /**
   * Encode features into bitmap
   */
  private encodeFeaturesBitmap(config: B20TokenConfig): bigint {
    let bitmap = BigInt(0);
    
    if (config.mintable) bitmap |= BigInt(1) << BigInt(0);
    if (config.burnable) bitmap |= BigInt(1) << BigInt(1);
    if (config.pausable) bitmap |= BigInt(1) << BigInt(2);
    if (config.permit) bitmap |= BigInt(1) << BigInt(3);
    if (config.supplyCap) bitmap |= BigInt(1) << BigInt(4);
    
    return bitmap;
  }

  /**
   * Get features list for metadata
   */
  private getFeaturesList(config: B20TokenConfig): string[] {
    const features: string[] = [];
    
    if (config.mintable) features.push('Mintable');
    if (config.burnable) features.push('Burnable');
    if (config.pausable) features.push('Pausable');
    if (config.permit) features.push('ERC-2612 Permit');
    if (config.supplyCap) features.push('Supply Cap');
    
    return features;
  }

}

/**
 * Create B20 Factory Service instance
 */
export function createB20FactoryService(
  publicClient: PublicClient,
  walletClient?: WalletClient
): B20FactoryService {
  return new B20FactoryService(publicClient, walletClient);
}
