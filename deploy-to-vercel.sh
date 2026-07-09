#!/bin/bash

# B20Forge Vercel Deployment Script
# Usage: ./deploy-to-vercel.sh

set -e

echo "🚀 B20Forge Vercel Deployment"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in B20 project directory"
    echo "Run: cd /Users/ibrahimacar/Documents/b20"
    exit 1
fi

# Check git status
echo "📋 Checking git status..."
if ! git status >/dev/null 2>&1; then
    echo "❌ Error: Not a git repository"
    exit 1
fi

# Show current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $BRANCH"
echo ""

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Uncommitted changes detected:"
    git status --short
    echo ""
    read -p "❓ Do you want to commit these changes? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📦 Staging all changes..."
        git add .
        
        echo ""
        echo "📝 Commit message:"
        echo "feat: B20 mainnet deployment + mobile responsive optimization"
        echo ""
        read -p "❓ Use this commit message? (y/n): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git commit -m "feat: B20 mainnet deployment + mobile responsive optimization

- Updated .env.local to Base Mainnet (Chain ID 8453)
- Fixed B20 factory address (0xB20f...)
- Added activation registry configuration
- Implemented comprehensive mobile responsive CSS (200+ lines)
- Optimized Sidebar, Header, and all pages for mobile
- Updated logo to variant_c.svg
- Fixed liquidity page restoration
- Created deployment troubleshooting guides"
        else
            read -p "Enter commit message: " COMMIT_MSG
            git commit -m "$COMMIT_MSG"
        fi
    else
        echo "❌ Deployment cancelled. Please commit your changes first."
        exit 1
    fi
fi

# Push to remote
echo ""
echo "🔄 Pushing to remote..."
read -p "❓ Push to '$BRANCH' branch? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin "$BRANCH"
    echo "✅ Code pushed successfully!"
else
    echo "❌ Push cancelled"
    exit 1
fi

echo ""
echo "=============================="
echo "✅ Code Deployment Complete!"
echo "=============================="
echo ""
echo "📌 NEXT STEPS:"
echo ""
echo "1️⃣  Open Vercel Dashboard:"
echo "   https://vercel.com/dashboard"
echo ""
echo "2️⃣  Go to your project → Settings → Environment Variables"
echo ""
echo "3️⃣  Add/Update these variables (Production, Preview, Development):"
echo "   NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453"
echo "   NEXT_PUBLIC_B20_FACTORY_ADDRESS=0xB20f000000000000000000000000000000000000"
echo "   NEXT_PUBLIC_B20_ACTIVATION_REGISTRY=0x8453000000000000000000000000000000000001"
echo "   NEXT_PUBLIC_ENABLE_MAINNET=true"
echo "   NEXT_PUBLIC_ENABLE_TESTNET=false"
echo ""
echo "4️⃣  Trigger Redeploy:"
echo "   Deployments → ... → Redeploy (WITHOUT cache)"
echo ""
echo "5️⃣  Test on production:"
echo "   - Open production URL"
echo "   - Hard refresh (Cmd+Shift+R)"
echo "   - Connect wallet (Base Mainnet)"
echo "   - Test token deployment"
echo ""
echo "📚 Full guide: VERCEL_DEPLOYMENT_GUIDE.md"
echo "🐛 Troubleshooting: B20_DEPLOYMENT_TROUBLESHOOTING.md"
echo ""
