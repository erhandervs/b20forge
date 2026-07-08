# B20Forge - Base Network B20 Token Launchpad

A comprehensive platform for deploying, managing, and trading B20 native tokens on Base Network.

## 🚀 What is B20?

**Status**: ✅ **MAINNET LIVE** (Activated July 8, 2026 at 18:00 UTC)

B20 is Base's native token standard introduced in the Beryl upgrade. Unlike traditional ERC-20 tokens deployed as smart contracts, B20 tokens are Rust precompiles embedded directly into the Base chain, offering:

- **Lower gas costs** - Native execution is ~30-50% cheaper than EVM contracts
- **Higher throughput** - Better performance for high-volume applications
- **Full ERC-20 compatibility** - Works seamlessly with existing wallets and DApps
- **Built-in compliance** - Role-based access, policy lists, supply caps, and pause functionality
- **Enhanced security** - Audited code running at the protocol layer

### Official B20 Addresses (Base Mainnet)
- **Factory**: `0xB20f000000000000000000000000000000000000`
- **Activation Registry**: `0x8453000000000000000000000000000000000001`
- **Policy Registry**: `0x8453000000000000000000000000000000000002`

## ✨ Features

### 🎯 Token Launchpad
- Deploy B20 tokens with a user-friendly interface
- Choose between Governance and Asset variants
- Configure features: Burnable, Permit, Supply Cap, Transfer Policies
- Allowlist/Blocklist address management
- Mandatory logo upload
- Social metadata (ERC-7572)

### 💱 Token Swap
- Swap tokens at best rates
- Real-time price quotes
- Low slippage tolerance
- Gas-optimized transactions

### 🔍 Token Explorer
- Discover B20 tokens launched on platform
- Real-time price charts
- Volume and liquidity tracking
- Pagination (10 tokens per page)

### 💧 Liquidity Pools
- Add/remove liquidity on Aerodrome
- Multiple pool types: Stable, Volatile, Concentrated
- Fee tier selection
- Position management with detailed analytics
- Pagination (10 pools per page)

### 📊 Portfolio Management
- Track all your B20 token holdings
- Real-time portfolio valuation
- Asset allocation visualization
- Transaction history

### 🔒 Security Analysis
- Token contract verification
- Security score calculation
- Vulnerability detection
- Audit reports

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Blockchain**: Base Network (Mainnet ready)

## 📱 Responsive Design

Fully optimized for mobile, tablet, and desktop devices with:
- Responsive grid layouts
- Touch-friendly UI components
- Mobile navigation menu
- Safe area support
- iOS input zoom prevention

## 🔗 Base Network Integration

### Beryl Upgrade Info
- **Testnet**: Available on Sepolia
- **Mainnet**: Enabled for launchpad deployment
- **Chain ID**: 8453 (Base Mainnet)
- **Withdrawal Time**: Reduced from 7 to 5 days

### B20 Precompile Addresses
B20 tokens use deterministic addresses derived from:
- Factory address
- Creator address
- Salt (deployment parameters)

## 🚧 Current Status

**✅ Important**: The platform is now configured for Base Mainnet launchpad deployment.

### Working Features
✅ Full UI/UX implementation
✅ Responsive mobile design
✅ Token deployment flow
✅ Liquidity management
✅ Portfolio tracking
✅ Token explorer with pagination

### Pending Integration
🔄 Web3 wallet connection (viem/wagmi)
🔄 B20 factory contract interaction
🔄 Real-time blockchain data
🔄 Transaction signing and broadcasting

## 🎨 Design System

### Color Palette
- **Background**: #071114 (Deep Dark)
- **Card Surface**: #111B22
- **Input**: #0A1520
- **Accent**: #14B8A6 (Teal)
- **Success**: #10B981
- **Error**: #EF4444
- **Warning**: #F59E0B

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 400, 500, 600, 700

## 📄 License

MIT License - Feel free to use this project as a foundation for your own B20 applications.

## 🔗 Resources

- [Base Documentation](https://docs.base.org)
- [B20 Specification](https://docs.base.org/base-chain/specs/upgrades/beryl/b20)
- [Beryl Upgrade Overview](https://docs.base.org/base-chain/specs/upgrades/beryl/overview)
- [Base Blog](https://blog.base.org)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ for the Base ecosystem
# b20forge
