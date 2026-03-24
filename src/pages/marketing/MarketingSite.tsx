import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  Building2,
  CalendarCheck2,
  ClipboardCheck,
  FileSpreadsheet,
  Handshake,
  Headset,
  LineChart,
  Mail,
  MapPinned,
  MessageCircle,
  Phone,
  QrCode,
  Rocket,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wrench,
  Zap,
  Menu,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MarketingFormError,
  type MarketingFieldErrors,
  type SubmitStatus,
  type TrialResultData,
  submitPublicMarketingForm,
  useDemoLaunch,
} from '@/pages/marketing/useDemoLaunch'

const WHATSAPP_NUMBER = '905300000000'
const SUPPORT_EMAIL = 'support@asenovo.com'
const SUPPORT_PHONE = '0541 370 42 64'

function MarketingLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
        <div className="absolute inset-0 flex items-center justify-center text-lg font-extrabold tracking-tight text-white">A+</div>
      </div>
      <div>
        <div className="text-lg font-black leading-none text-white">ASENOVO</div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Asansör Takip Platformu</div>
      </div>
    </div>
  )
}

function MarketingLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0b0f1a_0%,#0f1726_18%,#eef4ff_18%,#f8fbff_100%)] text-slate-800 md:bg-[radial-gradient(circle_at_top,#16233f_0%,#0b1120_16%,#eaf1ff_16%,#f8fbff_100%)]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto max-w-[1380px] px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between gap-3">
            <MarketingLogo />

            <div className="hidden items-center gap-1 text-sm font-semibold md:flex">
              <MarketingNavLink to="/">Ana Sayfa</MarketingNavLink>
              <MarketingNavLink to="/hakkimizda">Hakkımızda</MarketingNavLink>
              <MarketingNavLink to="/fiyatlandirma">Çözüm Yapısı</MarketingNavLink>
              <MarketingNavLink to="/paketler">Paket Özellikleri</MarketingNavLink>
              <MarketingNavLink to="/iletisim">İletişim</MarketingNavLink>
              <a
                href="/#demo"
                className="ml-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-bold leading-none text-slate-950 transition hover:from-emerald-300 hover:to-cyan-300"
              >
                Hemen dene
              </a>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <a
                href="/#demo"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-bold leading-none text-slate-950"
              >
                Hemen dene
              </a>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white"
                aria-label="Menüyü aç"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen ? (
            <nav className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 md:hidden">
              <MobileNavLink to="/" onNavigate={() => setMobileMenuOpen(false)}>Ana Sayfa</MobileNavLink>
              <MobileNavLink to="/hakkimizda" onNavigate={() => setMobileMenuOpen(false)}>Hakkımızda</MobileNavLink>
              <MobileNavLink to="/fiyatlandirma" onNavigate={() => setMobileMenuOpen(false)}>Çözüm Yapısı</MobileNavLink>
              <MobileNavLink to="/paketler" onNavigate={() => setMobileMenuOpen(false)}>Paket Özellikleri</MobileNavLink>
              <MobileNavLink to="/iletisim" onNavigate={() => setMobileMenuOpen(false)}>İletişim</MobileNavLink>
              <a
                href="/#demo"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1 flex min-h-11 items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950"
              >
                Demo talep et
              </a>
            </nav>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-[1380px] px-4 pb-28 pt-8 sm:px-6 sm:pb-12 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-12 xl:px-10 xl:pb-24 xl:pt-14">
        {children}
      </main>

      <footer className="mt-8 border-t border-slate-200 bg-white/80 py-6">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-2 px-4 text-sm text-slate-600 sm:px-6 lg:px-8 xl:px-10">
          <span>© {new Date().getFullYear()} Asenovo - Asansör Takip Sistemi</span>
          <span>Kurumsal saha operasyonları için tasarlandı</span>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/95 p-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md gap-3">
          <a
            href="/#demo"
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20"
          >
            Hemen dene
          </a>
          <a
            href="/iletisim"
            className="flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-white"
          >
            Demo talep et
          </a>
        </div>
      </div>
    </div>
  )
}

function MarketingNavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `whitespace-nowrap rounded-lg px-3 py-2 transition ${
          isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function MobileNavLink({
  to,
  children,
  onNavigate,
}: {
  to: string
  children: ReactNode
  onNavigate: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-11 items-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
          isActive ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function HomePage() {
  const [trialModalOpen, setTrialModalOpen] = useState(false)
  const [demoForm, setDemoForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    companySize: '',
  })
  const [demoRequestForm, setDemoRequestForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    companySize: '',
  })
  const [demoRequestStatus, setDemoRequestStatus] = useState<SubmitStatus>('idle')
  const [demoRequestFeedback, setDemoRequestFeedback] = useState('')
  const [demoFieldErrors, setDemoFieldErrors] = useState<MarketingFieldErrors>({})
  const [demoRequestFieldErrors, setDemoRequestFieldErrors] = useState<MarketingFieldErrors>({})
  const {
    createDemo,
    loading: trialLoading,
    status: trialStatus,
    feedback: trialFeedback,
    result: trialResult,
    fallbackVisible,
    reset: resetTrial,
  } = useDemoLaunch()

  const urgencyCards = [
    'Bakım planları Excel ve WhatsApp arasında kaybolur.',
    'Revizyon teklifleri geç hazırlanır, müşteri dönüşü yavaşlar.',
    'Denetim ve saha kayıtları ekip büyüdükçe takip edilemez hale gelir.',
  ]

  const trustStats = [
    { label: 'Firma kullanımı için hazır altyapı', value: 'X+' },
    { label: 'Yönetilebilir asansör hacmi', value: 'X+' },
    { label: 'Hedeflenen servis erişilebilirliği', value: '99.9%' },
  ]

  const benefitCards = [
    {
      icon: <CalendarCheck2 className="h-5 w-5" />,
      title: 'Bakımları otomatik takip et, gecikmeleri önle',
      text: 'Planlı bakım, gecikme uyarısı ve ekip atamalarını tek akıştan yönet.',
    },
    {
      icon: <ClipboardCheck className="h-5 w-5" />,
      title: 'Revizyon tekliflerini daha hızlı gönder',
      text: 'Teklif, maliyet ve revizyon maddelerini aynı operasyon bağlamında hazırla.',
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: 'Ekiplerini tek panelde organize et',
      text: 'Sahadaki teknisyen, ofis ve yönetim katmanını ortak veri ile hizala.',
    },
  ]

  async function handleTrialSubmit(event: FormEvent) {
    event.preventDefault()

    if (!demoForm.name.trim() || !demoForm.company.trim() || !demoForm.phone.trim() || !demoForm.email.trim()) {
      setDemoFieldErrors({})
      return
    }

    setDemoFieldErrors({})

    try {
      await createDemo(demoForm)
      setTrialModalOpen(false)
      document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (error) {
      setDemoFieldErrors(error instanceof MarketingFormError ? error.fieldErrors : {})
    }
  }

  async function handleDemoRequestSubmit(event: FormEvent) {
    event.preventDefault()

    if (
      !demoRequestForm.name.trim() ||
      !demoRequestForm.company.trim() ||
      !demoRequestForm.phone.trim() ||
      !demoRequestForm.email.trim()
    ) {
      setDemoRequestStatus('error')
      setDemoRequestFeedback('Lütfen zorunlu alanları doldurun.')
      setDemoRequestFieldErrors({})
      return
    }

    setDemoRequestStatus('submitting')
    setDemoRequestFeedback('')
    setDemoRequestFieldErrors({})

    try {
      const response = await submitPublicMarketingForm('/demo-request', demoRequestForm)
      setDemoRequestStatus('success')
      setDemoRequestFeedback(response?.message || 'Demo talebiniz alındı. Ekibimiz sizinle iletişime geçecektir.')
      setDemoRequestForm({
        name: '',
        company: '',
        phone: '',
        email: '',
        companySize: '',
      })
    } catch (error) {
      setDemoRequestStatus('error')
      setDemoRequestFeedback(error instanceof Error ? error.message : 'Demo talebi gönderilemedi.')
      setDemoRequestFieldErrors(error instanceof MarketingFormError ? error.fieldErrors : {})
    }
  }

  return (
    <MarketingLayout>
      <section
        id="hero"
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#08101d_0%,#0f2340_42%,#0d2030_100%)] px-4 py-6 text-white shadow-[0_30px_120px_rgba(11,15,26,0.55)] sm:px-8 sm:py-10 lg:rounded-[2.5rem] lg:px-10 lg:py-14 xl:px-14 xl:py-16"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(163,230,53,0.16),transparent_28%)]" />
        <div className="absolute inset-y-10 right-0 hidden w-[42%] bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.14),transparent_62%)] blur-3xl lg:block" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] lg:items-center lg:gap-8 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] xl:gap-12">
          <div className="min-w-0 max-w-xl lg:max-w-[34rem] xl:max-w-[38rem]">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              <Sparkles className="h-4 w-4 text-emerald-300" /> Asansör firmaları için yeni nesil SaaS
            </p>
            <h1 className="mt-5 text-[2.7rem] font-black leading-[0.98] text-white sm:text-5xl md:max-w-[14ch] md:text-[4rem] lg:max-w-[10ch] lg:text-[4.1rem] xl:text-[4.7rem]">
              Tüm operasyonunu tek panelden yönet.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-8 text-slate-300 sm:text-lg lg:max-w-2xl lg:text-[1.1rem] lg:leading-9">
              Asansör bakım, revizyon, teklif ve ekip süreçlerini tek platformda topla. Daha hızlı teklif ver, daha az
              iş kaçır, daha net yönet.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:max-w-2xl lg:gap-4">
              <MetricBadge value="7/24" label="Operasyon görünürlüğü" />
              <MetricBadge value="Tek Panel" label="Saha + ofis yönetimi" />
              <MetricBadge value="Hızlı Demo" label="Dakikalar içinde deneyim" />
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-8">
              <button
                type="button"
                onClick={() => setTrialModalOpen(true)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition duration-300 hover:translate-y-[-1px] lg:min-h-14 lg:px-7 lg:text-base"
              >
                Hemen dene <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <a
                href="/#demo"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-white/10 lg:min-h-14 lg:px-7 lg:text-base"
                >
                Demo talep et
              </a>
            </div>
          </div>

          <div className="relative min-w-0 lg:pl-2 xl:pl-4">
            <div className="absolute -left-4 top-10 hidden h-20 w-20 rounded-full bg-emerald-300/20 blur-2xl sm:block" />
            <div className="absolute right-0 top-10 hidden rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 shadow-2xl backdrop-blur 2xl:block">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Canlı KPI</div>
              <div className="mt-2 text-2xl font-black text-white">91%</div>
              <div className="text-xs text-slate-400">Tamamlanan bakım oranı</div>
            </div>
            <div className="absolute -left-6 bottom-10 hidden rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-2xl backdrop-blur 2xl:block">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Saha hızı</div>
              <div className="mt-2 text-xl font-black text-white">14 görev</div>
              <div className="text-xs text-slate-300">Bugün planlandı</div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/65 p-4 shadow-2xl shadow-slate-950/50 backdrop-blur lg:rounded-[2rem] lg:p-5 xl:p-6">
              <div className="rounded-[1.25rem] border border-white/10 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-4 lg:rounded-[1.5rem] lg:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">Asenovo Operasyon Paneli</div>
                    <div className="mt-1 text-xs text-slate-400">Bakım, teklif, denetim ve ekip performansı</div>
                  </div>
                  <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Canlı görünüm
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:gap-4">
                  <DashboardTile
                    icon={<LineChart className="h-4 w-4" />}
                    title="Geciken bakım oranı"
                    value="%4.2"
                    accent="text-emerald-300"
                  />
                  <DashboardTile
                    icon={<Zap className="h-4 w-4" />}
                    title="Açık arıza"
                    value="12"
                    accent="text-amber-300"
                  />
                  <DashboardTile
                    icon={<Shield className="h-4 w-4" />}
                    title="Denetim hazır kayıt"
                    value="846"
                    accent="text-cyan-300"
                  />
                  <DashboardTile
                    icon={<Smartphone className="h-4 w-4" />}
                    title="Mobil ekip aktif"
                    value="28"
                    accent="text-violet-300"
                  />
                </div>
                <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-slate-900/70 p-4 lg:p-5">
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr] lg:gap-4">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Bakım planı</div>
                        <div className="mt-3 space-y-2">
                          {[78, 92, 64].map((width, index) => (
                            <div key={width} className="rounded-xl bg-white/5 p-3">
                              <div className="h-2 rounded-full bg-slate-700">
                                <div
                                  className={`h-2 rounded-full ${index === 1 ? 'bg-emerald-300' : 'bg-cyan-300'}`}
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/10 to-emerald-400/10 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Bugün</div>
                        <div className="mt-4 text-3xl font-black text-white">14</div>
                        <div className="mt-1 text-sm text-slate-300">Tamamlanacak iş</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Servis ekipleri</div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {['Avrupa Yakası', 'Anadolu Yakası', 'Denetim Ekibi'].map((team) => (
                          <div key={team} className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-4 text-sm font-medium text-slate-200">
                            {team}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-8 grid gap-4 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] xl:grid-cols-3 xl:gap-5">
          <VisualShowcaseCard
            title="Bakım ekibi"
            text="Sahadaki ekipler tek operasyonda birleşir."
            tone="emerald"
            variant="team"
            icon={<Wrench className="h-5 w-5" />}
          />
          <VisualShowcaseCard
            title="Bina portföyü"
            text="Bina, asansör ve müşteri ilişkisi görünür kalır."
            tone="cyan"
            variant="portfolio"
            icon={<Building2 className="h-5 w-5" />}
          />
          <VisualShowcaseCard
            title="Yönetim görünümü"
            text="Teklif, bakım ve gelir aynı resimde görünür."
            tone="violet"
            variant="management"
            icon={<BarChart3 className="h-5 w-5" />}
          />
        </div>
      </section>

      <section
        id="problems"
        className="mt-6 rounded-[2rem] border border-slate-200 bg-white px-5 py-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:px-8 md:mt-20 md:py-8 xl:mt-24 xl:px-10 xl:py-10"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-500">Why now?</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Hâlâ Excel ile mi yönetiyorsun?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Kağıt süreçler, WhatsApp mesajları ve dağınık dosyalar büyüyen firmalarda doğrudan hız ve kârlılık kaybına
              dönüşür.
            </p>
          </div>
          <a
            href="/#demo"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            Demo talep et
          </a>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {urgencyCards.map((item) => (
            <article key={item} className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-rose-100 p-2 text-rose-600">
                  <Zap className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium leading-6 text-slate-700">{item}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="solution"
        className="mt-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#09101c_0%,#10192e_100%)] px-5 py-7 text-white shadow-[0_24px_80px_rgba(2,6,23,0.4)] sm:px-8 md:mt-20 md:py-10 xl:mt-24 xl:px-10 xl:py-12"
      >
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">Asenovo çözümü</p>
            <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Asenovo ile hepsini tek platformdan yönet.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              Sahadaki teknik ekipten yönetim raporlarına kadar aynı veriyi kullanan daha hızlı, daha güvenilir ve daha
              profesyonel bir operasyon yapısı kur.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="/#demo"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-bold text-slate-950"
              >
                Hemen dene
              </a>
              <a
                href="/paketler"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white"
              >
                Paket yapısını incele
              </a>
            </div>
          </div>
          <div className="grid gap-4 md:[grid-template-columns:repeat(auto-fit,minmax(230px,1fr))] xl:grid-cols-3">
            {benefitCards.map((item) => (
              <FeatureCard key={item.title} icon={item.icon} title={item.title} text={item.text} dark />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white px-5 py-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:px-8 md:mt-20 md:py-8 xl:mt-24 xl:px-10 xl:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-600">Güven ve görünürlük</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Sahada ciddi duran ürün, satışta daha hızlı ilerler.</h2>
          </div>
          <a href="/#demo" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Hemen dene
          </a>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3 xl:gap-5">
          {trustStats.map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-3xl font-black text-slate-950">{item.value}</div>
              <div className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.label}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-cyan-100 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-7 md:mt-20 xl:mt-24 xl:p-10">
        <h2 className="text-2xl font-black text-slate-900">Platformun Temel Gereklilikleri</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Operasyon büyüdüğünde en çok ihtiyaç duyulan şey daha fazla araç değil; birlikte çalışan doğru sistemdir.
        </p>
        <div className="mt-6 grid gap-4 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] xl:gap-5">
          <RequirementItem icon={<CalendarCheck2 className="h-5 w-5" />} title="Bakımı gecikmeden takip et" text="Plan, personel atama ve tamamlanma sürecini tek zaman çizelgesinde yönet." />
          <RequirementItem icon={<ClipboardCheck className="h-5 w-5" />} title="Denetim hazırlığını son güne bırakma" text="Kontrol listeleri, raporlar ve revizyon kayıtlarıyla denetime hazır kal." />
          <RequirementItem icon={<FileSpreadsheet className="h-5 w-5" />} title="Finansı operasyonla aynı yerde gör" text="Tahsilat, teklif ve mali akışlar bakım operasyonundan kopmasın." />
          <RequirementItem icon={<Users className="h-5 w-5" />} title="Herkes aynı veride çalışsın" text="Patron, ofis personeli ve teknisyen farklı ekran değil, aynı doğrulukta veri kullansın." />
          <RequirementItem icon={<BellRing className="h-5 w-5" />} title="Kritik işleri sistem hatırlatsın" text="Yaklaşan bakım, açık arıza ve geciken iş emirleri görünür olsun." />
          <RequirementItem icon={<ShieldCheck className="h-5 w-5" />} title="Veriyi tenant bazında güvenle ayır" text="Multi-tenant mimari ile her firma kendi alanında izole kalsın." />
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-6 shadow-[0_20px_50px_rgba(16,185,129,0.08)] sm:p-7 md:mt-20 xl:mt-24 xl:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Fayda odaklı yapı</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Ekip büyüdükçe sistem seni yavaşlatmasın.</h2>
          </div>
          <a href="/#demo" className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
            Demo talep et
          </a>
        </div>
        <div className="mt-6 grid gap-4 md:[grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] xl:gap-5">
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

      <section className="mt-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#0b0f1a_0%,#111f37_100%)] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-7 md:mt-20 xl:mt-24 xl:p-10">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Dashboard showcase</p>
            <h2 className="mt-2 text-3xl font-black text-white">Bu iş ciddi bir ürünle yönetilmeli.</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              Dashboard, ekip, asansör ve bakım ekranları aynı ürün diliyle ilerler. İlk bakışta güven veren bir ürün,
              satışta da içerideki kullanımda da fark yaratır.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoCard title="Modern görünüm" text="Müşteriye ve ekibe güven veren temiz panel deneyimi." icon={<LayoutIcon />} dark />
              <InfoCard title="Operasyon derinliği" text="Teklif, bakım ve denetim süreçlerini aynı yapıda toplar." icon={<BarChart3 className="h-5 w-5" />} dark />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:gap-5">
            <DashboardPreviewCard title="Asansör listesi" tone="cyan" variant="elevators" />
            <DashboardPreviewCard title="Bakım planlama" tone="emerald" variant="planning" />
            <div className="sm:col-span-2">
              <DashboardPreviewCard title="Yönetim görünümü" tone="violet" variant="management" wide />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:mt-20 md:[grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] xl:mt-24 xl:grid-cols-3 xl:gap-5">
        <VisualStoryCard
          title="Saha görünürlüğü"
          text="Teknisyenin yaptığı iş, yönetime aynı gün görünür hale gelir."
          tag="Mobil ekip"
          tone="emerald"
          scene="mobile"
        />
        <VisualStoryCard
          title="Revizyon akışı"
          text="Standart maddelerle teklif süreci daha hızlı ve daha kontrollü ilerler."
          tag="Teklif"
          tone="cyan"
          scene="quote"
        />
        <VisualStoryCard
          title="Kurumsal izlenebilirlik"
          text="Büyüyen portföylerde operasyonu kaybetmeden yönetebilmek için tasarlandı."
          tag="Yönetim"
          tone="violet"
          scene="management"
        />
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-7 md:mt-20 xl:mt-24 xl:p-10">
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

      <section id="demo" className="mt-6 grid gap-6 md:mt-20 lg:grid-cols-[minmax(0,1.03fr)_minmax(0,0.97fr)] xl:mt-24 xl:gap-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-600">Hemen dene</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">Demo ortamını dakikalar içinde aç.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Çalışan auto-demo servisini kullanarak örnek verili tenant hazırlayın. Hazır olunca giriş linkiniz ve erişim
            bilgileriniz bu ekranda gösterilir.
          </p>

          {trialStatus === 'success' && trialResult?.status === 'READY' ? (
            <TrialReadyPanel feedback={trialFeedback} result={trialResult} onReset={() => resetTrial()} />
          ) : (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 xl:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-950">Canlı demo akışı</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {trialLoading ? 'Demo ortamın hazırlanıyor...' : 'Tek tıkla tenant aç, hazır olunca giriş yap.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTrialModalOpen(true)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {trialLoading ? 'Hazırlanıyor...' : 'Hemen dene'}
                </button>
              </div>

              <div className="mt-4">
                <FormFeedback status={trialStatus} message={trialFeedback} successMessage="Demo ortamınız hazır." />
              </div>

              {trialResult ? (
                <div className="mt-4">
                  <TrialResultCard
                    existingDemo={trialResult.existingDemo}
                    accessEmailSent={trialResult.accessEmailSent}
                    loginUrl={trialResult.loginUrl}
                    tenantSlug={trialResult.tenantSlug}
                    tenantDatabase={trialResult.tenantDatabase}
                    expiresAt={trialResult.expiresAt}
                    status={trialResult.status}
                    username={trialResult.username}
                    temporaryPassword={trialResult.temporaryPassword}
                    showTemporaryPassword={trialResult.showTemporaryPassword}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-600">Demo talep et</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">İstersen önce birlikte planlayalım.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Anlık demo uygun değilse klasik demo talebi bırak. Ekip seninle iletişime geçsin ve doğru senaryoyu birlikte
            kuralım.
          </p>

          <form className="mt-6 grid gap-4" onSubmit={handleDemoRequestSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <MarketingInput
                label="Ad Soyad"
                value={demoRequestForm.name}
                error={demoRequestFieldErrors.name}
                onChange={(value) => setDemoRequestForm((prev) => ({ ...prev, name: value }))}
              />
              <MarketingInput
                label="Firma"
                value={demoRequestForm.company}
                error={demoRequestFieldErrors.company}
                onChange={(value) => setDemoRequestForm((prev) => ({ ...prev, company: value }))}
              />
              <MarketingInput
                label="Telefon"
                value={demoRequestForm.phone}
                error={demoRequestFieldErrors.phone}
                onChange={(value) => setDemoRequestForm((prev) => ({ ...prev, phone: value }))}
              />
              <MarketingInput
                label="E-posta"
                type="email"
                value={demoRequestForm.email}
                error={demoRequestFieldErrors.email}
                onChange={(value) => setDemoRequestForm((prev) => ({ ...prev, email: value }))}
              />
            </div>

            <MarketingInput
              label="Firma Büyüklüğü"
              value={demoRequestForm.companySize}
              error={demoRequestFieldErrors.companySize}
              placeholder="Örn: 10 kişi, 250 asansör"
              onChange={(value) => setDemoRequestForm((prev) => ({ ...prev, companySize: value }))}
            />

            <button
              type="submit"
              disabled={demoRequestStatus === 'submitting'}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {demoRequestStatus === 'submitting' ? 'Gönderiliyor...' : 'Demo talep et'}
            </button>

            <FormFeedback
              status={demoRequestStatus}
              message={demoRequestFeedback}
              successMessage="Demo talebiniz alındı. Ekibimiz sizinle iletişime geçecektir."
            />

            {fallbackVisible && trialStatus === 'error' ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Otomatik demo açılamadı. Aşağıdaki formu bırakın, ekibimiz sizinle iletişime geçsin.
              </div>
            ) : null}
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#0b0f1a_0%,#16213c_100%)] p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-8 md:mt-20 xl:mt-24 xl:p-12">
        <div className="mx-auto max-w-4xl text-left md:text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">Son çağrı</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl xl:text-5xl">Asansör işini büyütmek isteyenler için tek panel.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base xl:text-lg xl:leading-8">
            Süreçleri toparlamak için yeni araç ekleme. Tek bir sistemle tekliften bakıma kadar tüm akışı görünür hale getir.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row md:justify-center">
            <a
              href="/#demo"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 lg:min-h-14 lg:px-7 lg:text-base"
            >
              Hemen dene
            </a>
              <a
                href="/iletisim"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white lg:min-h-14 lg:px-7 lg:text-base"
              >
                Detaylı bilgi al
              </a>
          </div>
        </div>
      </section>

      <TrialRequestDialog
        open={trialModalOpen}
        onOpenChange={setTrialModalOpen}
        form={demoForm}
        onChange={setDemoForm}
        onSubmit={handleTrialSubmit}
        status={trialStatus}
        feedback={trialFeedback}
        fieldErrors={demoFieldErrors}
      />
    </MarketingLayout>
  )
}

function AboutPage() {
  return (
    <MarketingLayout>
      <section className="overflow-x-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#0b0f1a_0%,#12233f_48%,#0d2030_100%)] px-4 py-6 text-white shadow-[0_28px_90px_rgba(2,6,23,0.4)] sm:px-6 sm:py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Hakkımızda</p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              Asansör operasyonunu büyürken kontrol altında tutmak için kuruldu.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Asenovo, asansör servis firmalarının bakım, denetim, teklif ve saha ekip süreçlerini dağınık araçlardan
              çıkarıp tek operasyon sisteminde toplamayı hedefler. Ekibimiz; saha operasyonu, yazılım mühendisliği ve
              süreç iyileştirme disiplinlerini tek çatı altında birleştirir.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MetricBadge value="Tek Panel" label="Saha + ofis görünürlüğü" />
              <MetricBadge value="Tenant" label="Firma bazlı veri izolasyonu" />
              <MetricBadge value="Hızlı Demo" label="Dakikalar içinde deneyim" />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="/#demo"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-bold text-slate-950"
              >
                Hemen dene
              </a>
              <a
                href="/iletisim"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white"
              >
                Ekiple görüş
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:gap-5">
            <article className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Neden şimdi?</div>
              <div className="mt-3 text-xl font-black text-white">Parçalı sistemler büyüyen firmayı yavaşlatır.</div>
              <div className="mt-3 text-sm leading-6 text-slate-300">
                Excel, WhatsApp ve dağınık kayıtlar; teklif hızını, denetim hazırlığını ve ekip koordinasyonunu doğrudan
                etkiler.
              </div>
            </article>
            <article className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Asenovo yaklaşımı</div>
              <div className="mt-3 text-xl font-black text-white">Operasyonu görünür ve ölçülebilir hale getirmek.</div>
              <div className="mt-3 text-sm leading-6 text-slate-300">
                Firma büyüdükçe daha fazla araç değil, birbirine bağlı çalışan daha güçlü bir sistem gerekir.
              </div>
            </article>
            <div className="sm:col-span-2">
              <VisualStoryCard
                title="Yönetilebilir saha yapısı"
                text="Kayıt, ekip, denetim ve finans akışı tek ürün diliyle ilerlediğinde yönetim tarafı daha hızlı karar alır."
                tag="Operasyon modeli"
                tone="cyan"
                scene="management"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <InfoCard title="Neden Varız" text="Parçalı sistemler nedeniyle kaybolan operasyonel veriyi birleştirip firmaların verimli büyümesini sağlamak için." icon={<Handshake className="h-5 w-5" />} />
        <InfoCard title="Ne Amaçlıyoruz" text="Bakım, arıza ve revizyon süreçlerinde ölçülebilir bir dijital operasyon standardı oluşturmak için." icon={<MapPinned className="h-5 w-5" />} />
        <InfoCard title="Nasıl Çalışıyoruz" text="Müşteri geri bildirimi, saha gerçeği ve veri odaklı ürün geliştirme modeliyle sürekli iyileştirme." icon={<Headset className="h-5 w-5" />} />
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

      <section className="mt-6 rounded-[2rem] border border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-6 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Birlikte büyüyen yapı</p>
            <h2 className="mt-2 text-[1.75rem] font-black leading-tight text-slate-900 sm:text-[2rem]">
              Sadece bugünü değil, operasyonun bir sonraki seviyesini de hedefliyoruz.
            </h2>
          </div>
          <a href="/#demo" className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
            Demo al
          </a>
        </div>
      </section>
    </MarketingLayout>
  )
}

function PricingPage() {
  return (
    <MarketingLayout>
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#0b0f1a_0%,#12233f_48%,#0d2030_100%)] p-6 text-white shadow-[0_28px_90px_rgba(2,6,23,0.4)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Çözüm Yapısı</p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Operasyon hacmine göre şekillenen paket yapısı.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Asenovo tek tip, herkese aynı kurulum mantığıyla ilerlemez. Mevcut asansör portföyünüz, ekip sayınız,
              bakım yoğunluğunuz, teklif-finans akışlarınız ve şube yapınıza göre doğru modül kombinasyonu belirlenir.
              Bu yüzden fiyat listesi yerine önce ihtiyaç resmi çıkarılır, ardından uygun kurulum senaryosu paylaşılır.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MetricBadge value="Keşif Odaklı" label="Önce operasyon ihtiyacı netleşir" />
              <MetricBadge value="Modüler" label="Büyüdükçe yeni katman eklenir" />
              <MetricBadge value="Kurumsal" label="Entegrasyon ve eğitimle derinleşir" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Keşif görüşmesi</div>
              <div className="mt-3 text-xl font-black text-white">Detaylı bilgi için ekiple kısa bir ihtiyaç görüşmesi yapılır.</div>
              <div className="mt-3 text-sm leading-6 text-slate-300">
                Mevcut süreç, asansör sayısı, ekip dağılımı ve beklenen görünürlük seviyesi netleştirilerek en doğru
                kurulum paketi belirlenir.
              </div>
            </article>
            <article className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Kurulum planı</div>
              <div className="mt-3 text-xl font-black text-white">Demo, canlı geçiş ve eğitim birlikte planlanır.</div>
              <div className="mt-3 text-sm leading-6 text-slate-300">
                Sadece modül vermekle kalmayız; veri geçişi, kullanıcı rolleri, eğitim ve ilk operasyon haftaları için
                uygulanabilir bir plan çıkarırız.
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Paket Kademeleri</h2>
            <p className="mt-3 text-slate-600">
              Başlangıç aşamasından çok şubeli kurumsal yapılara kadar aynı çekirdek yapı üzerinde genişleyen kurulum.
            </p>
          </div>
          <a href="/iletisim" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Detaylı bilgi için iletişime geç
          </a>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <PackageCard
            name="Başlangıç"
            summary="Dijital takibi ilk kez kuran ve bakım-arıza disiplinini tek ekrana taşımak isteyen firmalar için."
            items={[
              'Tek şube veya sınırlı operasyon yapısında hızlı başlangıç',
              'Bakım planlama, arıza yönetimi ve temel raporlama akışları',
              'Saha ve ofis için temel kullanıcı rolleri',
              'Operasyon kayıtlarını Excel dağınıklığından çıkaran çekirdek yapı',
            ]}
          />
          <PackageCard
            name="Profesyonel"
            summary="Teklif, cari ve saha süreçlerini birlikte yöneten; daha görünür ve ölçülebilir operasyon isteyen ekipler için."
            highlighted
            items={[
              'QR doğrulama, durum tespit, revizyon teklifleri ve EDM akışları',
              'Cari, stok, tahsilat ve operasyon bağlantısını güçlendiren modüller',
              'Büyüyen ekiplerde rol, takip ve iş dağılımı görünürlüğü',
              'Şubeleşmeye başlayan firmalar için daha kontrollü süreç standardı',
            ]}
          />
          <PackageCard
            name="Kurumsal"
            summary="Çok şubeli, entegrasyon ihtiyacı yüksek, yönetim raporlaması ve SLA beklentisi olan yapılar için."
            items={[
              'Kurumsal yetki modeli, ileri yönetim görünürlüğü ve özel dashboard ihtiyaçları',
              'ERP, muhasebe veya iç sistemlerle entegrasyon planlaması',
              'Yüksek hacimli operasyonlarda süreç danışmanlığı ve eğitim kurgusu',
              'Hesap yöneticisi, öncelikli destek ve özel canlıya geçiş planı',
            ]}
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-900">Kurulumda Ele Aldığımız Başlıklar</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Mevcut bakım, arıza, teklif ve finans akışlarının kısa ihtiyaç analizi</li>
              <li>Rol bazlı kullanıcı ve ekip yapısının kurgulanması</li>
              <li>Canlı geçiş, ilk veri yükleme ve kullanım başlangıcı planı</li>
              <li>Temel kullanıcı eğitimi, operasyon alışkanlığı ve dokümantasyon desteği</li>
            </ul>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-900">Detaylı Görüşmede Netleşen Ek Başlıklar</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Yerinde eğitim ve süreç danışmanlığı</li>
              <li>API tabanlı ERP/muhasebe entegrasyonları</li>
              <li>Özel dashboard ve yönetim raporu geliştirme</li>
              <li>Yüksek öncelikli SLA ve hesap yöneticisi</li>
            </ul>
          </article>
        </div>

        <div className="mt-6 rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900">
          Net kurulum çerçevesi ve uygun paket seviyesi için ekibimizle görüşün. Size uygun modül seti, canlıya geçiş
          planı ve ihtiyaç kapsamı bu görüşmede netleştirilir.
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <InfoCard title="Başlangıç için doğru" text="İlk dijital dönüşüm adımını kontrollü şekilde atmak isteyen firmalar için." icon={<Rocket className="h-5 w-5" />} />
        <InfoCard title="En dengeli seçim" text="Operasyon, finans ve ekip yönetimini aynı ekranda görmek isteyen büyüyen firmalar için." icon={<BarChart3 className="h-5 w-5" />} />
        <InfoCard title="Kurumsal yapı" text="Çok şubeli, entegrasyon ihtiyacı yüksek ve SLA beklentisi olan ekipler için." icon={<ShieldCheck className="h-5 w-5" />} />
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
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#0b0f1a_0%,#12233f_48%,#0d2030_100%)] p-6 text-white shadow-[0_28px_90px_rgba(2,6,23,0.4)] sm:p-8 xl:p-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center xl:gap-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Paket Özellikleri</p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl xl:text-6xl">İhtiyacın kadarla başla, büyüdükçe modül ekle.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base xl:text-lg xl:leading-8">
              Ürün mimarisi, küçük ekipten çok şubeli yapıya kadar aynı çekirdek akışı korur. Fark yaratan nokta;
              ihtiyaç arttıkça sisteme yeni katmanlar ekleyebilmenizdir.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MetricBadge value="Tek Çekirdek" label="Aynı ürün üstünde büyür" />
              <MetricBadge value="3 Katman" label="Yönetim, saha, rapor" />
              <MetricBadge value="Modüler" label="İhtiyaca göre derinleşir" />
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="/iletisim"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 lg:min-h-14 lg:px-7 lg:text-base"
              >
                Detaylı bilgi al
              </a>
              <a
                href="/iletisim"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white lg:min-h-14 lg:px-7 lg:text-base"
              >
                Ekiple görüş
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            <DashboardPreviewCard title="Asenovo ürün katmanları" tone="violet" variant="management" wide />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              <PackageCapabilityCard
                title="Yönetim"
                text="Rol yönetimi, KPI görünürlüğü ve karar ekranları ile ofis ve yönetim katmanını merkezde toplar."
                points={['Rol ve yetki kurgusu', 'Yönetim özeti', 'Tahsilat görünürlüğü']}
                tone="violet"
                icon={<ShieldCheck className="h-5 w-5" />}
              />
              <PackageCapabilityCard
                title="Saha"
                text="Bakım, arıza ve ekip planlamasını günlük operasyon akışına bağlayarak saha verisini canlı tutar."
                points={['Bakım planlama', 'Mobil ekip akışı', 'Görev yükü görünürlüğü']}
                tone="emerald"
                icon={<Wrench className="h-5 w-5" />}
              />
              <PackageCapabilityCard
                title="Rapor"
                text="Teklif, revizyon, tahsilat ve denetim bilgisini aynı çerçevede toplayarak rapor katmanını güçlendirir."
                points={['Revizyon teklifleri', 'Durum tespit', 'Finansal özetler']}
                tone="cyan"
                icon={<FileSpreadsheet className="h-5 w-5" />}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Modül Karşılaştırması</h2>
            <p className="mt-3 text-slate-600">Aynı çekirdek yapı üzerinde hangi iş kabiliyetlerinin hangi pakette açıldığını görün.</p>
          </div>
          <a href="/#demo" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Demo al
          </a>
        </div>

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

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Paketler Nasıl Ayrışıyor?</h2>
            <p className="mt-3 text-slate-600">
              Aynı ürünün farklı sürümleri değil; aynı çekirdek üstünde derinleşen operasyon kabiliyetleri.
            </p>
          </div>
          <a href="/iletisim" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Uygun yapıyı birlikte belirleyelim
          </a>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Başlangıç paketi neyi çözer?"
            text="Bakım kaydı, arıza takibi ve günlük operasyon görünürlüğünü tek sistemde toplar. İlk dijital disiplin ihtiyacı olan ekipler için doğru zemini kurar."
            icon={<Rocket className="h-5 w-5" />}
          />
          <InfoCard
            title="Profesyonel paket ne ekler?"
            text="Teklif, tahsilat, QR ve durum tespit gibi süreçleri operasyona bağlayarak işin hem sahasını hem gelir tarafını birlikte görünür hale getirir."
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <InfoCard
            title="Kurumsal paket ne zaman gerekir?"
            text="Birden fazla şube, yüksek kullanıcı sayısı, entegrasyon gereksinimi ve daha sıkı yönetim raporlaması ihtiyacı oluştuğunda devreye girer."
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-6 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Kullanım senaryosu</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Küçük ekipte hız, büyük ekipte kontrol.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Asenovo, ilk bakım kaydından çok şubeli operasyon yönetimine kadar aynı temel deneyim üstünde büyür.
            </p>
          </div>
          <a href="/iletisim" className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
            Kurulumu başlat
          </a>
        </div>
      </section>
    </MarketingLayout>
  )
}

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    message: '',
    elevatorCount: '',
    branchCount: '',
  })
  const [fieldErrors, setFieldErrors] = useState<MarketingFieldErrors>({})
  const [formStatus, setFormStatus] = useState<SubmitStatus>('idle')
  const [formFeedback, setFormFeedback] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (
      !formData.name.trim() ||
      !formData.company.trim() ||
      !formData.phone.trim() ||
      !formData.email.trim() ||
      !formData.message.trim()
    ) {
      setFormStatus('error')
      setFormFeedback('Lütfen tüm zorunlu alanları doldurun.')
      setFieldErrors({})
      return
    }

    setFormStatus('submitting')
    setFormFeedback('')
    setFieldErrors({})

    const composedMessage = [
      formData.message.trim(),
      formData.elevatorCount.trim() ? `Asansör adedi: ${formData.elevatorCount.trim()}` : '',
      formData.branchCount.trim() ? `Şube sayısı: ${formData.branchCount.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const response = await submitPublicMarketingForm('/contact', {
        name: formData.name,
        company: formData.company,
        phone: formData.phone,
        email: formData.email,
        message: composedMessage,
      })

      setFormStatus('success')
      setFormFeedback(response?.message || 'Ekibimiz en kısa sürede sizinle iletişime geçecektir.')
      setFormData({
        name: '',
        company: '',
        phone: '',
        email: '',
        message: '',
        elevatorCount: '',
        branchCount: '',
      })
    } catch (error) {
      setFormStatus('error')
      setFormFeedback(error instanceof Error ? error.message : 'İletişim formu gönderilemedi.')
      setFieldErrors(error instanceof MarketingFormError ? error.fieldErrors : {})
    }
  }

  return (
    <MarketingLayout>
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm lg:col-span-3">
          <h1 className="text-3xl font-black text-slate-900">İletişim</h1>
          <p className="mt-3 text-slate-600">Demo, paket yapısı veya teknik danışmanlık için bize yazın.</p>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <MarketingInput label="Ad Soyad" value={formData.name} error={fieldErrors.name} onChange={(value) => setFormData((prev) => ({ ...prev, name: value }))} />
              <MarketingInput label="Firma Adı" value={formData.company} error={fieldErrors.company} onChange={(value) => setFormData((prev) => ({ ...prev, company: value }))} />
              <MarketingInput label="Asansör Adedi" value={formData.elevatorCount} onChange={(value) => setFormData((prev) => ({ ...prev, elevatorCount: value }))} />
              <MarketingInput label="Şube Sayısı (opsiyonel)" value={formData.branchCount} onChange={(value) => setFormData((prev) => ({ ...prev, branchCount: value }))} />
              <MarketingInput label="Telefon" value={formData.phone} error={fieldErrors.phone} onChange={(value) => setFormData((prev) => ({ ...prev, phone: value }))} />
              <MarketingInput label="E-posta" type="email" value={formData.email} error={fieldErrors.email} onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))} />
            </div>

            <MarketingTextarea
              label="Mesajınız"
              value={formData.message}
              error={fieldErrors.message}
              onChange={(value) => setFormData((prev) => ({ ...prev, message: value }))}
              placeholder="Operasyonunuz, asansör adediniz ve ihtiyacınızı kısaca yazın"
            />

            <button
              type="submit"
              disabled={formStatus === 'submitting'}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:from-cyan-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {formStatus === 'submitting' ? 'Gönderiliyor...' : 'Gönder'}
            </button>

            <FormFeedback
              status={formStatus}
              message={formFeedback}
              successMessage="Talebiniz alındı. Ekibimiz en kısa sürede sizinle iletişime geçecektir."
            />
          </form>
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <ContactCard icon={<Phone className="h-5 w-5" />} title="Telefon" value={SUPPORT_PHONE} />
          <ContactCard icon={<Mail className="h-5 w-5" />} title="E-posta" value={SUPPORT_EMAIL} />
          <ContactCard icon={<MapPinned className="h-5 w-5" />} title="Adres" value="İstanbul / Türkiye" />
          <ContactCard icon={<Headset className="h-5 w-5" />} title="Canlı Destek Saatleri" value="Hafta içi 09:00 - 18:00" />

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=Merhaba%20Asenovo%2C%20demo%20ve%20paket%20detaylari%20hakkinda%20bilgi%20almak%20istiyorum.`}
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

function FeatureCard({
  icon,
  title,
  text,
  dark = false,
}: {
  icon: ReactNode
  title: string
  text: string
  dark?: boolean
}) {
  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition duration-300 md:hover:-translate-y-1.5 md:hover:shadow-[0_22px_55px_rgba(15,23,42,0.16)] ${
        dark
          ? 'border-white/10 bg-white/5 shadow-black/10'
          : 'border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]'
      }`}
    >
      <div className={`mb-3 inline-flex rounded-lg p-2 ${dark ? 'bg-white/10 text-emerald-300' : 'bg-indigo-100 text-indigo-700'}`}>{icon}</div>
      <h3 className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
      <p className={`mt-2 text-sm leading-6 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{text}</p>
    </article>
  )
}

function RequirementItem({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition duration-300 md:hover:-translate-y-1 md:hover:shadow-[0_18px_45px_rgba(15,23,42,0.1)]">
      <div className="flex items-center gap-2 text-slate-900">
        <span className="text-indigo-600">{icon}</span>
        <h3 className="font-bold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </article>
  )
}

function InfoCard({
  title,
  text,
  icon,
  dark = false,
}: {
  title: string
  text: string
  icon: ReactNode
  dark?: boolean
}) {
  return (
    <article className={`rounded-xl border p-5 shadow-sm transition duration-300 md:hover:-translate-y-1 md:hover:shadow-[0_18px_45px_rgba(15,23,42,0.14)] ${dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
      <div className={`mb-3 inline-flex rounded-lg p-2 ${dark ? 'bg-white/10 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>{icon}</div>
      <h3 className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
      <p className={`mt-2 text-sm leading-6 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{text}</p>
    </article>
  )
}

function PackageCard({
  name,
  summary,
  items,
  highlighted = false,
}: {
  name: string
  summary: string
  items: string[]
  highlighted?: boolean
}) {
  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition duration-300 md:hover:-translate-y-1.5 md:hover:shadow-[0_20px_50px_rgba(15,23,42,0.14)] ${highlighted ? 'border-emerald-300 bg-emerald-50 shadow-emerald-100/60' : 'border-slate-200 bg-white'}`}
    >
      <h3 className="text-lg font-black text-slate-900">{name}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{summary}</p>
      {highlighted ? (
        <div className="mt-3 inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
          En dengeli yapı
        </div>
      ) : null}
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function PackageCapabilityCard({
  title,
  text,
  points,
  tone,
  icon,
}: {
  title: string
  text: string
  points: string[]
  tone: 'emerald' | 'cyan' | 'violet'
  icon: ReactNode
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-200 bg-[linear-gradient(180deg,#f3fff8_0%,#ffffff_100%)]'
      : tone === 'violet'
        ? 'border-violet-200 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)]'
        : 'border-cyan-200 bg-[linear-gradient(180deg,#f2fcff_0%,#ffffff_100%)]'

  const iconClass =
    tone === 'emerald'
      ? 'bg-emerald-100 text-emerald-700'
      : tone === 'violet'
        ? 'bg-violet-100 text-violet-700'
        : 'bg-cyan-100 text-cyan-700'

  return (
    <article className={`w-full max-w-full rounded-[1.6rem] border p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition duration-300 md:hover:-translate-y-1.5 md:hover:shadow-[0_24px_55px_rgba(15,23,42,0.14)] ${toneClass}`}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex rounded-2xl p-3 ${iconClass}`}>{icon}</span>
        <div className="text-lg font-black text-slate-950">{title}</div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{text}</p>
      <ul className="mt-4 space-y-2">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <a
        href="/iletisim"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Detaylı bilgi al
      </a>
    </article>
  )
}

