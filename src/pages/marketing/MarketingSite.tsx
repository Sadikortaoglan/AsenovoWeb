import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import {
  BadgeCheck,
  BarChart3,
  BellRing,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Handshake,
  Headset,
  Mail,
  MapPinned,
  MessageCircle,
  Phone,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react'

const WHATSAPP_NUMBER = '905300000000'

function MarketingLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
        <div className="absolute inset-0 flex items-center justify-center text-lg font-extrabold tracking-tight text-white">A+</div>
      </div>
      <div>
        <div className="text-lg font-black leading-none text-slate-900">ASENOVO</div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Asansör Takip Platformu</div>
      </div>
    </div>
  )
}

function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#f8fbff_0%,#eef4ff_45%,#e6f8f6_100%)] text-slate-800">
      <header className="sticky top-0 z-10 border-b border-cyan-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <MarketingLogo />
          <nav className="flex items-center gap-1 text-sm font-semibold">
            <MarketingNavLink to="/">Ana Sayfa</MarketingNavLink>
            <MarketingNavLink to="/hakkimizda">Hakkımızda</MarketingNavLink>
            <MarketingNavLink to="/fiyatlandirma">Fiyatlandırma</MarketingNavLink>
            <MarketingNavLink to="/paketler">Paket Özellikleri</MarketingNavLink>
            <MarketingNavLink to="/iletisim">İletişim</MarketingNavLink>
            <a
              href="/login"
              className="ml-1 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-white transition hover:from-cyan-600 hover:to-indigo-700"
            >
              Panele Giriş
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>

      <footer className="mt-8 border-t border-cyan-100 bg-white/80 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 text-sm text-slate-600">
          <span>© {new Date().getFullYear()} Asenovo - Asansör Takip Sistemi</span>
          <span>Kurumsal saha operasyonları için tasarlandı</span>
        </div>
      </footer>
    </div>
  )
}

function MarketingNavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 transition ${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'}`
      }
    >
      {children}
    </NavLink>
  )
}

function HomePage() {
  return (
    <MarketingLayout>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-900 to-cyan-700 p-8 text-white shadow-xl md:p-12">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide">
            <Sparkles className="h-4 w-4" /> Kurumsal Dijital Dönüşüm
          </p>
          <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight md:text-5xl">
            Asansör servis operasyonlarınızı uçtan uca yönetin, ölçeklendirin ve ölçülebilir hale getirin.
          </h1>
          <p className="mt-4 max-w-3xl text-cyan-50/95 md:text-lg">
            Asenovo; sahadaki teknik ekip, ofis operasyonu, finans ve yönetim katmanını tek platformda birleştirir.
            Bakım, arıza, QR doğrulama, teklif, rapor ve fatura süreçlerini aynı merkezden yönetirsiniz.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="/iletisim" className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100">
              Demo Talep Et
            </a>
            <a href="/paketler" className="rounded-lg border border-white/50 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
              Tüm Özellikleri İncele
            </a>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <FeatureCard icon={<Wrench className="h-5 w-5" />} title="Bakım ve Arıza Yönetimi" text="Planlı bakımdan acil arızalara kadar tüm saha operasyonları tek akışta takip edilir." />
        <FeatureCard icon={<QrCode className="h-5 w-5" />} title="QR Doğrulama ve İzlenebilirlik" text="Sahada işlem başlatma/bitirme QR ile doğrulanır, denetlenebilir kayıt oluşur." />
        <FeatureCard icon={<BarChart3 className="h-5 w-5" />} title="Canlı Operasyonel Raporlama" text="Karar vericiler için performans, gelir-gider ve servis metrikleri anlık görünür." />
      </section>

      <section className="mt-8 rounded-2xl border border-cyan-100 bg-white p-7 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900">Platformun Temel Gereklilikleri</h2>
        <p className="mt-2 text-slate-600">Asansör firmasının üretimden denetime kadar ihtiyaç duyduğu çekirdek yetkinlikler.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <RequirementItem icon={<CalendarCheck2 className="h-5 w-5" />} title="Bakım Planlama" text="Periyodik plan, personel atama, gecikme alarmı ve tamamlanma takibi" />
          <RequirementItem icon={<ClipboardCheck className="h-5 w-5" />} title="Denetim ve Uygunluk" text="Kontrol listeleri, durum tespit raporları ve iz sürülebilir revizyonlar" />
          <RequirementItem icon={<FileSpreadsheet className="h-5 w-5" />} title="Fatura ve Finans Akışı" text="EDM uyumu, tahsilat kayıtları ve cari bazlı gelir-gider görünürlüğü" />
          <RequirementItem icon={<Users className="h-5 w-5" />} title="Rol ve Yetki Modeli" text="Patron, ofis personeli ve teknisyen rollerinde yetkiye göre ekran ve işlem" />
          <RequirementItem icon={<BellRing className="h-5 w-5" />} title="Proaktif Uyarı Mekanizması" text="Yaklaşan bakım, açık arıza, geciken iş emri ve kritik durum bildirimleri" />
          <RequirementItem icon={<ShieldCheck className="h-5 w-5" />} title="Güvenli Veri Katmanı" text="Tenant bazlı veri izolasyonu, token yönetimi ve API güvenlik standartları" />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-7">
        <h2 className="text-2xl font-black text-slate-900">Firmanızın Kazanacağı Yetkinlikler</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            'Sahadaki teknik operasyonu standartlaştırma',
            'Bakım kalitesini ölçülebilir KPI ile yönetme',
            'Kurumsal raporlama ile yönetim karar hızını artırma',
            'Müşteri iletişiminde şeffaf ve kayıtlı süreç kurma',
            'Birden fazla şube/bölgeyi merkezi panelden yönetebilme',
            'Denetim ve yasal gerekliliklerde hazır dokümantasyon',
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-lg border border-white/80 bg-white/80 p-3">
              <BadgeCheck className="h-5 w-5 text-emerald-600" />
              <span className="font-medium text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900">Sistem Akışı ve Şube Yaklaşımı</h2>
        <p className="mt-2 text-slate-600">
          Mevcut ürün mimarisinde temel izolasyon katmanı <span className="font-semibold">tenant</span> yapısıdır.
          Operasyonel dağılım bina/tesis seviyesinde yönetilir. Şube modeli, tenant içindeki bölgesel operasyon
          kurallarıyla temsil edilir; ihtiyaç halinde ayrı bir şube modülü eklenebilecek şekilde yapı korunmuştur.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <InfoCard title="1. Tenant Katmanı" text="Firma verisi tenant bazlı ayrışır; güvenlik, yetki ve token izolasyonu bu katmanda sağlanır." icon={<ShieldCheck className="h-5 w-5" />} />
          <InfoCard title="2. Operasyon Katmanı" text="Bina, asansör, bakım, arıza, tahsilat ve rapor süreçleri tenant içinde yönetilir." icon={<Building2 className="h-5 w-5" />} />
          <InfoCard title="3. Yönetim Katmanı" text="Yönetici ekranı KPI, SLA ve finansal görünümle karar süreçlerini hızlandırır." icon={<BarChart3 className="h-5 w-5" />} />
        </div>
      </section>
    </MarketingLayout>
  )
}

