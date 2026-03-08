export function MarketingHostScreen() {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-xl rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Asenovo Marketing Modu</h1>
        <p className="text-sm text-slate-600">
          Bu alan adı tanıtım sitesi için ayrılmıştır. Panel girişi tenant alan adlarından yapılmalıdır.
        </p>
        <p className="text-sm text-slate-600">Mevcut host: {currentHost}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://asenovo.com"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Asenovo Ana Sayfa
          </a>
          <a
            href="http://default.asenovo.local:5173/login"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Tenant Giriş Örneği
          </a>
        </div>
      </div>
    </div>
  )
}
