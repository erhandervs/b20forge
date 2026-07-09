# B20 Token Deployment Troubleshooting Guide

**Issue:** Deploy butona tıklanınca hiçbir işlem gerçekleşmiyor  
**Date:** July 3, 2026  
**Status:** ✅ Configuration Fixed - Ready for testing

---

## ✅ Fixed Configuration Issues

### 1. Environment Variables (.env.local)
**Problem:** Hala testnet'te kalmıştı  
**Fixed:** Mainnet'e geçirildi

```bash
# BEFORE (WRONG)
NEXT_PUBLIC_DEFAULT_CHAIN_ID=84532  # Testnet
NEXT_PUBLIC_B20_FACTORY_ADDRESS=0x0000000000000000000000000000000000000B20
NEXT_PUBLIC_ENABLE_MAINNET=false

# AFTER (CORRECT)
NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453  # Mainnet
NEXT_PUBLIC_B20_FACTORY_ADDRESS=0xB20f000000000000000000000000000000000000
NEXT_PUBLIC_ENABLE_MAINNET=true
NEXT_PUBLIC_ENABLE_TESTNET=false
```

### 2. Mainnet Adresleri Doğru
```typescript
✓ Factory: 0xB20f000000000000000000000000000000000000
✓ Activation Registry: 0x8453000000000000000000000000000000000001
✓ Policy Registry: 0x8453000000000000000000000000000000000002
✓ Chain ID: 8453 (Base Mainnet)
```

### 3. Feature Flags Etkinleştirildi
```bash
✓ NEXT_PUBLIC_ENABLE_MAINNET=true
✓ NEXT_PUBLIC_ENABLE_B20_DEPLOYMENT=true
✓ BERYL_STATUS.MAINNET_ACTIVE=true
```

---

## 🔍 Hata Ayıklama Adımları

### Adım 1: Dev Server'ı Yeniden Başlat
```bash
# Eski process'i öldür
pkill -f "next dev"

# Yeniden başlat
cd /Users/ibrahimacar/Documents/b20
npm run dev
```

**Neden:** Environment variable değişiklikleri yeni başlatma gerektirir

### Adım 2: Tarayıcı Console'u Aç
1. Chrome/Brave açın
2. F12 veya Cmd+Option+I
3. Console tab'ına geçin
4. Network tab'ını da açın

### Adım 3: Wallet Bağlantısını Kontrol Et
```
✓ Cüzdan bağlı mı?
✓ Base Mainnet seçili mi?
✓ Address görünüyor mu header'da?
```

### Adım 4: Deploy Butonu Test Et
1. Launchpad sayfasına git
2. Form'u doldurun (En az: name, symbol, description)
3. Deploy butonu **disabled** değilse:
   - Tıkla
   - Console'da log'ları izle
4. Deploy butonu **disabled** ise:
   - Hangi alan eksik?
   - Form validation kontrol et

### Adım 5: Console Log'larını İncele

Deploy butonuna tıklayınca görmek istediğin log'lar:

```javascript
// BAŞARILI AKIŞ:
1. "Launchpad deploy started" { address, chainId, form }
2. "Checking activation..."
3. "simulateContract result" { ... }
4. "Estimated gas for createB20" { gasLimit }
5. "Sending createB20 transaction via writeContract"
6. "Transaction sent: 0x..."
7. "Deploy progress: waiting-confirmation"
8. "Deploy progress: verifying-contract"
9. "Token deployed successfully!"

// HATA DURUMU:
- "Connect your wallet first to deploy a token."
- "Switch your wallet to Base Mainnet before deploying."
- "Base mainnet B20 launchpad is not available..."
- "Wallet client not available"
- "simulateContract failed: ..."
- "Gas estimation failed: ..."
- "writeContract failed: ..."
```

---

## 🐛 Olası Hatalar ve Çözümleri

### Hata 1: "Connect your wallet first"
**Neden:** Wallet bağlı değil  
**Çözüm:** 
- Header'daki "Connect Wallet" butonuna tıkla
- MetaMask/Coinbase Wallet ile bağlan

### Hata 2: "Switch your wallet to Base Mainnet"
**Neden:** Wallet başka bir network'te  
**Çözüm:**
- Wallet'ta Base Mainnet seçin
- VEYA launchpad sayfasındaki "Switch to Base Mainnet" butonuna tıklayın

### Hata 3: "Base mainnet B20 launchpad is not available"
**Neden:** `BERYL_STATUS.MAINNET_ACTIVE` false  
**Çözüm:**
- `src/lib/b20-config.ts` dosyasında kontrol et
- `MAINNET_ACTIVE: true` olmalı ✅ (Zaten düzeltildi)

### Hata 4: Deploy butonuna tıklayınca hiçbir şey olmuyor
**Olası Nedenler:**
1. **Form validation**: Eksik alan var
   - name, symbol, description zorunlu
   - Console'da "form validation failed" log'u var mı?

2. **Wallet client yok**: 
   ```javascript
   if (!this.walletClient) {
     throw new Error('Wallet client not available');
   }
   ```
   - Wallet bağlantısını kontrol et
   - Sayfayı yenile ve tekrar dene

3. **Network uyuşmazlığı**:
   - Chain ID kontrolü yapılıyor
   - Base Mainnet (8453) olmalı

4. **JavaScript hatası**:
   - Console'da kırmızı hata var mı?
   - Syntax error, undefined variable vb.

### Hata 5: "Gas estimation failed"
**Neden:** Contract çağrısı simülasyon başarısız  
**Çözüm:**
- Factory address doğru mu kontrol et
- ABI doğru mu kontrol et
- Wallet'ta yeterli ETH var mı? (Gas fee için)

