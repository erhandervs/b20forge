# Vercel Environment Variables Setup

Bu dosya, B20Forge projesini Vercel'e deploy ederken eklenmesi gereken environment variable'ları açıklar.

---

## 🔴 ZORUNLU (Required)

Bu değişkenler olmadan proje çalışmaz:

### 1. WalletConnect Project ID
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=a5cf6e15ec1f72f54d45548ce9d86214
```
**Nereden alınır:** https://cloud.walletconnect.com/  
**Ne işe yarar:** Wallet bağlantısı için gerekli (MetaMask, Coinbase Wallet, vb.)  
**Zaten mevcut:** Evet, `.env.local`'de var, aynı değeri kullanabilirsin

---

### 2. Network Configuration
```
NEXT_PUBLIC_BASE_MAINNET_RPC=https://mainnet.base.org
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453
```
**Ne işe yarar:** Base blockchain'e bağlantı için RPC URL'leri  
**Değer:** Yukarıdaki değerleri aynen kullan (mainnet için)

---

### 3. B20 Contract Addresses (MAINNET - July 8, 2026)
```
NEXT_PUBLIC_B20_FACTORY_ADDRESS=0xB20f000000000000000000000000000000000000
NEXT_PUBLIC_B20_ACTIVATION_REGISTRY=0x8453000000000000000000000000000000000001
NEXT_PUBLIC_B20_POLICY_REGISTRY=0x8453000000000000000000000000000000000002
```
**Ne işe yarar:** B20 token deployment için mainnet contract adresleri

---

### 4. DEX Router Addresses (Base Mainnet)
```
NEXT_PUBLIC_AERODROME_ROUTER=0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43
NEXT_PUBLIC_AERODROME_FACTORY=0x420DD381b31aEf6683db6B902084cB0FFECe40Da
NEXT_PUBLIC_UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
NEXT_PUBLIC_UNISWAP_V3_FACTORY=0x33128a8fC17869897dcE68Ed026d694621f6FDfD
```
**Ne işe yarar:** Swap ve liquidity işlemleri için DEX router'ları

---

### 5. Feature Flags
```
NEXT_PUBLIC_ENABLE_MAINNET=true
NEXT_PUBLIC_ENABLE_TESTNET=false
NEXT_PUBLIC_ENABLE_B20_DEPLOYMENT=true
NEXT_PUBLIC_ENABLE_LIQUIDITY=true
NEXT_PUBLIC_ENABLE_SWAP=true
```
**Ne işe yarar:** Özellikleri açıp kapatmak için

---

## 🟡 ÖNERİLEN (Recommended)

Bu değişkenler olmadan da çalışır ama performans ve özellikler kısıtlı olur:

### 6. IPFS (Pinata) - Token Logo Upload için
```
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```
**Nereden alınır:** https://www.pinata.cloud/ (Ücretsiz plan yeterli)  
**Ne işe yarar:** Token deployment sırasında logo'yu IPFS'e yüklemek için  
**Not:** Yoksa logo yükleme özelliği çalışmaz

### 7. Basescan API Key - Contract Verification için
```
NEXT_PUBLIC_BASESCAN_API_KEY=your_basescan_api_key
```
**Nereden alınır:** https://basescan.org/apis  
**Ne işe yarar:** Deploy edilen contract'ları otomatik verify etmek için

### 8. Alchemy API Key - Daha hızlı RPC için
```
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
```
**Nereden alınır:** https://www.alchemy.com/ (Ücretsiz plan yeterli)  
**Ne işe yarar:** Public RPC yerine Alchemy kullanır, daha hızlı ve güvenilir  
**Not:** Yoksa public RPC kullanılır (yavaş olabilir)

---

## 🟢 OPSIYONEL (Optional)

Bu değişkenler olmadan da platform tam çalışır:

### 9. Security Scanning APIs
```
NEXT_PUBLIC_GOPLUS_API_KEY=your_goplus_api_key
NEXT_PUBLIC_ENABLE_SECURITY_SCAN=false
```
**Nereden alınır:** https://gopluslabs.io/  
**Ne işe yarar:** Token güvenlik taraması için  
**Not:** Security sayfası şu an pasif, gerekirse eklenebilir

### 10. Price Data APIs
```
NEXT_PUBLIC_COINGECKO_API_KEY=your_coingecko_api_key
NEXT_PUBLIC_THE_GRAPH_API_KEY=your_thegraph_api_key
```
**Ne işe yarar:** Token fiyat verileri için  
**Not:** Şu an DexScreener kullanıyoruz (API key gerektirmiyor), bunlar opsiyonel

---

## 📋 Vercel'e Nasıl Eklenir?

### Yöntem 1: Vercel Dashboard
1. Vercel Dashboard'a git
2. Projeye tıkla
3. **Settings** → **Environment Variables**
4. Her bir değişkeni tek tek ekle:
   - **Key:** `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - **Value:** `a5cf6e15ec1f72f54d45548ce9d86214`
   - **Environment:** Production, Preview, Development (hepsini seç)

