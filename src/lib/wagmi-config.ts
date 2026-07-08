import { http } from 'wagmi'
import { base, baseSepolia, type Chain } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

// Get environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'
const defaultChainId = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || '8453')

const supportedChains: readonly [Chain, ...Chain[]] = [base, baseSepolia]
export const defaultChain = defaultChainId === baseSepolia.id ? baseSepolia : base

// Create wagmi config with RainbowKit - Base Mainnet + Sepolia Testnet
export const wagmiConfig = getDefaultConfig({
  appName: 'B20Forge',
  projectId,
  chains: supportedChains,
  ssr: true,
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_MAINNET_RPC || base.rpcUrls.default.http[0]),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || baseSepolia.rpcUrls.default.http[0]),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
