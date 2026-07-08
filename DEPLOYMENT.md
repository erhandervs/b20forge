# 🚀 B20Forge Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- Git

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure:

```env
# Required for wallet connection
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Network configuration
NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453  # Base Mainnet

# Optional: Use Alchemy or Infura for better RPC reliability
NEXT_PUBLIC_BASE_MAINNET_RPC=https://mainnet.base.org
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
```

**Get a WalletConnect Project ID:**
1. Visit https://cloud.walletconnect.com/
2. Sign up and create a new project
3. Copy the Project ID

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:4000](http://localhost:4000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

## 📋 Current Status

### ✅ Fully Implemented
- Complete UI/UX for all pages
- Responsive mobile design
- Token deployment flow
- Liquidity management interface
- Portfolio tracking
- Token explorer with pagination
- Security analysis interface

### 🔄 Pending Integration
- Web3 wallet connection (viem/wagmi setup required)
- B20 factory contract interaction
- Real-time blockchain data fetching
- Transaction signing and broadcasting
- IPFS metadata upload

## 🌐 Network Information

### Base Mainnet (Production Target)
- **Chain ID**: 8453
- **RPC URL**: https://mainnet.base.org
- **Explorer**: https://basescan.org
- **B20 Status**: Enabled for launchpad deployment

### Base Sepolia Testnet (Optional fallback)
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Explorer**: https://sepolia.basescan.org

## 🔧 Development Tips

### Testing Without Web3

The application is fully functional for UI/UX testing without wallet connection:
- All pages render correctly
- Forms validate properly
- Modals work as expected
- Pagination functions
- Responsive design can be tested

### Adding Web3 Integration

To add full blockchain functionality:

1. **Install Web3 libraries** (already in package.json):
   ```bash
   npm install
   ```

2. **Create wagmi config** (`src/lib/wagmi-config.ts`):
   ```typescript
   import { http, createConfig } from 'wagmi'
   import { base, baseSepolia } from 'wagmi/chains'
   
   export const config = createConfig({
     chains: [baseSepolia, base],
     transports: {
       [baseSepolia.id]: http(),
       [base.id]: http(),
     },
   })
   ```

3. **Wrap app with providers** in `src/app/layout.tsx`

4. **Implement wallet hooks** in `src/lib/hooks.ts`

### Project Structure

```
b20/
├── src/
│   ├── app/                 # Next.js pages
│   │   ├── page.tsx        # Dashboard
│   │   ├── swap/           # Token swap
│   │   ├── launchpad/      # Token deployment
│   │   ├── explore/        # Token explorer
│   │   ├── liquidity/      # Liquidity pools
│   │   ├── portfolio/      # Portfolio tracker
│   │   ├── security/       # Security analysis
│   │   └── analytics/      # Analytics
│   ├── components/         # Reusable components
│   │   ├── ui/            # UI primitives
│   │   ├── layout/        # Layout components
│   │   └── charts/        # Chart components
│   └── lib/               # Utilities & config
│       ├── hooks.ts       # Custom React hooks
│       ├── constants.ts   # App constants
│       └── b20-config.ts  # B20 configuration
├── public/                # Static assets
└── package.json
```

## 🐛 Troubleshooting

### Port Already in Use

If port 4000 is already in use:
```bash
npm run dev -- --port 3000
```

### Build Errors

1. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run build
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### TypeScript Errors

Check for type errors:
```bash
npx tsc --noEmit
```

## 📚 Additional Resources

- [Base Documentation](https://docs.base.org)
- [B20 Specification](https://docs.base.org/base-chain/specs/upgrades/beryl/b20)
- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh)
- [Viem Documentation](https://viem.sh)

## 🆘 Support

For issues and questions:
1. Check the [Base Discord](https://discord.gg/buildonbase)
2. Review [Base Documentation](https://docs.base.org)
3. Check GitHub Issues (if repository is available)

## 📝 License

MIT License - See LICENSE file for details

---

**Note**: The launchpad is now configured for Base Mainnet deployment and can be used with a connected wallet on chain ID 8453.