function AboutPage() {
  return (
    <MarketingLayout>
      <section className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900">Hakkımızda</h1>
        <p className="mt-4 leading-7 text-slate-600">
          Asenovo, asansör servis firmalarının operasyonel karmaşıklığını azaltmak ve saha verisini yönetilebilir bir
          işletme varlığına dönüştürmek için kuruldu. Ekibimiz; saha operasyonu, yazılım mühendisliği ve süreç
          iyileştirme disiplinlerini tek çatı altında birleştirir.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <InfoCard title="Neden Varız" text="Parçalı sistemler nedeniyle kaybolan operasyonel veriyi birleştirip firmaların verimli büyümesini sağlamak için." icon={<Handshake className="h-5 w-5" />} />
        <InfoCard title="Ne Amaçlıyoruz" text="Asansör bakım ve arıza süreçlerinde ulusal ölçekte dijital standart oluşturmayı amaçlıyoruz." icon={<MapPinned className="h-5 w-5" />} />
        <InfoCard title="Nasıl Çalışıyoruz" text="Müşteri geri bildirimi + saha gerçeği + veri odaklı ürün geliştirme modeliyle sürekli iyileştirme." icon={<Headset className="h-5 w-5" />} />
      </section>

      <section className="mt-6 rounded-2xl border border-cyan-100 bg-slate-900 p-8 text-white">
        <h2 className="text-2xl font-black">Vizyon ve İlkelerimiz</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            'Her kayıt denetlenebilir olmalı',
            'Teknoloji sahaya uymalı, sahayı zorlamamalı',
            'Karmaşık değil sade ve hızlı deneyim',
            'Güvenlik ve veri izolasyonu varsayılan olmalı',
          ].map((item) => (
            <div key={item} className="rounded-lg border border-white/20 bg-white/5 p-3">
              <span className="font-medium text-cyan-50">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900">Neyi Çözüyoruz?</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <RequirementItem icon={<Wrench className="h-5 w-5" />} title="Sahada Dağınık İş Akışları" text="Teknisyen, ofis ve yönetim ekiplerinin aynı veride çalışmasıyla tekrar eden iş ve bilgi kaybı azalır." />
          <RequirementItem icon={<QrCode className="h-5 w-5" />} title="Doğrulama Eksikliği" text="QR tabanlı başlat/bitir akışı sayesinde sahadaki işin gerçekleşme doğruluğu artar." />
          <RequirementItem icon={<ClipboardCheck className="h-5 w-5" />} title="Denetim Zorluğu" text="Rapor, kontrol listesi ve geçmiş hareketlerle denetime hazır operasyon standardı sağlanır." />
          <RequirementItem icon={<FileSpreadsheet className="h-5 w-5" />} title="Finansal Kopukluk" text="Tahsilat, EDM, teklif ve mali akışları operasyonla bağlayarak tek resim sunar." />
        </div>
      </section>
    </MarketingLayout>
  )
}

function PricingPage() {
  return (
    <MarketingLayout>
      <section className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900">Fiyatlandırma</h1>
        <p className="mt-3 text-slate-600">
          Asenovo fiyatlandırması; aktif asansör adedi, ekip büyüklüğü, operasyon yoğunluğu ve ihtiyaç duyulan modül
          setine göre ölçeklenir. Paketler yatay büyümeyi destekler, sistem değişimi gerektirmez.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <PriceCard name="Başlangıç" price="₺2.490 / ay" items={['1 Şube', '500 Asansör', 'Temel Bakım-Arıza', 'Temel Raporlama']} />
          <PriceCard name="Profesyonel" price="₺4.990 / ay" items={['3 Şube', '2.000 Asansör', 'QR + EDM + Tahsilat', 'Gelişmiş Raporlama']} highlighted />
          <PriceCard name="Kurumsal" price="Özel Teklif" items={['Sınırsız Şube', 'Sınırsız Asansör', 'SLA + Özel Eğitim', 'Özel Entegrasyon']} />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-900">Paketlere Dahil Hizmetler</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Canlı ortama geçiş desteği ve ilk kurulum yönlendirmesi</li>
              <li>Rol bazlı kullanıcı yapılandırma yardımı</li>
              <li>Temel operatör eğitimi ve dokümantasyon</li>
              <li>Versiyon güncellemeleri ve güvenlik yamaları</li>
            </ul>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-900">Opsiyonel Kurumsal Ekler</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Yerinde eğitim ve süreç danışmanlığı</li>
              <li>API tabanlı ERP/muhasebe entegrasyonları</li>
              <li>Özel dashboard ve yönetim raporu geliştirme</li>
              <li>Yüksek öncelikli SLA ve hesap yöneticisi</li>
            </ul>
          </article>
        </div>

        <div className="mt-6 rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900">
          Fiyatlar KDV hariç başlangıç referansıdır. Kesin teklif; asansör adedi, saha yoğunluğu, modül seçimi ve
          hedeflenen hizmet seviyesine göre proje keşfinde netleştirilir.
        </div>
      </section>
    </MarketingLayout>
  )
}

function PackagesPage() {
  const matrix = useMemo(
    () => [
      ['Bakım ve arıza yönetimi', true, true, true],
      ['QR doğrulama akışı', false, true, true],
      ['EDM fatura modül seti', false, true, true],
      ['Durum tespit raporları', true, true, true],
      ['Cari, stok, tahsilat yönetimi', false, true, true],
      ['Rol ve yetki yönetimi', false, true, true],
      ['SLA ve özel hesap yöneticisi', false, false, true],
    ],
    [],
  )

  return (
    <MarketingLayout>
      <section className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900">Paket Özellikleri</h1>
        <p className="mt-3 text-slate-600">İhtiyacınız kadarla başlayıp büyüdükçe modül ekleyebileceğiniz esnek ürün mimarisi.</p>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left">Özellik</th>
                <th className="px-4 py-3 text-center">Başlangıç</th>
                <th className="px-4 py-3 text-center">Profesyonel</th>
                <th className="px-4 py-3 text-center">Kurumsal</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map(([feature, starter, pro, corp]) => (
                <tr key={String(feature)} className="border-t border-slate-200 bg-white">
                  <td className="px-4 py-3 font-medium text-slate-700">{String(feature)}</td>
                  <td className="px-4 py-3 text-center">{starter ? 'Var' : '-'}</td>
                  <td className="px-4 py-3 text-center">{pro ? 'Var' : '-'}</td>
                  <td className="px-4 py-3 text-center">{corp ? 'Var' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <RequirementItem icon={<Users className="h-5 w-5" />} title="Yönetim ve Rol Katmanı" text="Patron, ofis personeli ve teknisyen rollerinde net yetki ayrımı ve kontrollü iş akışları." />
          <RequirementItem icon={<Wrench className="h-5 w-5" />} title="Saha Operasyon Katmanı" text="Bakım planlama, arıza takibi, tamamlanma süreci ve performans görünürlüğü." />
          <RequirementItem icon={<FileSpreadsheet className="h-5 w-5" />} title="Rapor ve Finans Katmanı" text="Durum tespit, teklif, tahsilat, EDM akışları ve karar destek KPI panelleri." />
        </div>
      </section>
    </MarketingLayout>
  )
}

function ContactPage() {
  const [formData, setFormData] = useState({
    adSoyad: '',
    firmaAdi: '',
    asansorAdedi: '',
    subeSayisi: '',
    telefon: '',
    email: '',
    mesaj: '',
  })
  const [formStatus, setFormStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    const isValid =
      formData.adSoyad.trim() &&
      formData.firmaAdi.trim() &&
      formData.asansorAdedi.trim() &&
      formData.telefon.trim() &&
      formData.email.trim() &&
      formData.mesaj.trim()

    if (!isValid) {
      setFormStatus('error')
      return
    }

    setFormStatus('success')
  }

  return (
    <MarketingLayout>
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm lg:col-span-3">
          <h1 className="text-3xl font-black text-slate-900">İletişim</h1>
          <p className="mt-3 text-slate-600">Demo, fiyatlandırma veya teknik danışmanlık için bize yazın.</p>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="Ad Soyad" value={formData.adSoyad} onChange={(value) => setFormData((prev) => ({ ...prev, adSoyad: value }))} />
              <InputField label="Firma Adı" value={formData.firmaAdi} onChange={(value) => setFormData((prev) => ({ ...prev, firmaAdi: value }))} />
              <InputField label="Asansör Adedi" value={formData.asansorAdedi} onChange={(value) => setFormData((prev) => ({ ...prev, asansorAdedi: value }))} />
              <InputField label="Şube Sayısı (opsiyonel)" value={formData.subeSayisi} onChange={(value) => setFormData((prev) => ({ ...prev, subeSayisi: value }))} />
              <InputField label="Telefon" value={formData.telefon} onChange={(value) => setFormData((prev) => ({ ...prev, telefon: value }))} />
              <InputField label="E-posta" type="email" value={formData.email} onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))} />
            </div>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Mesajınız
              <textarea
                rows={5}
                value={formData.mesaj}
                onChange={(event) => setFormData((prev) => ({ ...prev, mesaj: event.target.value }))}
                placeholder="Operasyonunuz, asansör adediniz ve ihtiyacınızı kısaca yazın"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </label>

            <button type="submit" className="rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:from-cyan-600 hover:to-indigo-700">
              Gönder
            </button>

            {formStatus === 'error' && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                Lütfen tüm alanları eksiksiz doldurun.
              </div>
            )}
            {formStatus === 'success' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                Talebiniz alındı. Ekibimiz en kısa sürede sizinle iletişime geçecektir.
              </div>
            )}
          </form>
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <ContactCard icon={<Phone className="h-5 w-5" />} title="Telefon" value="+90 (850) 000 00 00" />
          <ContactCard icon={<Mail className="h-5 w-5" />} title="E-posta" value="iletisim@asenovo.com" />
          <ContactCard icon={<MapPinned className="h-5 w-5" />} title="Adres" value="İstanbul / Türkiye" />
          <ContactCard icon={<Headset className="h-5 w-5" />} title="Canlı Destek Saatleri" value="Hafta içi 09:00 - 18:00" />

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=Merhaba%20Asenovo%2C%20demo%20ve%20fiyatlandırma%20bilgisi%20almak%20istiyorum.`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-4 text-sm font-bold text-white transition hover:from-emerald-600 hover:to-teal-700"
          >
            <MessageCircle className="h-5 w-5" /> WhatsApp ile Hemen Ulaşın
          </a>
        </aside>
      </section>
    </MarketingLayout>
  )
}

function FeatureCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 inline-flex rounded-lg bg-indigo-100 p-2 text-indigo-700">{icon}</div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </article>
  )
}

function RequirementItem({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-900">
        <span className="text-indigo-600">{icon}</span>
        <h3 className="font-bold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </article>
  )
}

function InfoCard({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 inline-flex rounded-lg bg-cyan-100 p-2 text-cyan-700">{icon}</div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </article>
  )
}

function PriceCard({
  name,
  price,
  items,
  highlighted = false,
}: {
  name: string
  price: string
  items: string[]
  highlighted?: boolean
}) {
  return (
    <article className={`rounded-xl border p-5 ${highlighted ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
      <h3 className="text-lg font-black text-slate-900">{name}</h3>
      <p className="mt-2 text-2xl font-black text-indigo-700">{price}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function ContactCard({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 font-bold text-slate-900">
        <span className="text-indigo-600">{icon}</span>
        <span>{title}</span>
      </div>
      <p className="mt-2 text-slate-600">{value}</p>
    </article>
  )
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email'
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  )
}

export function MarketingSiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/hakkimizda" element={<AboutPage />} />
      <Route path="/fiyatlandirma" element={<PricingPage />} />
      <Route path="/paketler" element={<PackagesPage />} />
      <Route path="/iletisim" element={<ContactPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
