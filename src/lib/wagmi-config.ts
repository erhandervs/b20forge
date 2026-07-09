import { http } from 'wagmi'
import { base, type Chain } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

// Get environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

const supportedChains: readonly [Chain, ...Chain[]] = [base]
export const defaultChain = base

// Create wagmi config with RainbowKit - Base Mainnet only
export const wagmiConfig = getDefaultConfig({
  appName: 'B20Forge',
  projectId,
  chains: supportedChains,
  ssr: true,
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_MAINNET_RPC || base.rpcUrls.default.http[0]),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