### Yöntem 2: Vercel CLI (Toplu ekleme)
```bash
# .env.local dosyasını Vercel'e yükle
vercel env pull
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID production
vercel env add NEXT_PUBLIC_BASE_MAINNET_RPC production
# ... diğer değişkenler
```

### Yöntem 3: `.env.production` dosyası oluştur
Vercel otomatik olarak `.env.production` dosyasını okur:

```bash
# B20Forge Production Environment
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=a5cf6e15ec1f72f54d45548ce9d86214
NEXT_PUBLIC_BASE_MAINNET_RPC=https://mainnet.base.org
NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453
NEXT_PUBLIC_B20_FACTORY_ADDRESS=0xB20f000000000000000000000000000000000000
NEXT_PUBLIC_B20_ACTIVATION_REGISTRY=0x8453000000000000000000000000000000000001
NEXT_PUBLIC_AERODROME_ROUTER=0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43
NEXT_PUBLIC_UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
NEXT_PUBLIC_ENABLE_MAINNET=true
NEXT_PUBLIC_ENABLE_TESTNET=false
```

---

## ⚠️ ÖNEMLİ NOTLAR

### 1. `NEXT_PUBLIC_` Prefix
Tüm değişkenler `NEXT_PUBLIC_` ile başlamalı çünkü client-side'da kullanılıyor.

### 2. Mainnet vs Testnet
- **Mainnet için:** `NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453`
- **Testnet için:** `NEXT_PUBLIC_DEFAULT_CHAIN_ID=84532`

Şu an `.env.local`'de testnet var ama mainnet kullanmak için değiştir.

### 3. Sensitive Data
API key'ler gibi hassas veriler Vercel dashboard'dan eklenmeli, GitHub'a commit edilmemeli.

### 4. Deploy Sonrası
Environment variable değiştirince yeniden deploy etmen gerekir:
```bash
vercel --prod
```

---

## ✅ Minimum Gerekli Setup (Hızlı Başlangıç)

Sadece şu 6 değişkeni ekle, proje çalışır:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=a5cf6e15ec1f72f54d45548ce9d86214
NEXT_PUBLIC_BASE_MAINNET_RPC=https://mainnet.base.org
NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453
NEXT_PUBLIC_B20_FACTORY_ADDRESS=0xB20f000000000000000000000000000000000000
NEXT_PUBLIC_ENABLE_MAINNET=true
NEXT_PUBLIC_ENABLE_TESTNET=false
```

Geri kalanını sonra ekleyebilirsin!

---

## 🔗 Yararlı Linkler

- WalletConnect Project: https://cloud.walletconnect.com/
- Pinata IPFS: https://www.pinata.cloud/
- Alchemy RPC: https://www.alchemy.com/
- Basescan API: https://basescan.org/apis
- Base Docs: https://docs.base.org/

---

**Son Güncelleme:** July 3, 2026  
**Durum:** Mainnet Ready ✅