function ContactCard({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 font-bold text-slate-900">
        <span className="text-indigo-600">{icon}</span>
        <span>{title}</span>
      </div>
      <p className="mt-2 text-slate-600">{value}</p>
    </article>
  )
}

function MetricBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm lg:px-5 lg:py-4">
      <div className="text-xl font-black text-white lg:text-[1.65rem]">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">{label}</div>
    </div>
  )
}

function DashboardTile({
  icon,
  title,
  value,
  accent,
}: {
  icon: ReactNode
  title: string
  value: string
  accent: string
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className={`inline-flex rounded-lg bg-white/10 p-2 ${accent}`}>{icon}</div>
      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <div className={`mt-2 text-2xl font-black ${accent}`}>{value}</div>
    </article>
  )
}

function DashboardPreviewCard({
  title,
  tone,
  variant,
  wide = false,
}: {
  title: string
  tone: 'cyan' | 'emerald' | 'violet'
  variant: 'elevators' | 'planning' | 'management'
  wide?: boolean
}) {
  const toneClass =
    tone === 'emerald'
      ? 'from-emerald-400/18 to-emerald-200/5'
      : tone === 'violet'
        ? 'from-violet-400/18 to-cyan-200/5'
        : 'from-cyan-400/18 to-blue-200/5'

  return (
    <article className={`overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-950/55 transition duration-300 md:hover:-translate-y-1 md:hover:shadow-[0_20px_55px_rgba(2,6,23,0.35)] ${wide ? '' : ''}`}>
      <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-slate-200">{title}</div>
      <div className={`bg-gradient-to-br ${toneClass} ${wide ? 'h-52 sm:h-64' : 'h-44 sm:h-52'} p-4`}>
        {variant === 'elevators' ? (
          <div className="grid h-full gap-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Levent A', '6 aktif'],
                ['Rezidans B', '4 bakım'],
                ['Sanayi', '8 kayıt'],
              ].map(([name, value]) => (
                <div key={name} className="rounded-xl border border-white/10 bg-white/10 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">{name}</div>
                  <div className="mt-3 text-sm font-bold text-white">{value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="flex items-center justify-between text-xs text-white/55">
                <span>Asansör no</span>
                <span>Durum</span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ['ELEV-002', 'Bakım bekliyor'],
                  ['ELEV-014', 'Aktif sözleşme'],
                  ['ELEV-021', 'Kontrol tarihi yakın'],
                ].map(([id, state]) => (
                  <div key={id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                    <div className="text-xs font-semibold text-white">{id}</div>
                    <div className="text-[11px] text-cyan-100">{state}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {variant === 'planning' ? (
          <div className="grid h-full gap-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Pzt', '14 iş'],
                ['Sal', '11 iş'],
                ['Çrş', '9 iş'],
              ].map(([day, value]) => (
                <div key={day} className="rounded-xl border border-white/10 bg-white/10 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">{day}</div>
                  <div className="mt-3 text-sm font-bold text-white">{value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="space-y-3">
                {[
                  ['Bakım planı', 78],
                  ['Denetim hazırlığı', 64],
                  ['Revizyon kontrolü', 52],
                ].map(([label, width]) => (
                  <div key={label}>
                    <div className="mb-2 text-xs font-medium text-white/70">{label}</div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-emerald-300/80" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {variant === 'management' ? (
          <div className="grid h-full gap-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['₺184K', 'Teklif'],
                ['91%', 'Tamam'],
                ['32', 'Açık iş'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/10 p-3">
                  <div className="text-base font-black text-white">{value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/55">{label}</div>
                </div>
              ))}
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_0.9fr] gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="flex h-full items-end gap-2">
                  {[34, 61, 48, 73, 58].map((height, index) => (
                    <div key={height} className="flex flex-1 flex-col items-center gap-2">
                      <div
                        className={`w-full rounded-t-xl ${index === 3 ? 'bg-violet-300/80' : 'bg-white/20'}`}
                        style={{ height: `${height}px` }}
                      />
                      <div className="text-[9px] uppercase tracking-[0.08em] text-white/40">
                        {['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum'][index]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Özet</div>
                <div className="mt-3 space-y-2">
                  {[
                    'Tahsilat akışı görünür',
                    'Bakım KPI izleniyor',
                    'Teklif dönüşü ölçülüyor',
                  ].map((row) => (
                    <div key={row} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/85">
                      {row}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function VisualShowcaseCard({
  title,
  text,
  tone,
  variant,
  icon,
}: {
  title: string
  text: string
  tone: 'emerald' | 'cyan' | 'violet'
  variant: 'team' | 'portfolio' | 'management'
  icon: ReactNode
}) {
  const toneClass =
    tone === 'emerald'
      ? 'from-emerald-400/30 via-emerald-300/10 to-white/5'
      : tone === 'violet'
        ? 'from-violet-400/30 via-violet-300/10 to-white/5'
        : 'from-cyan-400/30 via-cyan-300/10 to-white/5'

  return (
    <article className={`overflow-hidden rounded-[1.4rem] border border-white/10 bg-gradient-to-br ${toneClass} p-4 text-white shadow-[0_12px_30px_rgba(2,6,23,0.22)] transition duration-300 md:hover:-translate-y-1.5 md:hover:shadow-[0_24px_65px_rgba(2,6,23,0.32)]`}>
      <div className="flex items-center justify-between">
        <span className="inline-flex rounded-2xl bg-white/10 p-3 text-white">{icon}</span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">Canlı</span>
      </div>
      <div className="mt-6 lg:mt-5">
        <div className="text-lg font-bold">{title}</div>
        <div className="mt-2 text-sm leading-6 text-slate-100/90">{text}</div>
      </div>
      <div className="mt-6 rounded-[1.35rem] border border-white/10 bg-slate-950/20 p-3 backdrop-blur-sm">
        {variant === 'team' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Bugün</div>
                <div className="mt-1 text-2xl font-black leading-none text-white">12 görev</div>
              </div>
              <div className="self-center rounded-full bg-emerald-300/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                4 ekip
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {[
                ['Avrupa Ekibi', '5 bakım'],
                ['Anadolu Ekibi', '4 bakım'],
                ['Denetim Ekibi', '3 kontrol'],
              ].map(([name, value]) => (
                <div key={name} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
                  <div className="text-sm font-semibold text-white">{name}</div>
                  <div className="text-xs whitespace-nowrap text-cyan-100">{value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {variant === 'portfolio' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['18', 'Bina'],
                ['64', 'Asansör'],
                ['12', 'Cari'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-center">
                  <div className="text-lg font-black text-white">{value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/60">{label}</div>
                </div>
                ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Portföy eşleşmesi</div>
              <div className="mt-3 space-y-2">
                {[
                  'Levent Plaza A  •  6 asansör',
                  'Rezidans Blok B  •  4 asansör',
                  'Sanayi Sitesi  •  Tahsilat açık',
                ].map((row) => (
                  <div key={row} className="rounded-xl bg-white/5 px-3 py-2 text-xs leading-5 text-slate-100">
                    {row}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {variant === 'management' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['₺184K', 'Teklif'],
                ['91%', 'Tamam.'],
                ['32', 'Açık'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                  <div className="text-base font-black text-white">{value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/60">{label}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/35 p-3 sm:grid-cols-[1.2fr_0.8fr]">
              <div className="flex items-end gap-2 rounded-xl bg-white/5 p-3">
                {[42, 68, 54, 76, 61, 83].map((height, index) => (
                  <div key={height} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className={`w-full rounded-t-xl ${index === 5 ? 'bg-emerald-300/80' : 'bg-white/20'}`}
                      style={{ height: `${height}px`, minHeight: `${height}px` }}
                    />
                    <div className="text-[9px] uppercase tracking-[0.08em] text-white/45">
                      {['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'][index]}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  'Tahsilat görünürlüğü',
                  'Bakım KPI takibi',
                  'Teklif dönüş raporu',
                ].map((row) => (
                  <div
                    key={row}
                    className="rounded-xl bg-white/5 px-2.5 py-2 text-[11px] leading-4 text-white/85 break-words sm:px-3"
                  >
                    {row}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function VisualStoryCard({
  title,
  text,
  tag,
  tone,
  scene,
}: {
  title: string
  text: string
  tag: string
  tone: 'emerald' | 'cyan' | 'violet'
  scene: 'mobile' | 'quote' | 'management'
}) {
  const toneClass =
    tone === 'emerald'
      ? 'from-emerald-50 to-white'
      : tone === 'violet'
        ? 'from-violet-50 to-white'
        : 'from-cyan-50 to-white'

  const accentClass =
    tone === 'emerald' ? 'text-emerald-700 border-emerald-200' : tone === 'violet' ? 'text-violet-700 border-violet-200' : 'text-cyan-700 border-cyan-200'

  return (
    <article className={`flex h-full w-full max-w-full flex-col overflow-hidden rounded-[1.8rem] border border-slate-200 bg-gradient-to-br ${toneClass} p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition duration-300 md:hover:-translate-y-1.5 md:hover:shadow-[0_26px_65px_rgba(15,23,42,0.14)]`}>
      <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${accentClass}`}>
        {tag}
      </div>
      <div className="mt-4 w-full max-w-full rounded-[1.4rem] border border-white/80 bg-white/85 p-4">
        {scene === 'mobile' ? (
          <div className="space-y-3">
            <div className="rounded-[1.4rem] bg-slate-950 p-3">
              <div className="rounded-[1.1rem] border border-white/10 bg-slate-900 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Mobil ekip</div>
                  <div className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-semibold text-emerald-300">Aktif</div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-white/5 p-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-white/45">Bugün</div>
                    <div className="mt-2 text-2xl font-black leading-none text-white">12</div>
                    <div className="mt-2 text-sm font-semibold text-white">tamamlanacak iş</div>
                  </div>
                  <div className="justify-self-start self-start rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80">
                    4 ekip
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {[
                    ['Avrupa Ekibi', '5 bakım'],
                    ['Anadolu Ekibi', '4 bakım'],
                    ['Denetim Ekibi', '3 kontrol'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
                      <div className="text-xs font-semibold text-white">{label}</div>
                      <div className="text-[11px] text-white/65">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              {[
                ['Görev görünürlüğü', 'Sahadaki iş aynı gün yönetime düşer'],
                ['Ekip yükü', 'Hangi ekibin ne kadar iş aldığı görünür'],
                ['Kontrol akışı', 'Bakım ve denetim birlikte izlenir'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div className="text-sm font-semibold text-slate-900">{label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {scene === 'quote' ? (
          <div className="space-y-3">
            <div className="rounded-[1.4rem] bg-slate-950 p-3">
              <div className="rounded-[1.1rem] border border-white/10 bg-slate-900 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">Teklif akışı</div>
                  <div className="rounded-full bg-cyan-400/15 px-2 py-1 text-[10px] font-semibold text-cyan-300">Hazır</div>
                </div>
                <div className="mt-3 grid gap-2">
                  {['TS EN 81-20 / 7.5.26', 'Kapı güvenlik revizyonu', '₺184.000 toplam teklif'].map((row) => (
                    <div key={row} className="rounded-xl bg-white/5 px-3 py-2.5 text-xs text-white">
                      {row}
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    ['48', 'Madde'],
                    ['6', 'Onay'],
                    ['14:20', 'Son'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-xl bg-white/5 px-2 py-3 text-center">
                      <div className="text-base font-black text-white">{value}</div>
                      <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/45">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              {[
                ['Madde eşleşmesi', 'Standart maddeler doğrudan teklife bağlanır'],
                ['Onay takibi', 'Bekleyen teklifler ve son gönderim görünür'],
                ['Hızlı hazırlık', 'Revizyon akışı daha kontrollü ilerler'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div className="text-sm font-semibold text-slate-900">{label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {scene === 'management' ? (
          <div className="space-y-3">
            <div className="rounded-[1.4rem] bg-slate-950 p-3">
              <div className="rounded-[1.1rem] border border-white/10 bg-slate-900 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    ['91%', 'Tamam.'],
                    ['₺184K', 'Teklif'],
                    ['32', 'Açık'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-xl bg-white/5 px-2 py-3 text-center">
                      <div className="text-sm font-black text-white">{value}</div>
                      <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/45">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex h-24 items-end gap-2 rounded-xl bg-white/5 p-3">
                  {[38, 61, 47, 74, 56].map((height, index) => (
                    <div key={height} className="flex flex-1 flex-col items-center gap-1.5">
                      <div
                        className={`w-full rounded-t-lg ${index === 3 ? 'bg-violet-400/75' : 'bg-white/20'}`}
                        style={{ height: `${height}px` }}
                      />
                      <div className="text-[8px] uppercase tracking-[0.08em] text-white/40">
                        {['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum'][index]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              {[
                ['Tahsilat görünürlüğü', 'Açık bakiye tek yerde'],
                ['Bakım KPI takibi', 'Verim ve ekip yükü izlenir'],
                ['Yönetim raporu', 'Özet karar ekranı'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div className="text-sm font-semibold text-slate-900">{label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-4 text-xl font-black text-slate-950">{title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-600">{text}</div>
    </article>
  )
}

function LayoutIcon() {
  return <Building2 className="h-5 w-5" />
}

function MarketingInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email'
  placeholder?: string
  error?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={[
          'rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-4',
          error
            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100',
        ].join(' ')}
      />
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  )
}

function MarketingTextarea({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <textarea
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={[
          'rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-4',
          error
            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100',
        ].join(' ')}
      />
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  )
}

function FormFeedback({
  status,
  message,
  successMessage,
}: {
  status: SubmitStatus
  message: string
  successMessage: string
}) {
  if (status === 'idle' || !message) return null

  if (status === 'success') {
    return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message || successMessage}</div>
  }

  if (status === 'error') {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{message}</div>
  }

  return null
}

function TrialResultCard({
  existingDemo,
  accessEmailSent,
  loginUrl,
  tenantSlug,
  tenantDatabase,
  expiresAt,
  status,
  username,
  temporaryPassword,
  showTemporaryPassword,
}: {
  existingDemo?: boolean
  accessEmailSent?: boolean
  loginUrl?: string
  tenantSlug?: string
  tenantDatabase?: string
  expiresAt?: string
  status?: string
  username?: string
  temporaryPassword?: string
  showTemporaryPassword?: boolean
}) {
  const shouldShowTemporaryPassword = showTemporaryPassword === true

  if (!loginUrl && !tenantSlug && !tenantDatabase && !expiresAt && !status && !username && !temporaryPassword && !existingDemo && !accessEmailSent) return null

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-950">
      <div className="font-semibold">Demo ortamı yanıtı alındı</div>
      {existingDemo ? <div className="mt-2">Aktif demo hesabiniz bulundu. Yeni demo acilmadi.</div> : null}
      {status ? <div className="mt-2">Durum: <span className="font-semibold">{status}</span></div> : null}
      {tenantSlug ? <div className="mt-2">Tenant: <span className="font-semibold">{tenantSlug}</span></div> : null}
      {tenantDatabase ? <div className="mt-1">Veritabanı: <span className="font-semibold">{tenantDatabase}</span></div> : null}
      {username ? <div className="mt-1">Kullanıcı adı: <span className="font-semibold">{username}</span></div> : null}
      {shouldShowTemporaryPassword && temporaryPassword ? <div className="mt-1">Geçici şifre: <span className="font-semibold">{temporaryPassword}</span></div> : null}
      {accessEmailSent ? <div className="mt-1">Erişim bilgileri mailinize gönderildi.</div> : null}
      {accessEmailSent === false ? <div className="mt-1 font-medium text-amber-700">E-posta gonderilemedi. Erisim bilgilerinizi bu ekrandan kullanin.</div> : null}
      {showTemporaryPassword === false ? <div className="mt-1">Sifrenizi mailinizden alin.</div> : null}
      {expiresAt ? <div className="mt-1">Bitiş: <span className="font-semibold">{new Date(expiresAt).toLocaleString('tr-TR')}</span></div> : null}
      {loginUrl ? (
        <a
          href={loginUrl}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
        >
          Demo Ortamına Git
          <ArrowRight className="h-4 w-4" />
        </a>
      ) : null}
    </div>
  )
}

function TrialReadyPanel({
  feedback,
  result,
  onReset,
}: {
  feedback: string
  result: TrialResultData
  onReset: () => void
}) {
  const isExistingDemo = result.existingDemo === true
  const shouldShowTemporaryPassword = result.showTemporaryPassword === true

  return (
    <div className="mt-6 rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)] p-6 shadow-sm">
      <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Demo Hazır</div>
      <h3 className="mt-4 text-2xl font-black text-slate-950">
        {isExistingDemo ? 'Aktif demo hesabiniz bulundu' : 'Demo ortamınız kullanıma açıldı.'}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        {isExistingDemo
          ? 'Yeni demo açılmadı. Mevcut demo bilgilerinizi kullanarak devam edebilirsiniz.'
          : feedback || 'Demo tenant hazır. Aşağıdaki bilgilerle doğrudan giriş yapabilirsiniz.'}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tenant</div>
          <div className="mt-2 text-base font-semibold text-slate-950">{result.tenantSlug || 'Hazırlandı'}</div>
          {result.status ? <div className="mt-3 text-sm text-slate-600">Durum: <span className="font-semibold text-slate-950">{result.status}</span></div> : null}
          {result.expiresAt ? (
            <div className="mt-2 text-sm text-slate-600">
              Geçerlilik: <span className="font-semibold text-slate-950">{new Date(result.expiresAt).toLocaleString('tr-TR')}</span>
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Giriş Bilgileri</div>
          {result.username ? <div className="mt-2 text-sm text-slate-600">Kullanıcı adı: <span className="font-semibold text-slate-950">{result.username}</span></div> : null}
          {shouldShowTemporaryPassword && result.temporaryPassword ? <div className="mt-2 text-sm text-slate-600">Geçici şifre: <span className="font-semibold text-slate-950">{result.temporaryPassword}</span></div> : null}
          {result.accessEmailSent ? (
            <div className="mt-2 text-sm text-slate-600">Erişim bilgileri mailinize gönderildi.</div>
          ) : result.accessEmailSent === false ? (
            <div className="mt-2 text-sm font-medium text-amber-700">E-posta gonderilemedi. Erisim bilgilerinizi bu ekrandan kullanin.</div>
          ) : result.showTemporaryPassword === false ? (
            <div className="mt-2 text-sm text-slate-600">Sifrenizi mailinizden alin.</div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {result.loginUrl ? (
          <a
            href={result.loginUrl}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            {isExistingDemo ? 'Mevcut Demo Ortamına Git' : 'Demo Ortamına Git'}
            <ArrowRight className="h-4 w-4" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Yeni Demo Aç
        </button>
      </div>
    </div>
  )
}

function TrialRequestDialog({
  open,
  onOpenChange,
  form,
  onChange,
  onSubmit,
  status,
  feedback,
  fieldErrors,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: {
    name: string
    company: string
    phone: string
    email: string
    companySize: string
  }
  onChange: React.Dispatch<
    React.SetStateAction<{
      name: string
      company: string
      phone: string
      email: string
      companySize: string
    }>
  >
  onSubmit: (event: FormEvent) => Promise<void>
  status: SubmitStatus
  feedback: string
  fieldErrors: MarketingFieldErrors
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Hemen dene</DialogTitle>
          <DialogDescription>
            Çalışan auto-demo servisini kullanarak sizin için örnek verili demo tenant hazırlayalım.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <MarketingInput label="Ad Soyad" value={form.name} error={fieldErrors.name} onChange={(value) => onChange((prev) => ({ ...prev, name: value }))} />
            <MarketingInput label="Firma" value={form.company} error={fieldErrors.company} onChange={(value) => onChange((prev) => ({ ...prev, company: value }))} />
            <MarketingInput label="Telefon" value={form.phone} error={fieldErrors.phone} onChange={(value) => onChange((prev) => ({ ...prev, phone: value }))} />
            <MarketingInput label="E-posta" type="email" value={form.email} error={fieldErrors.email} onChange={(value) => onChange((prev) => ({ ...prev, email: value }))} />
          </div>
          <MarketingInput
            label="Firma Büyüklüğü"
            value={form.companySize}
            error={fieldErrors.companySize}
            placeholder="Örn: 10 kişi, 250 asansör"
            onChange={(value) => onChange((prev) => ({ ...prev, companySize: value }))}
          />

          <FormFeedback status={status} message={feedback} successMessage="Demo ortamınız hazırlanıyor." />

          <DialogFooter>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === 'submitting' ? 'Hazırlanıyor...' : 'Demo Ortamını Hazırla'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
