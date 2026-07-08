/**
 * Token Security Scanner Integration
 * Integrates with multiple security APIs to scan tokens
 * 
 * Supported APIs:
 * - GoPlus Security
 * - De.Fi Scanner
 * - Honeypot.is
 */

import type { Address } from 'viem';

interface SecurityApiResponse {
  [key: string]: unknown;
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
  }
  if (typeof value === 'number') return value === 1;
  return false;
}

function asRecord(value: unknown): Record<string, any> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, any>) : undefined;
}

export interface SecurityScanResult {
  // Overall score
  securityScore: number; // 0-100
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  
  // Contract checks
  isOpenSource: boolean;
  isProxy: boolean;
  isMintable: boolean;
  canTakeBackOwnership: boolean;
  ownerChangeBalance: boolean;
  hiddenOwner: boolean;
  selfDestruct: boolean;
  externalCall: boolean;
  
  // Trading checks
  buyTax: number;
  sellTax: number;
  transferPausable: boolean;
  isHoneypot: boolean;
  tradingCooldown: boolean;
  isBlacklisted: boolean;
  isWhitelisted: boolean;
  antiWhaleModifiable: boolean;
  cannotBuy: boolean;
  cannotSellAll: boolean;
  
  // Holder analysis
  holderCount: number;
  lpHolderCount: number;
  creatorAddress: Address;
  creatorBalance: string;
  ownerAddress: Address;
  ownerBalance: string;
  lpTotalSupply: string;
  totalSupply?: string;
  
  // Honeypot detection
  honeypotResult?: {
    isHoneypot: boolean;
    honeypotReason?: string;
    simulationSuccess: boolean;
    buyTax: number;
    sellTax: number;
    transferTax: number;
  };
  
  // Timestamp
  scannedAt: number;
  
  // Raw API responses
  raw?: SecurityApiResponse;
}

/**
 * Scan token using GoPlus Security API
 */
