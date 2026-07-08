/**
 * B20 Token Standard Configuration
 * Based on Base Beryl Upgrade specifications
 * 
 * @see https://docs.base.org/base-chain/specs/upgrades/beryl/b20
 */

// Base Network Chain IDs
export const CHAINS = {
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
} as const;

// B20 Factory Precompile Address (Base docs)
// This is where B20 tokens are created on Base
export const B20_FACTORY_ADDRESS = '0xB20f000000000000000000000000000000000000' as const;

// B20 Policy Registry Address (Base docs uses the activation registry precompile for activation checks)
export const B20_POLICY_REGISTRY = '0x8453000000000000000000000000000000000001' as const;

/**
 * B20 Token Variants
 */
export const B20_VARIANTS = {
  GOVERNANCE: 0, // For DAO, protocol, utility tokens
  ASSET: 1,      // For stablecoins, RWAs, equity
} as const;

/**
 * B20 Policy Types
 */
export const B20_POLICY_TYPES = {
  NONE: 0,       // No transfer restrictions
  ALLOWLIST: 1,  // Only permitted addresses can transfer
  BLOCKLIST: 2,  // Blacklisted addresses cannot transfer
} as const;

/**
 * B20 Role Types
 */
export const B20_ROLES = {
  ADMIN: 0,      // Full control
  MINTER: 1,     // Can mint new tokens
  BURNER: 2,     // Can burn tokens
  PAUSER: 3,     // Can pause transfers
  POLICY_ADMIN: 4, // Can manage transfer policies
} as const;

/**
 * B20 Token Features
 * These are boolean flags that configure token behavior
 */
export interface B20TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  variant: typeof B20_VARIANTS[keyof typeof B20_VARIANTS];
  
  // Features
  mintable: boolean;
  burnable: boolean;
  pausable: boolean;
  permit: boolean; // ERC-2612 permit (signature-based approvals)
  
  // Supply Management
  supplyCap: boolean;
  supplyCapAmount?: bigint;
  
  // Transfer Policy
  policyType: typeof B20_POLICY_TYPES[keyof typeof B20_POLICY_TYPES];
  allowlistAddresses?: string[];
  blocklistAddresses?: string[];
  
  // Metadata
  contractURI?: string; // ERC-7572 metadata URI
  website?: string;
  twitter?: string;
  telegram?: string;
  logoURI?: string;
}

/**
 * Default B20 Token Configuration
 */
export const DEFAULT_B20_CONFIG: Partial<B20TokenConfig> = {
  decimals: 18,
  variant: B20_VARIANTS.GOVERNANCE,
  mintable: false,
  burnable: true,
  pausable: false,
  permit: true,
  supplyCap: false,
  policyType: B20_POLICY_TYPES.NONE,
};

/**
 * B20 Factory ABI (Simplified - actual ABI will be provided by Base)
 */
export const B20_FACTORY_ABI = [
  {
    name: 'createB20',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'variant', type: 'uint8' },
      { name: 'salt', type: 'bytes32' },
      { name: 'params', type: 'bytes' },
      { name: 'initCalls', type: 'bytes[]' },
    ],
    outputs: [
      { name: 'token', type: 'address' },
    ],
  },
  {
    name: 'getTokenAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'creator', type: 'address' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [
      { name: 'token', type: 'address' },
    ],
  },
] as const;

/**
 * Standard ERC-20 ABI (B20 tokens are ERC-20 compatible)
 */
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
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
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

/**
 * Supported DEXes on Base
 */
export const SUPPORTED_DEXES = {
  AERODROME: {
    name: 'Aerodrome',
    router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43', // Aerodrome Router on Base
    factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da', // Aerodrome Factory
    website: 'https://aerodrome.finance',
  },
  UNISWAP_V3: {
    name: 'Uniswap V3',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481', // Uniswap V3 Router on Base
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD', // Uniswap V3 Factory
    website: 'https://app.uniswap.org',
  },
} as const;

/**
 * Common Base tokens
 */
export const BASE_TOKENS = {
  WETH: {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  USDC: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
} as const;

/**
 * RPC Endpoints
 */
export const RPC_URLS = {
  BASE_MAINNET: 'https://mainnet.base.org',
  BASE_SEPOLIA: 'https://sepolia.base.org',
} as const;

/**
 * Block Explorers
 */
export const BLOCK_EXPLORERS = {
  BASE_MAINNET: 'https://basescan.org',
  BASE_SEPOLIA: 'https://sepolia.basescan.org',
} as const;

/**
 * Beryl Upgrade Status
 * @see https://docs.base.org/base-chain/specs/upgrades/beryl/overview
 */
export const BERYL_STATUS = {
  TESTNET_ACTIVE: true,
  MAINNET_SCHEDULED: '2026-06-25',
  MAINNET_ACTIVE: true,
  WITHDRAWAL_DELAY_DAYS: 5, // Reduced from 7 days
} as const;
