# Vercel Deployment Guide - B20Forge Mainnet Update

**Amaç:** B20 mainnet configuration'ı Vercel'e deploy etmek  
**Durum:** ✅ Kod hazır, sadece push ve env variables gerekli

---

## 📦 Değişiklik Özeti

### 1. Environment Variables Güncellendi
- `.env.local` → Mainnet configuration
- Chain ID: 8453 (Base Mainnet)
- Factory Address: 0xB20f...
- Mainnet enabled: true

### 2. Mobil Responsive İyileştirmeleri
- 200+ satır mobil CSS
- Sidebar responsive
- Tüm sayfalar mobil uyumlu

### 3. Logo Güncellendi
- `variant_c.svg` kullanılıyor
- 48px responsive boyut

---

## 🚀 Deployment Adımları

### Adım 1: Git Push (Terminal'de)

```bash
cd /Users/ibrahimacar/Documents/b20

# Değişiklikleri stage'le
git add .

# Commit yap
git commit -m "feat: B20 mainnet deployment + mobile responsive optimization

- Updated .env.local to Base Mainnet (Chain ID 8453)
- Fixed B20 factory address (0xB20f...)
- Added activation registry configuration
- Implemented comprehensive mobile responsive CSS (200+ lines)
- Optimized Sidebar, Header, and all pages for mobile
- Updated logo to variant_c.svg
- Fixed liquidity page restoration
- Created deployment troubleshooting guides"

# Push et
git push origin main
```

**Alternatif:** Eğer git branch farklıysa:
```bash
git push origin <branch-name>
```

### Adım 2: Vercel Environment Variables

Vercel Dashboard'a git ve şu environment variable'ları ekle/güncelle:

#### ✅ ZORUNLU (Update These)
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=a5cf6e15ec1f72f54d45548ce9d86214
NEXT_PUBLIC_BASE_MAINNET_RPC=https://mainnet.base.org
NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453
NEXT_PUBLIC_B20_FACTORY_ADDRESS=0xB20f000000000000000000000000000000000000
NEXT_PUBLIC_B20_ACTIVATION_REGISTRY=0x8453000000000000000000000000000000000001
NEXT_PUBLIC_B20_POLICY_REGISTRY=0x8453000000000000000000000000000000000002
NEXT_PUBLIC_ENABLE_MAINNET=true
NEXT_PUBLIC_ENABLE_TESTNET=false
NEXT_PUBLIC_ENABLE_B20_DEPLOYMENT=true
NEXT_PUBLIC_ENABLE_LIQUIDITY=true
NEXT_PUBLIC_ENABLE_SWAP=true
```

#### 🟡 ÖNERİLEN (İsteğe Bağlı)
```
NEXT_PUBLIC_AERODROME_ROUTER=0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43
NEXT_PUBLIC_AERODROME_FACTORY=0x420DD381b31aEf6683db6B902084cB0FFECe40Da
NEXT_PUBLIC_UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
NEXT_PUBLIC_UNISWAP_V3_FACTORY=0x33128a8fC17869897dcE68Ed026d694621f6FDfD
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

**Nasıl Eklersin:**
1. Vercel Dashboard → Projen → **Settings**
2. **Environment Variables** tab
3. Her değişkeni ekle:
   - **Key:** `NEXT_PUBLIC_DEFAULT_CHAIN_ID`
   - **Value:** `8453`
   - **Environments:** Production, Preview, Development (hepsini seç)
4. **Save** tıkla

### Adım 3: Redeploy Trigger

Eğer git push otomatik trigger etmezse:

1. Vercel Dashboard → Projen → **Deployments**
2. En son deployment'ın yanındaki **⋯** (3 nokta)
3. **Redeploy** seç
4. **Use existing Build Cache** işaretini KALDIR
5. **Redeploy** tıkla

---

## ⚠️ ÖNEMLİ NOTLAR

### Environment Variables Önceliği
Vercel'de eklediğin env variables `.env.local` dosyasını override eder. Bu yüzden:
- `.env.local` sadece local development için
- Vercel'de mutlaka production env variables ekle

### Build Sürecinde Dikkat Et
Build log'larında şunları kontrol et:
```
✓ Creating an optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
```

Hata varsa:
```
✗ Failed to compile
```
Log'ları incele ve düzelt.

### Deployment Sonrası Test
1. Production URL'e git (e.g., `https://your-app.vercel.app`)
2. Hard refresh: `Cmd+Shift+R`
3. Wallet bağla (Base Mainnet)
4. Launchpad'e git
5. "Mainnet Readiness" = "Ready" göstermeli
6. Deploy Token butonuna tıkla
7. MetaMask açılmalı

---

## 🔍 Troubleshooting

### Hata 1: "Environment variable not found"
**Neden:** Vercel'de env variable eklenmemiş  
**Çözüm:** Settings → Environment Variables → Ekle → Redeploy

### Hata 2: "Still using testnet"
**Neden:** Cache'lenmiş env variables  
**Çözüm:** 
- Redeploy yaparken "Use existing Build Cache" işaretini KALDIR
- Environment variables'ı Production, Preview, Development için AYRI AYRI ekle

### Hata 3: Build failed
**Neden:** TypeScript hatası veya dependency sorunu  
**Çözüm:**
- Build log'ları incele
- Local'de `npm run build` çalıştır
- Hataları düzelt, commit, push

### Hata 4: "Deploy button not working"
**Neden:** Browser cache  
**Çözüm:**
- Hard refresh: `Cmd+Shift+R`
- Incognito mode'da aç
- Browser console'u kontrol et

---

## 📋 Deployment Checklist

### Pre-Deployment
- [x] Code changes committed
- [x] `.env.local` updated (local only)
- [x] All files saved
- [x] TypeScript errors fixed
- [x] Mobile responsive tested

### During Deployment
- [ ] Git push successful
- [ ] Vercel env variables added
- [ ] Build started automatically (or manually triggered)
- [ ] Build completed successfully
- [ ] No TypeScript errors
- [ ] No build warnings

### Post-Deployment
- [ ] Production URL accessible
- [ ] Hard refresh done
- [ ] Wallet connects to Base Mainnet
- [ ] Launchpad shows "Ready" status
- [ ] Deploy button works
- [ ] MetaMask transaction prompt appears
- [ ] Mobile layout works (test on phone)

---

## 🎯 Hızlı Deployment (TL;DR)

```bash
# 1. Terminal
cd /Users/ibrahimacar/Documents/b20
git add .
git commit -m "feat: mainnet deployment"
git push origin main

# 2. Vercel Dashboard
# Settings → Environment Variables → Add:
# NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453
# NEXT_PUBLIC_B20_FACTORY_ADDRESS=0xB20f...
# NEXT_PUBLIC_ENABLE_MAINNET=true
# (Tüm değişkenleri ekle)

# 3. Redeploy
# Deployments → ... → Redeploy (without cache)

# 4. Test
# https://your-app.vercel.app → Launchpad → Deploy
```

---

## 📞 Destek

Eğer deployment başarısız olursa:
1. Vercel build log'larını kopyala
2. Browser console hata mesajlarını kopyala
3. Hangi adımda takıldığını belirt

Detaylı troubleshooting: `B20_DEPLOYMENT_TROUBLESHOOTING.md`

---

**Son Güncelleme:** July 3, 2026  
**Durum:** ✅ Kod hazır, deployment bekleniyor  
**Next:** Git push → Vercel env variables → Redeploy → Test
