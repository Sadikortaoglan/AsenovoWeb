# Canli Notlari

Frontend local geliştirme için `.env.local` içinde:

```env
VITE_API_BASE_URL=/api
VITE_DEV_PROXY_TARGET=http://localhost:8080
```

Bu ayar sadece local HTTPS Vite proxy içindir. Canlı ortamda `/api` proxy mantığına güvenilmemelidir.

Canlıya çıkmadan önce kontrol:

- `.env.production` içindeki `VITE_API_BASE_URL` absolute production API olmalı.
- Şu an production değerimiz:

```env
VITE_API_BASE_URL=https://api.asenovo.com/api
```

- `VITE_APP_ENV=production` kalmalı.
- Local sertifika dosyaları (`asenovo.local+1.pem`, `asenovo.local+1-key.pem`) sadece local geliştirme içindir.
- Vite local proxy hedefi (`VITE_DEV_PROXY_TARGET`) production deploy davranışını belirlemez.

Kısa özet:

- Local: frontend HTTPS, backend HTTP olabilir; Vite proxy kullanılır.
- Production: frontend doğrudan gerçek HTTPS API adresine gitmelidir.
