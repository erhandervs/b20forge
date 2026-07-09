# Dev Server Yeniden Başlatma

Şu an **eski bir dev server** hala çalışıyor ve yeni başlatmayı engelliyor.

## 🔴 Sorunu Çöz

### Terminal'de bu komutu çalıştır:

```bash
kill 5114
```

VEYA

```bash
pkill -f "next dev"
```

### Sonra yeni server başlat:

```bash
cd /Users/ibrahimacar/Documents/b20
npm run dev
```

## ✅ Server Başladıktan Sonra

1. Tarayıcıda `http://localhost:4000` aç
2. **Hard refresh** yap: `Cmd+Shift+R` (Mac)
3. Launchpad sayfasına git
4. Base Mainnet'e bağlı olduğundan emin ol
5. Deploy'u dene!

## 🎯 Beklenen Sonuç

Server başladığında şunu göreceksin:

```
▲ Next.js 16.2.10 (webpack)
- Local:         http://localhost:4000
- Environments: .env.local
✓ Ready in 1040ms
✓ Compiled in 234ms
```

Bu göründüğünde hazırsın! 🚀