### Hata 6: "Transaction reverted"
**Olası Nedenler:**
1. Activation Registry kontrolü başarısız
   - `isActivated()` fonksiyonu false dönüyor
   - Mainnet'te activation gerekli mi kontrol et

2. Insufficient gas
   - Gas limit çok düşük
   - Gas price çok düşük

3. Contract hatası
   - Factory contract'ında bug olabilir
   - Base docs'u kontrol et

---

## 🔧 Kod Seviyesinde Kontroller

### 1. Launchpad Page (`src/app/launchpad/page.tsx`)

**Deploy fonksiyonu çalışıyor mu?**
```typescript
const deploy = async () => {
  console.log('🚀 DEPLOY FUNCTION CALLED'); // BU LOG'U EKLE
  
  if (!isConnected || !address || !factoryService) {
    console.error('❌ Validation failed:', { isConnected, address, factoryService });
    setDeployError('Connect your wallet first to deploy a token.');
    return;
  }
  
  // ... rest of function
}
```

**Button disabled mi?**
```tsx
<Button 
  onClick={deploy}
  disabled={deploying || !launchpadEnabled || !isBaseMainnet}
  // ^ BU ŞARTLARI KONTROL ET
>
  {deploying ? 'Deploying...' : 'Deploy Token'}
</Button>
```

### 2. Factory Service (`src/services/b20-factory.service.ts`)

**Service initialize edilmiş mi?**
```typescript
const factoryService = useFactoryService();
console.log('Factory service:', factoryService); // null mu değil mi?
```

**simulateContract çalışıyor mu?**
```typescript
const simulateResult = await this.publicClient.simulateContract({
  address: B20_FACTORY_ADDRESS, // 0xB20f...
  abi: B20_FACTORY_ABI,
  functionName: 'createB20',
  args: [config.variant, salt, params, initCalls],
  account: userAddress,
});
```

### 3. Activation Registry (`src/lib/activation-registry.ts`)

**Activation check**:
```typescript
const { isActivated, isLoading, error } = useIsActivated();
console.log('Activation status:', { isActivated, isLoading, error });
```

**Mainnet'te activation bypass:**
```typescript
// isActivated should be TRUE on mainnet
return {
  isActivated: isMainnetLaunchpadActive || Boolean(isActivated),
  // ^ BERYL_STATUS.MAINNET_ACTIVE true ise otomatik true döner
}
```

---

## 🧪 Test Senaryosu

### Senaryo 1: Minimum Token Deploy
```
1. Connect wallet (Base Mainnet)
2. Fill form:
   - Name: "Test Token"
   - Symbol: "TEST"
   - Description: "Test token for B20"
   - Total Supply: 1000000
   - Leave other fields default
3. Click "Deploy Token"
4. Expected: MetaMask açılır, transaction onayı ister
5. Confirm transaction
6. Wait for confirmation
7. Token address görünür
```

### Senaryo 2: Console Log Debug
```javascript
// Tarayıcı console'una yapıştır:
window.deployDebug = true;

// Deploy butonuna tıkla
// Tüm log'ları izle
// Hangi adımda durdu?
```

---

## 📊 Checklist

Deployment öncesi kontrol listesi:

### Environment
- [ ] `.env.local` mainnet ayarlarında
- [ ] Dev server yeniden başlatıldı
- [ ] Tarayıcı yenilendi (hard refresh: Cmd+Shift+R)

### Wallet
- [ ] Wallet bağlı
- [ ] Base Mainnet seçili
- [ ] Address görünüyor
- [ ] Yeterli ETH var (gas için, ~0.001 ETH)

### Form
- [ ] Token name dolu
- [ ] Token symbol dolu (3-6 karakter)
- [ ] Description dolu
- [ ] Total supply valid number
- [ ] Variant seçili (governance/asset)

### UI
- [ ] Deploy butonu enabled
- [ ] "Switch to Base Mainnet" uyarısı YOK
- [ ] "Mainnet Readiness" = "Ready" gösteriyor
- [ ] Console'da hata YOK

### Network
- [ ] Chain ID: 8453
- [ ] Factory address: 0xB20f...
- [ ] RPC çalışıyor (basescan.org açılıyor)

---

## 🔥 Hızlı Fix

Eğer hala çalışmıyorsa:

```bash
# 1. Process'leri temizle
pkill -f "next"

# 2. Node modules temizle (son çare)
rm -rf node_modules .next
npm install

# 3. Yeniden başlat
npm run dev

# 4. Tarayıcıyı kapat/aç (cache temizle)
# Chrome: Cmd+Shift+Delete → Clear cache

# 5. Tekrar dene
```

---

## 📞 Debug İçin Gerekli Bilgiler

Eğer sorun devam ederse, şunları paylaş:

1. **Console log'ları** (tamamı)
2. **Network tab** (failed request var mı?)
3. **Wallet network** (Base Mainnet mi?)
4. **Deploy butonu disabled mi?**
5. **Form hangi adımda?** (1, 2, 3, 4)
6. **Error message** (varsa)

---

## ✅ Sonuç

Konfigürasyon düzeltildi:
- ✅ Mainnet adresleri doğru
- ✅ Chain ID: 8453
- ✅ Feature flags enabled
- ✅ .env.local updated

**Şimdi yapman gerekenler:**
1. Dev server'ı yeniden başlat
2. Tarayıcıyı yenile (hard refresh)
3. Wallet'ı Base Mainnet'e geç
4. Deploy'u tekrar dene
5. Console log'larını izle

Deploy çalışmazsa console log'larını at, daha detaylı debug yaparız!
