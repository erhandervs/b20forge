/**
 * B20Forge SDK
 * Unified SDK for all B20Forge services
 * 
 * Usage:
 * ```typescript
 * import { createB20ForgeSDK } from '@/sdk';
 * 
 * const sdk = createB20ForgeSDK({ publicClient, walletClient });
 * 
 * // Deploy B20 token
 * const result = await sdk.factory.deployToken({...});
 * 
 * // Add liquidity
 * await sdk.liquidity.addLiquidity('uniswap-v3', {...});
 * 
 * // Execute swap
 * await sdk.swap.executeSwap({...});
 * ```
 */

import type { PublicClient, WalletClient } from 'viem';
import { B20FactoryService, createB20FactoryService } from '@/services/b20-factory.service';
import { LiquidityService, createLiquidityService } from '@/services/liquidity.service';
import { SwapService, createSwapService } from '@/services/swap.service';

export interface B20ForgeSDKOptions {
  publicClient: PublicClient;
  walletClient?: WalletClient;
}

/**
 * B20Forge SDK Class
 * Main entry point for all platform services
 */
export class B20ForgeSDK {
  public readonly factory: B20FactoryService;
  public readonly liquidity: LiquidityService;
  public readonly swap: SwapService;

  private publicClient: PublicClient;
  private walletClient?: WalletClient;

  constructor(options: B20ForgeSDKOptions) {
    this.publicClient = options.publicClient;
    this.walletClient = options.walletClient;

    this.factory = createB20FactoryService(
      options.publicClient,
      options.walletClient
    );

    this.liquidity = createLiquidityService({
      publicClient: options.publicClient,
      walletClient: options.walletClient,
    });

    this.swap = createSwapService(
      options.publicClient,
      options.walletClient
    );
  }

  /**
   * Update wallet client (e.g., when user connects/disconnects wallet)
   */
  updateWalletClient(walletClient: WalletClient | undefined) {
    if (walletClient === this.walletClient) return;
    this.walletClient = walletClient;

    this.factory = createB20FactoryService(
      this.publicClient,
      walletClient
    );

    this.liquidity = createLiquidityService({
      publicClient: this.publicClient,
      walletClient,
    });

    this.swap = createSwapService(
      this.publicClient,
      walletClient
    );
  }
}

/**
 * Create B20Forge SDK instance
 */
export function createB20ForgeSDK(options: B20ForgeSDKOptions): B20ForgeSDK {
  return new B20ForgeSDK(options);
}

// Re-export service types
export type { B20FactoryService, LiquidityService, SwapService };
export type {
  DeploymentOptions,
  DeploymentResult,
} from '@/services/b20-factory.service';
export type {
  LiquidityServiceOptions,
} from '@/services/liquidity.service';
export type {
  SwapQuote,
  SwapParams,
  SwapResult,
} from '@/services/swap.service';