export async function scanTokenWithGoPlus(
  tokenAddress: Address,
  chainId = 8453
): Promise<{ success: boolean; data?: SecurityApiResponse; error?: string }> {
  try {
    const response = await fetch(
      `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${tokenAddress}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GoPlus API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.code !== 1) {
      throw new Error(data.message || 'GoPlus API returned error');
    }

    const tokenData = data.result?.[tokenAddress.toLowerCase()];
    
    if (!tokenData) {
      throw new Error('Token not found in GoPlus database');
    }

    return { success: true, data: tokenData };
  } catch (error) {
    console.error('GoPlus scan failed:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Scan token using Honeypot.is API
 */
export async function scanTokenWithHoneypot(
  tokenAddress: Address,
  chainId = 8453
): Promise<{ success: boolean; data?: SecurityApiResponse; error?: string }> {
  try {
    const response = await fetch(
      `https://api.honeypot.is/v2/IsHoneypot?address=${tokenAddress}&chainID=${chainId}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Honeypot.is API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return { success: true, data };
  } catch (error) {
    console.error('Honeypot.is scan failed:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Comprehensive token security scan using multiple sources
 */
export async function scanTokenSecurity(
  tokenAddress: Address,
  chainId = 8453
): Promise<SecurityScanResult> {
  try {
    // Run all scans in parallel
    const [goPlusResult, honeypotResult] = await Promise.allSettled([
      scanTokenWithGoPlus(tokenAddress, chainId),
      scanTokenWithHoneypot(tokenAddress, chainId),
    ]);

    // Parse GoPlus data
    const goPlusData = goPlusResult.status === 'fulfilled' && goPlusResult.value.success
      ? goPlusResult.value.data
      : null;

    // Parse Honeypot data
    const honeypotData = honeypotResult.status === 'fulfilled' && honeypotResult.value.success
      ? honeypotResult.value.data
      : null;

    const goPlus = asRecord(goPlusData);
    const honeypot = asRecord(honeypotData);

    // Combine results
    const result: SecurityScanResult = {
      securityScore: 0,
      riskLevel: 'medium',
      
      // Contract checks
      isOpenSource: asBoolean(goPlus?.is_open_source),
      isProxy: asBoolean(goPlus?.is_proxy),
      isMintable: asBoolean(goPlus?.is_mintable),
      canTakeBackOwnership: asBoolean(goPlus?.can_take_back_ownership),
      ownerChangeBalance: asBoolean(goPlus?.owner_change_balance),
      hiddenOwner: asBoolean(goPlus?.hidden_owner),
      selfDestruct: asBoolean(goPlus?.selfdestruct),
      externalCall: asBoolean(goPlus?.external_call),
      
      // Trading checks
      buyTax: parseFloat(asString(goPlus?.buy_tax, '0')) * 100,
      sellTax: parseFloat(asString(goPlus?.sell_tax, '0')) * 100,
      transferPausable: asBoolean(goPlus?.transfer_pausable),
      isHoneypot: asBoolean(honeypot?.honeypotResult?.isHoneypot) || asBoolean(goPlus?.is_honeypot),
      tradingCooldown: asBoolean(goPlus?.trading_cooldown),
      isBlacklisted: asBoolean(goPlus?.is_blacklisted),
      isWhitelisted: asBoolean(goPlus?.is_whitelisted),
      antiWhaleModifiable: asBoolean(goPlus?.anti_whale_modifiable),
      cannotBuy: asBoolean(goPlus?.cannot_buy),
      cannotSellAll: asBoolean(goPlus?.cannot_sell_all),
      
      // Holder analysis
      holderCount: parseInt(asString(goPlus?.holder_count, '0')),
      lpHolderCount: parseInt(asString(goPlus?.lp_holder_count, '0')),
      creatorAddress: (asString(goPlus?.creator_address, '0x0000000000000000000000000000000000000000') as Address),
      creatorBalance: asString(goPlus?.creator_balance, '0'),
      ownerAddress: (asString(goPlus?.owner_address, '0x0000000000000000000000000000000000000000') as Address),
      ownerBalance: asString(goPlus?.owner_balance, '0'),
      lpTotalSupply: asString(goPlus?.lp_total_supply, asString(goPlus?.total_supply, asString(goPlus?.totalSupply, '0'))),
      totalSupply: asString(goPlus?.total_supply, asString(goPlus?.totalSupply, asString(goPlus?.lp_total_supply, '0'))),
      
      // Honeypot detection
      honeypotResult: honeypot ? {
        isHoneypot: asBoolean(honeypot.honeypotResult?.isHoneypot),
        honeypotReason: asOptionalString(honeypot.honeypotReason),
        simulationSuccess: asBoolean(honeypot.simulationSuccess),
        buyTax: parseFloat(asString(honeypot.simulationResult?.buyTax, '0')),
        sellTax: parseFloat(asString(honeypot.simulationResult?.sellTax, '0')),
        transferTax: parseFloat(asString(honeypot.simulationResult?.transferTax, '0')),
      } : undefined,
      
      scannedAt: Date.now(),
      raw: { goPlus: goPlusData, honeypot: honeypotData },
    };

    // Calculate security score
    result.securityScore = calculateSecurityScore(result);
    result.riskLevel = getRiskLevel(result.securityScore);

    return result;
  } catch (error) {
    console.error('Token security scan failed:', error);
    
    // Return default safe values on error
    return {
      securityScore: 0,
      riskLevel: 'medium',
      isOpenSource: false,
      isProxy: false,
      isMintable: false,
      canTakeBackOwnership: false,
      ownerChangeBalance: false,
      hiddenOwner: false,
      selfDestruct: false,
      externalCall: false,
      buyTax: 0,
      sellTax: 0,
      transferPausable: false,
      isHoneypot: false,
      tradingCooldown: false,
      isBlacklisted: false,
      isWhitelisted: false,
      antiWhaleModifiable: false,
      cannotBuy: false,
      cannotSellAll: false,
      holderCount: 0,
      lpHolderCount: 0,
      creatorAddress: '0x0000000000000000000000000000000000000000' as Address,
      creatorBalance: '0',
      ownerAddress: '0x0000000000000000000000000000000000000000' as Address,
      ownerBalance: '0',
      lpTotalSupply: '0',
      scannedAt: Date.now(),
    };
  }
}

/**
 * Calculate security score (0-100)
 */
function calculateSecurityScore(result: SecurityScanResult): number {
  let score = 100;

  // Critical issues (-30 points each)
  if (result.isHoneypot) score -= 30;
  if (result.cannotBuy) score -= 30;
  if (result.cannotSellAll) score -= 30;
  if (result.hiddenOwner) score -= 30;
  if (result.selfDestruct) score -= 30;

  // High severity issues (-15 points each)
  if (result.canTakeBackOwnership) score -= 15;
  if (result.ownerChangeBalance) score -= 15;
  if (result.transferPausable) score -= 15;

  // Medium severity issues (-10 points each)
  if (result.isMintable) score -= 10;
  if (result.isProxy) score -= 10;
  if (result.externalCall) score -= 10;
  if (result.antiWhaleModifiable) score -= 10;

  // Tax penalties
  if (result.buyTax > 10) score -= 15;
  else if (result.buyTax > 5) score -= 10;
  else if (result.buyTax > 2) score -= 5;

  if (result.sellTax > 10) score -= 15;
  else if (result.sellTax > 5) score -= 10;
  else if (result.sellTax > 2) score -= 5;

  // Positive points
  if (result.isOpenSource) score += 5;
  if (result.holderCount > 1000) score += 5;
  else if (result.holderCount > 100) score += 3;

  return Math.max(0, Math.min(100, score));
}

/**
 * Get risk level from security score
 */
function getRiskLevel(score: number): SecurityScanResult['riskLevel'] {
  if (score >= 80) return 'safe';
  if (score >= 60) return 'low';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'high';
  return 'critical';
}
