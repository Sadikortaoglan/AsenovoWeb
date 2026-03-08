# Sara Asansor Web

## Tenant-Aware Frontend (Subdomain)

Bu proje tek build ile subdomain bazlı tenant çalışacak şekilde yapılandırılmıştır.

### Tenant tespiti
- Tenant, `window.location.hostname` üzerinden otomatik tespit edilir.
- Örnek:
- `default.asenovo.local` -> `default`
- `acme.asenovo.local` -> `acme`
- `localhost` / `127.0.0.1` için fallback tenant: `default`

### API base URL
- Varsayılan: `VITE_API_BASE_URL=/api`
- Frontend içinde sabit `localhost` API URL kullanılmaz.
- Tüm istekler aynı origin altında `/api/...` yoluna gider.

### Local geliştirme (subdomain)
`/etc/hosts` içine:

```txt
127.0.0.1 default.asenovo.local
127.0.0.1 acme.asenovo.local
```

`.env.local`:

```env
VITE_API_BASE_URL=/api
VITE_DEV_PROXY_TARGET=http://localhost:8081
```

Çalıştırma:

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Uygulama erişimi:
- `http://default.asenovo.local:5173`
- `http://acme.asenovo.local:5173`

### Tenant izole auth
- Token anahtarları tenant bazlıdır:
  - `auth_token_<tenant>`
  - `refresh_token_<tenant>`
- Hostname tenant değiştiğinde önceki tenant oturumu temizlenir.

### Boot-time tenant doğrulama
- Uygulama açılışında `GET /api/health` çağrılır.
- Tenant bulunamazsa `Tenant bulunamadı` ekranı gösterilir.

### Bilinen hata durumları
- `TENANT_NOT_FOUND` / tenant 404: Tenant ekranı veya kullanıcıya açıklayıcı mesaj
- `401/403`: Oturum/izin mesajı ve gerektiğinde login yönlendirmesi
- `429`: Hız limiti mesajı
