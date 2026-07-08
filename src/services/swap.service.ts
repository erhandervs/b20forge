/**
 * Swap Service
 * Business logic for token swaps across multiple DEXes
 * Implements smart routing and best execution
 */

import type { Address, PublicClient, WalletClient } from 'viem';
import { parseUnits, formatUnits, encodeFunctionData } from 'viem';
import { AERODROME_ROUTER_ABI, AERODROME_V2_CONTRACTS } from '@/lib/protocols/aerodrome/contracts';

type AerodromeRoute = {
  from: Address;
  to: Address;
  stable: boolean;
  factory: Address;
};

export interface SwapQuote {
  dexId: string;
  dexName: string;
  amountOut: bigint;
  amountOutFormatted: string;
  priceImpact: number;
  route: Address[];
  gasEstimate?: bigint;
}

export interface SwapParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  decimalsIn: number;
  decimalsOut: number;
  slippageBps: number;
  userAddress: Address;
  deadline?: number;
}

export interface SwapResult {
  success: boolean;
  txHash?: `0x${string}`;
  amountOut?: bigint;
  error?: string;
}

/**
 * Swap Service Class
 * Handles all swap operations with smart routing
 */
export class SwapService {
  constructor(
    private publicClient: PublicClient,
    private walletClient?: WalletClient
  ) {}

  /**
   * Get quotes from all DEXes
   */
  async getQuotes(params: {
    tokenIn: Address;
    tokenOut: Address;
    amountIn: string;
    decimalsIn: number;
    decimalsOut: number;
  }): Promise<SwapQuote[]> {
    const quotes: SwapQuote[] = [];

    try {
      const amountInWei = parseUnits(params.amountIn, params.decimalsIn);
      const actualIn = params.tokenIn === '0x0000000000000000000000000000000000000000'
        ? '0x4200000000000000000000000000000000000006'
        : params.tokenIn;
      const actualOut = params.tokenOut === '0x0000000000000000000000000000000000000000'
        ? '0x4200000000000000000000000000000000000006'
        : params.tokenOut;

      const routes: AerodromeRoute[] = [{
        from: actualIn,
        to: actualOut,
        stable: false,
        factory: AERODROME_V2_CONTRACTS.FACTORY,
      }];

      const amounts = await this.publicClient.readContract({
        address: AERODROME_V2_CONTRACTS.ROUTER,
        abi: AERODROME_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountInWei, routes],
      }) as unknown as bigint[];

      const amountOut = amounts[amounts.length - 1];

      quotes.push({
        dexId: 'aerodrome-v2',
        dexName: 'Aerodrome',
        amountOut,
        amountOutFormatted: formatUnits(amountOut, params.decimalsOut),
        priceImpact: 0.3,
        route: [actualIn, actualOut],
        gasEstimate: BigInt(180000),
      });
    } catch (error) {
      console.error('Aerodrome quote failed:', error);
    }

    return quotes;
  }

  /**
   * Get best quote from all DEXes
   */
  async getBestQuote(params: {
    tokenIn: Address;
    tokenOut: Address;
    amountIn: string;
    decimalsIn: number;
    decimalsOut: number;
  }): Promise<SwapQuote | null> {
    const quotes = await this.getQuotes(params);
    
    if (quotes.length === 0) return null;
    
    // Sort by amountOut (highest first)
    return quotes.sort((a, b) => 
      Number(b.amountOut - a.amountOut)
    )[0];
  }

  /**
   * Execute swap with best route
   */
  async executeSwap(params: SwapParams): Promise<SwapResult> {
    try {
      if (!this.walletClient) {
        throw new Error('Wallet client not available');
      }

      const quote = await this.getBestQuote({
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        decimalsIn: params.decimalsIn,
        decimalsOut: params.decimalsOut,
      });

      if (!quote) {
        throw new Error('No swap route found');
      }

      const amountInWei = parseUnits(params.amountIn, params.decimalsIn);
      const amountOutMin = (quote.amountOut * BigInt(10000 - (params.slippageBps || 50))) / BigInt(10000);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + (params.deadline || 1200));
      const routes = [{
        from: params.tokenIn === '0x0000000000000000000000000000000000000000' ? '0x4200000000000000000000000000000000000006' : params.tokenIn,
        to: params.tokenOut === '0x0000000000000000000000000000000000000000' ? '0x4200000000000000000000000000000000000006' : params.tokenOut,
        stable: false,
        factory: AERODROME_V2_CONTRACTS.FACTORY,
      }];

      const hash = await this.walletClient.sendTransaction({
        account: params.userAddress,
        to: AERODROME_V2_CONTRACTS.ROUTER,
        data: encodeFunctionData({
          abi: AERODROME_ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [amountInWei, amountOutMin, routes, params.userAddress, deadline],
        }),
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return {
        success: true,
        txHash: hash,
        amountOut: quote.amountOut,
      };

    } catch (error) {
      console.error('Swap failed:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Estimate gas for swap
   */
  async estimateSwapGas(params: SwapParams): Promise<bigint> {
    try {
      const amountInWei = parseUnits(params.amountIn, params.decimalsIn);
      const amountOutMin = BigInt(0);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + (params.deadline || 1200));
      const routes = [{
        from: params.tokenIn === '0x0000000000000000000000000000000000000000' ? '0x4200000000000000000000000000000000000006' : params.tokenIn,
        to: params.tokenOut === '0x0000000000000000000000000000000000000000' ? '0x4200000000000000000000000000000000000006' : params.tokenOut,
        stable: false,
        factory: AERODROME_V2_CONTRACTS.FACTORY,
      }];

      if (!this.walletClient) {
        return BigInt(250000);
      }

      const gasEstimate = await this.publicClient.estimateGas({
        account: params.userAddress,
        to: AERODROME_V2_CONTRACTS.ROUTER,
        data: encodeFunctionData({
          abi: AERODROME_ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [amountInWei, amountOutMin, routes, params.userAddress, deadline],
        }),
      });

      return gasEstimate;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      return BigInt(250000);
    }
  }

  /**
   * Calculate price impact
   */
  calculatePriceImpact(
    amountIn: bigint,
    amountOut: bigint,
    spotPrice: number
  ): number {
    // Price impact calculation
    const expectedOut = Number(amountIn) * spotPrice;
    const actualOut = Number(amountOut);
    
    return ((expectedOut - actualOut) / expectedOut) * 100;
  }
}

/**
 * Create Swap Service instance
 */
export function createSwapService(
  publicClient: PublicClient,
  walletClient?: WalletClient
): SwapService {
  return new SwapService(publicClient, walletClient);
}
