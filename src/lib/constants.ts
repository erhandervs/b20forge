export const CHAIN = {
  id: 8453,
  name: 'Base',
  network: 'base',
  rpcUrl: 'https://mainnet.base.org',
  explorerUrl: 'https://basescan.org',
  iconUrl: '/base-logo.svg',
} as const;

// External DEX URLs - liquidity is managed on external platforms
export const DEX = {
  aerodrome: {
    name: 'Aerodrome',
    url: 'https://aerodrome.finance',
    poolUrl: 'https://aerodrome.finance/pools',
    addLiquidityUrl: 'https://aerodrome.finance/deposit',
    swapUrl: 'https://aerodrome.finance/swap',
    logo: '✈️',
    color: '#c84b31',
    description: "Base'in ana likidite merkezi. ve(3,3) modeli ile optimize edilmiş.",
  },
  uniswap: {
    name: 'Uniswap v3',
    url: 'https://app.uniswap.org',
    poolUrl: 'https://app.uniswap.org/pool',
    addLiquidityUrl: 'https://app.uniswap.org/add',
    swapUrl: 'https://app.uniswap.org/swap',
    logo: '🦄',
    color: '#fd017a',
    description: 'Konsantre likidite ile sermaye verimliliği en yüksek DEX.',
  },
} as const;

// B20 Token Standard info
export const B20_INFO = {
  name: 'B20',
  description: 'Base Beryl yükseltmesiyle gelen yerel token standardı',
  features: [
    'ERC-20 tam uyumlu',
    'ERC-2612 Permit (imza tabanlı onay)',
    'Yerleşik Mint/Burn rolleri',
    'Policy tabanlı izin listeleri',
    'Supply Cap desteği',
    'Memo alanı (on-chain notlar)',
    'Pause mekanizması',
    'Rebasing (Asset varyantı)',
    'Configurable decimals (6-18)',
    'Contract URI (ERC-7572)',
  ],
  variants: [
    {
      id: 'asset',
      name: 'Asset',
      description: 'Stablecoin ve RWA için. Rebasing, configurable decimals, memo alanı.',
      useCases: ['Stablecoin', 'Real World Assets', 'Wrapped Assets'],
    },
    {
      id: 'governance',
      name: 'Governance',
      description: 'DAO ve protokol token için. Standart ERC-20 + permit + roller.',
      useCases: ['DAO Token', 'Protocol Token', 'Utility Token'],
    },
  ],
} as const;

export const NAV_ITEMS = [
  { id: 'swap', label: 'Swap', icon: 'ArrowLeftRight', path: '/swap' },
  { id: 'launchpad', label: 'Launchpad', icon: 'Rocket', path: '/launchpad' },
  { id: 'explore', label: 'Explore', icon: 'Compass', path: '/explore' },
  { id: 'liquidity', label: 'Liquidity', icon: 'Droplets', path: '/liquidity' },
  { id: 'portfolio', label: 'Portfolio', icon: 'PieChart', path: '/portfolio' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart2', path: '/analytics' },
  { id: 'security', label: 'Security', icon: 'Shield', path: '/security' },
] as const;

export const MOCK_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', price: 3842.5, change24h: 2.14, balance: 1.24, logo: '⟠', color: '#627eea' },
  { symbol: 'USDC', name: 'USD Coin', price: 1.0, change24h: 0.01, balance: 2460.07, logo: '🔵', color: '#2775ca' },
  { symbol: 'WETH', name: 'Wrapped ETH', price: 3840.12, change24h: 2.11, balance: 0.25, logo: '⟠', color: '#627eea' },
  { symbol: 'BRETT', name: 'Brett', price: 0.1222, change24h: 5.32, balance: 1200, logo: '🐸', color: '#4caf50' },
  { symbol: 'TOSHI', name: 'Toshi', price: 0.00045, change24h: -1.87, balance: 25000, logo: '😸', color: '#ff9800' },
  { symbol: 'DEGEN', name: 'Degen', price: 0.00712, change24h: 8.31, balance: 8000, logo: '🎩', color: '#a855f7' },
  { symbol: 'PUAN', name: 'PuanToken', price: 0.0248, change24h: 12.45, balance: 50000, logo: '🔷', color: '#0052ff' },
] as const;

/**
 * Real Base Network Token Addresses
 * These are actual ERC-20 tokens deployed on Base Mainnet
 */
export const BASE_TOKENS = [
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x4200000000000000000000000000000000000006' as const,
    decimals: 18,
    logo: 'https://ethereum-optimism.github.io/data/WETH/logo.png',
    color: '#627eea',
    coingeckoId: 'weth',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
    decimals: 6,
    logo: 'https://ethereum-optimism.github.io/data/USDC/logo.png',
    color: '#2775ca',
    coingeckoId: 'usd-coin',
  },
  {
    symbol: 'USDbC',
    name: 'USD Base Coin',
    address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA' as const,
    decimals: 6,
    logo: 'https://ethereum-optimism.github.io/data/USDC/logo.png',
    color: '#26a17b',
    coingeckoId: 'bridged-usd-coin-base',
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as const,
    decimals: 18,
    logo: 'https://ethereum-optimism.github.io/data/DAI/logo.svg',
    color: '#f5ac37',
    coingeckoId: 'dai',
  },
  {
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22' as const,
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/27008/small/cbeth.png',
    color: '#0052ff',
    coingeckoId: 'coinbase-wrapped-staked-eth',
  },
] as const;

export type BaseToken = typeof BASE_TOKENS[number];

export const formatNumber = (n: number, decimals = 2) => {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(decimals)}`;
};

export const formatPercent = (n: number) => {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
};
