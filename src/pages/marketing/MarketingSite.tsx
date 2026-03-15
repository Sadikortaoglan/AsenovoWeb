import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  Headphones,
  LayoutDashboard,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { resolveApiBaseUrl } from '@/lib/api-base-url'
import heroOfficeImage from '@/assets/marketing/hero-office.jpg'
import screenBuildingImage from '@/assets/marketing/screen-building.jpg'
import screenTeamImage from '@/assets/marketing/screen-team.jpg'
import screenTechImage from '@/assets/marketing/screen-tech.jpg'

const SUPPORT_EMAIL = 'support@asenovo.com'
const SUPPORT_PHONE = '0541 370 42 64'
const PLAN_OPTIONS = ['Starter', 'Professional', 'Enterprise'] as const

type SectionId =
  | 'hero'
  | 'problems'
  | 'solution'
  | 'features'
  | 'screens'
  | 'pricing'
  | 'demo'
  | 'trust'
  | 'contact'

type MarketingPageProps = {
  focusSection?: SectionId
  pageTitle?: string
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'
type MarketingFormPath = '/trial-request' | '/demo-request' | '/plan-request' | '/contact'
type PlanName = (typeof PLAN_OPTIONS)[number]
type MarketingFormResponse = {
  success?: boolean
  message?: string
  data?: {
    requestToken?: string
    existingDemo?: boolean
    accessEmailSent?: boolean
    emailError?: string
    loginUrl?: string
    tenantSlug?: string
    tenantDatabase?: string
    expiresAt?: string
    status?: string
    username?: string
    temporaryPassword?: string
    showTemporaryPassword?: boolean
    provisioningError?: string
  } | null
  errors?: Record<string, string | string[]> | null
}
type TrialResultData = NonNullable<MarketingFormResponse['data']>

type MarketingFieldErrors = Record<string, string>

class MarketingFormError extends Error {
  fieldErrors: MarketingFieldErrors

  constructor(message: string, fieldErrors: MarketingFieldErrors = {}) {
    super(message)
    this.name = 'MarketingFormError'
    this.fieldErrors = fieldErrors
  }
}

function mapFieldErrors(errors?: MarketingFormResponse['errors']): MarketingFieldErrors {
  if (!errors) return {}

  return Object.entries(errors).reduce<MarketingFieldErrors>((acc, [key, value]) => {
    if (Array.isArray(value)) {
      acc[key] = value.filter(Boolean).join(', ')
      return acc
    }

    if (typeof value === 'string' && value.trim()) {
      acc[key] = value
    }

    return acc
  }, {})
}

function mergeTrialResult(previous: TrialResultData | null, next: TrialResultData | null): TrialResultData | null {
  if (!next) return previous
  if (!previous) return next

  return {
    ...previous,
    ...next,
    existingDemo: next.existingDemo ?? previous.existingDemo,
    accessEmailSent: next.accessEmailSent ?? previous.accessEmailSent,
    emailError: next.emailError ?? previous.emailError,
    loginUrl: next.loginUrl ?? previous.loginUrl,
    temporaryPassword: next.temporaryPassword ?? previous.temporaryPassword,
    showTemporaryPassword: next.showTemporaryPassword ?? previous.showTemporaryPassword,
    tenantSlug: next.tenantSlug ?? previous.tenantSlug,
    status: next.status ?? previous.status,
    expiresAt: next.expiresAt ?? previous.expiresAt,
  }
}

function useMarketingSeo(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title
    const previousDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
    const previousKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || ''

    document.title = title

    let descriptionMeta = document.querySelector('meta[name="description"]')
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta')
      descriptionMeta.setAttribute('name', 'description')
      document.head.appendChild(descriptionMeta)
    }
    descriptionMeta.setAttribute('content', description)

    let keywordsMeta = document.querySelector('meta[name="keywords"]')
    if (!keywordsMeta) {
      keywordsMeta = document.createElement('meta')
      keywordsMeta.setAttribute('name', 'keywords')
      document.head.appendChild(keywordsMeta)
    }
    keywordsMeta.setAttribute(
      'content',
      'asansör bakım yazılımı, asansör servis programı, asansör yönetim sistemi, asansör takip yazılımı'
    )

    return () => {
      document.title = previousTitle
      if (descriptionMeta) descriptionMeta.setAttribute('content', previousDescription)
      if (keywordsMeta) keywordsMeta.setAttribute('content', previousKeywords)
    }
  }, [description, title])
}

function scrollToSection(sectionId?: SectionId) {
  if (!sectionId || typeof document === 'undefined') return
  window.requestAnimationFrame(() => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

async function submitMarketingForm(path: MarketingFormPath, payload: Record<string, unknown>) {
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const rawText = await response.text()
  let parsed: MarketingFormResponse | null = null

  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as MarketingFormResponse
    } catch {
      parsed = null
    }
  }

  if (!response.ok) {
    throw new MarketingFormError(parsed?.message || 'Form gönderilirken bir hata oluştu.', mapFieldErrors(parsed?.errors))
  }

  return parsed
}

async function getTrialRequestStatus(requestToken: string) {
  const response = await fetch(`${resolveApiBaseUrl()}/trial-request/${requestToken}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  const rawText = await response.text()
  let parsed: MarketingFormResponse | null = null

  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as MarketingFormResponse
    } catch {
      parsed = null
    }
  }

  if (!response.ok) {
    throw new MarketingFormError(parsed?.message || 'Trial durumu alınamadı.')
  }

  return parsed
}

function MarketingLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] shadow-lg shadow-blue-950/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),transparent_55%)]" />
        <span className="relative text-lg font-black tracking-tight text-white">A</span>
      </div>
      <div>
        <div className="text-lg font-black tracking-tight text-slate-950">asenovo</div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Elevator SaaS Platform
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
        [
          'rounded-full px-4 py-2 text-sm font-semibold transition',
          isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  )
}

function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_24%,#f8fbff_100%)] text-slate-900">
      <div className="fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.13),transparent_42%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.1),transparent_34%)]" />

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <MarketingLogo />

          <nav className="hidden items-center gap-2 lg:flex">
            <MarketingNavLink to="/">Ana Sayfa</MarketingNavLink>
            <MarketingNavLink to="/hakkimizda">Çözüm</MarketingNavLink>
            <MarketingNavLink to="/paketler">Özellikler</MarketingNavLink>
            <MarketingNavLink to="/fiyatlandirma">Fiyatlandırma</MarketingNavLink>
            <MarketingNavLink to="/iletisim">İletişim</MarketingNavLink>
          </nav>

          <a
            href="#demo"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Canlı Demo Aç
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 md:py-12">{children}</main>
    </div>
  )
}

function MarketingPage({ focusSection, pageTitle }: MarketingPageProps) {
  useMarketingSeo(
    pageTitle || 'Asenovo | Asansör Firmaları İçin Yeni Nesil Yönetim Platformu',
    'Asenovo ile bakım, revizyon, teklif ve müşteri yönetimini tek platformdan yönetin. Asansör bakım yazılımı, servis programı ve yönetim sistemi.'
  )

  useEffect(() => {
    scrollToSection(focusSection)
  }, [focusSection])

  const [demoForm, setDemoForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    companySize: '',
  })
  const [contactForm, setContactForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    message: '',
  })
  const [contactStatus, setContactStatus] = useState<SubmitStatus>('idle')
  const [contactFeedback, setContactFeedback] = useState<string>('')
  const [demoFieldErrors, setDemoFieldErrors] = useState<MarketingFieldErrors>({})
  const [contactFieldErrors, setContactFieldErrors] = useState<MarketingFieldErrors>({})
  const [trialStatus, setTrialStatus] = useState<SubmitStatus>('idle')
  const [trialFeedback, setTrialFeedback] = useState<string>('')
  const [trialResult, setTrialResult] = useState<TrialResultData | null>(null)
  const [trialRequestToken, setTrialRequestToken] = useState<string | null>(null)
  const [planStatus, setPlanStatus] = useState<SubmitStatus>('idle')
  const [planFeedback, setPlanFeedback] = useState<string>('')
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [trialModalOpen, setTrialModalOpen] = useState(false)
  const [planForm, setPlanForm] = useState({
    plan: 'Professional' as PlanName,
    name: '',
    company: '',
    phone: '',
    email: '',
  })

  const problemCards = useMemo(
    () => [
      {
        icon: <FileText className="h-5 w-5" />,
        title: 'Kağıtla yürüyen saha kayıtları',
        text: 'Bakım formları, denetim notları ve servis bilgileri farklı yerlerde tutulduğu için operasyon izlenemez hale geliyor.',
      },
      {
        icon: <ClipboardList className="h-5 w-5" />,
        title: 'Kaybolan denetim ve revizyon belgeleri',
        text: 'Kontrol raporları ve revizyon maddeleri dağınık tutulduğunda hem saha hem ofis ekibi aynı veriye ulaşamıyor.',
      },
      {
        icon: <Wrench className="h-5 w-5" />,
        title: 'Takibi zor servis süreçleri',
        text: 'Planlı bakım, arıza, ekip dağılımı ve teklif takibi birbirinden kopuk olunca operasyon gecikiyor.',
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        title: 'Elle hazırlanan teklif ve rapor yükü',
        text: 'Revizyon teklifleri ve müşteri bilgilendirmeleri manuel ilerlediğinde hem zaman hem gelir kaybı oluşuyor.',
      },
    ],
    []
  )

  const featureCards = useMemo(
    () => [
      {
        icon: <FileText className="h-5 w-5" />,
        title: 'Revizyon Teklif Yönetimi',
        text: 'Standart maddeler, teklif satırları ve müşteri onay süreçlerini tek merkezden yönetin.',
      },
      {
        icon: <ClipboardList className="h-5 w-5" />,
        title: 'Periyodik Bakım Takibi',
        text: 'Bakım planlarını görün, gecikmeleri izleyin ve teknisyen akışını düzenli yönetin.',
      },
      {
        icon: <Building2 className="h-5 w-5" />,
        title: 'Asansör Envanteri',
        text: 'Tüm asansör kartlarını, bina ilişkilerini ve teknik geçmişi tenant bazında güvenle tutun.',
      },
      {
        icon: <Users className="h-5 w-5" />,
        title: 'Teknik Servis Yönetimi',
        text: 'Saha ekiplerini, görev dağılımını ve günlük servis akışını tek panelde planlayın.',
      },
      {
        icon: <Headphones className="h-5 w-5" />,
        title: 'Müşteri Yönetimi',
        text: 'Cari kayıtlar, bina ilişkileri ve teklif geçmişi aynı müşteri görünümünde toplansın.',
      },
      {
        icon: <LayoutDashboard className="h-5 w-5" />,
        title: 'Raporlama',
        text: 'Bakım performansı, teklif dönüşümü ve operasyonel görünürlük için yönetici panelleri oluşturun.',
      },
    ],
    []
  )

  const pricingPlans = useMemo<
    Array<{
      name: PlanName
      monthly: string
      yearly: string
      description: string
      features: string[]
      highlighted?: boolean
    }>
  >(
    () => [
      {
        name: 'Starter',
        monthly: '1.990 TL',
        yearly: '16.000 TL',
        description: 'Yeni dijitalleşen ekipler için temel bakım ve teklif operasyonu.',
        features: ['Asansör yönetimi', 'Revizyon teklif sistemi', 'Bakım planlama', 'Temel müşteri yönetimi'],
      },
      {
        name: 'Professional',
        monthly: '3.990 TL',
        yearly: '20.000 TL',
        description: 'Büyüyen asansör firmaları için tam operasyon paneli ve raporlama.',
        highlighted: true,
        features: [
          'Asansör yönetimi',
          'Revizyon teklif sistemi',
          'Bakım planlama',
          'Müşteri yönetimi',
          'Servis ekipleri',
          'Raporlama',
        ],
      },
      {
        name: 'Enterprise',
        monthly: 'Özel',
        yearly: 'Özel',
        description: 'Çok lokasyonlu firmalar, özel SLA ve entegrasyon ihtiyaçları için.',
        features: ['Sınırsız operasyon yapısı', 'Özel onboarding', 'Özel raporlar', 'Kurumsal destek'],
      },
    ],
    []
  )

  function openPlanModal(plan: PlanName) {
    setPlanForm((prev) => ({ ...prev, plan }))
    setPlanStatus('idle')
    setPlanFeedback('')
    setPlanModalOpen(true)
  }

  async function handleTrialSubmit(event: FormEvent) {
    event.preventDefault()

    if (!demoForm.name.trim() || !demoForm.company.trim() || !demoForm.phone.trim() || !demoForm.email.trim()) {
      setTrialStatus('error')
      setTrialFeedback('Lütfen zorunlu alanları doldurun.')
      setDemoFieldErrors({})
      return
    }

    setTrialStatus('submitting')
    setTrialFeedback('')
    setTrialResult(null)
    setTrialRequestToken(null)
    setDemoFieldErrors({})

    try {
      const response = await submitMarketingForm('/trial-request', demoForm)
      const requestToken = response?.data?.requestToken || null
      setTrialFeedback(response?.message || 'Demo ortamınız hazırlanıyor.')
      setTrialResult((previous) => mergeTrialResult(previous, response?.data ?? null))
      setTrialRequestToken(requestToken)
      setTrialModalOpen(false)
      scrollToSection('demo')
      if (!requestToken) {
        throw new MarketingFormError('Trial isteği başlatıldı ancak requestToken dönmedi.')
      }
    } catch (error) {
      setTrialStatus('error')
      setTrialFeedback(error instanceof Error ? error.message : 'Canlı demo oluşturulamadı.')
      setDemoFieldErrors(error instanceof MarketingFormError ? error.fieldErrors : {})
    }
  }

  useEffect(() => {
    if (!trialRequestToken || trialStatus !== 'submitting') return

    let cancelled = false
    let timeoutId: number | null = null

    const poll = async () => {
      try {
        const response = await getTrialRequestStatus(trialRequestToken)
        if (cancelled) return

        const nextResult = response?.data || null
        const nextStatus = nextResult?.status || 'PENDING'

        if (nextResult?.accessEmailSent === false && nextResult?.emailError) {
          console.warn('Trial onboarding email delivery failed:', nextResult.emailError)
        }

        setTrialResult((previous) => mergeTrialResult(previous, nextResult ?? null))

        if (nextStatus === 'READY') {
          setTrialStatus('success')
          setTrialFeedback(response?.message || 'Demo ortamınız hazır.')
          setDemoForm({ name: '', company: '', phone: '', email: '', companySize: '' })
          setTrialRequestToken(null)
          return
        }

        if (nextStatus === 'FAILED') {
          setTrialStatus('error')
          setTrialFeedback(nextResult?.provisioningError || response?.message || 'Demo ortamı hazırlanamadı.')
          setTrialRequestToken(null)
          return
        }

        setTrialFeedback(
          nextStatus === 'PROVISIONING'
            ? 'Demo ortamınız hazırlanıyor. Lütfen bekleyin...'
            : 'Demo talebiniz alındı. Ortam hazırlanıyor...'
        )
        timeoutId = window.setTimeout(poll, 2500)
      } catch (error) {
        if (cancelled) return
        setTrialStatus('error')
        setTrialFeedback(error instanceof Error ? error.message : 'Trial durumu alınamadı.')
        setTrialRequestToken(null)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [trialRequestToken, trialStatus])

  async function handlePlanSubmit(event: FormEvent) {
    event.preventDefault()

    if (!planForm.name.trim() || !planForm.company.trim() || !planForm.phone.trim() || !planForm.email.trim()) {
      setPlanStatus('error')
      setPlanFeedback('Lütfen zorunlu alanları doldurun.')
      return
    }

    setPlanStatus('submitting')
    setPlanFeedback('')

    try {
      const response = await submitMarketingForm('/plan-request', planForm)
      setPlanStatus('success')
      setPlanFeedback(response?.message || 'Plan talebiniz alındı. Ekibimiz sizinle kısa süre içinde iletişime geçecektir.')
      setPlanForm((prev) => ({ ...prev, name: '', company: '', phone: '', email: '' }))
    } catch (error) {
      setPlanStatus('error')
      setPlanFeedback(error instanceof Error ? error.message : 'Plan talebi gönderilemedi.')
    }
  }

  async function handleContactSubmit(event: FormEvent) {
    event.preventDefault()

    if (
      !contactForm.name.trim() ||
      !contactForm.company.trim() ||
      !contactForm.phone.trim() ||
      !contactForm.email.trim() ||
      !contactForm.message.trim()
    ) {
      setContactStatus('error')
      setContactFeedback('Lütfen zorunlu alanları doldurun.')
      setContactFieldErrors({})
      return
    }

    setContactStatus('submitting')
    setContactFeedback('')
    setContactFieldErrors({})

    try {
      const response = await submitMarketingForm('/contact', contactForm)
      setContactStatus('success')
      setContactFeedback(response?.message || 'Ekibimiz sizinle iletişime geçecektir.')
      setContactForm({ name: '', company: '', phone: '', email: '', message: '' })
    } catch (error) {
      setContactStatus('error')
      setContactFeedback(error instanceof Error ? error.message : 'İletişim formu gönderilemedi.')
      setContactFieldErrors(error instanceof MarketingFormError ? error.fieldErrors : {})
    }
  }

  return (
    <MarketingLayout>
      <section
        id="hero"
        className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#14213d_45%,#1d4ed8_100%)] px-6 py-12 text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] md:px-10 md:py-16"
      >
        <div className="absolute -right-16 top-8 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
              <Sparkles className="h-4 w-4" />
              Multi-tenant SaaS for Elevator Operations
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
              Asansör Firmaları İçin Yeni Nesil Yönetim Platformu
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
              Asenovo ile bakım, revizyon, teklif ve müşteri yönetimini tek platformdan yönetin. Her firma
              kendi tenant alanında güvenli şekilde çalışır, ekipler aynı operasyon verisinde buluşur.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setTrialModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Canlı Demo Aç
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/8 px-6 py-3 font-semibold text-white transition hover:bg-white/14"
              >
                Demo Talep Et
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <HeroStat value="500+" label="Yönetilebilir asansör portföyü" />
              <HeroStat value="Tenant bazlı" label="Firma başına izole veri yapısı" />
              <HeroStat value="Tek panel" label="Bakım, teklif ve servis operasyonu" />
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[28px] border border-white/10 bg-white/8 p-3 shadow-2xl backdrop-blur">
              <div className="rounded-[22px] border border-white/10 bg-slate-950/90 p-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Tenant örneği</div>
                    <div className="mt-1 font-semibold text-white">company1.app.asenovo.com</div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    İzole veri alanı
                  </span>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
                  <DashboardMockCard
                    title="Operasyon Özeti"
                    metric="128 Aktif Asansör"
                    lines={[
                      'Bu hafta tamamlanan bakım: 42',
                      'Açık revizyon teklifi: 18',
                      'Gecikmeli görev: 3',
                    ]}
                  />
                  <div className="space-y-4">
                    <MetricPill title="Bakım Takibi" value="%97 zamanında" />
                    <MetricPill title="Teklif Dönüşümü" value="14 onay bekliyor" />
                    <MetricPill title="Servis Ekipleri" value="7 aktif saha ekibi" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="problems" className="mt-24">
        <SectionHeading
          eyebrow="Sektör Problemi"
          title="Asansör firmaları büyüdükçe operasyonel karmaşa görünmez hale gelmez, sadece daha pahalı hale gelir."
          description="Kağıtla, Excel ile ve dağınık WhatsApp akışlarıyla yürüyen servis operasyonu; teklif dönüşümünü, denetim hazırlığını ve müşteri güvenini zayıflatır."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {problemCards.map((card) => (
            <ProblemCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section id="solution" className="mt-24 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Asenovo Çözümü"
            title="Tek tenant, tek platform, tüm operasyon."
            description="Asenovo bakım, revizyon, teklif, ekip, müşteri ve rapor süreçlerini aynı operasyon merkezinde toplar. Her firma kendi tenant alanında çalışır; bu yüzden güvenlik ve ölçeklenebilirlik SaaS seviyesinde korunur."
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <SolutionItem
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Merkezi Platform"
              text="Firma genelindeki bakım, teklif ve müşteri kayıtları tek data modelinde birleşir."
            />
            <SolutionItem
              icon={<Sparkles className="h-5 w-5" />}
              title="Operasyon Otomasyonu"
              text="Revizyon standartları, görev akışları ve teklif hazırlığı daha az manuel adımla yürür."
            />
            <SolutionItem
              icon={<ClipboardList className="h-5 w-5" />}
              title="Revizyon Takibi"
              text="Tekliften satışa dönüşüme kadar tüm revizyon süreci görünür ve denetlenebilir olur."
            />
            <SolutionItem
              icon={<Wrench className="h-5 w-5" />}
              title="Bakım Yönetimi"
              text="Planlama, saha uygulaması ve sonrasında raporlama aynı operasyon zincirinde ilerler."
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <img
            src={heroOfficeImage}
            alt="Asansör bakım teknisyeni inceleme yaparken"
            className="h-[420px] w-full rounded-[22px] object-cover"
          />
          <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-slate-950 px-5 py-4 text-white">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Tenant mimarisi</div>
              <div className="mt-1 text-lg font-semibold">asenovo.com → marketing, app.asenovo.com → ürün</div>
            </div>
            <Badge className="hidden bg-emerald-500/15 text-emerald-300 sm:inline-flex">B2B SaaS anlatımı hazır</Badge>
          </div>
        </div>
      </section>

      <section id="features" className="mt-24">
        <SectionHeading
          eyebrow="Ürün Özellikleri"
          title="Asansör operasyonu için gerekli çekirdek modüller tek bir SaaS platformunda."
          description="Pazarlama sitesi uygulamayı anlatır; ürün tenant bazında app.asenovo.com altında çalışır. Her kart doğrudan sahadaki bir problemi çözer."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((card) => (
            <FeatureCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section id="screens" className="mt-24">
        <SectionHeading
          eyebrow="Ürün Ekranları"
          title="Dashboard hissi veren, anlaşılır ve hızlı çalışan operasyon panelleri."
          description="Gerçek ürün akışını anlatan ekran mockup’ları; teknik ekip, ofis ve yönetim katmanının aynı sistemde nasıl buluştuğunu gösterir."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <ProductScreenCard
            title="Asansör Listesi"
            subtitle="Portföyünüzdeki tüm asansörleri tenant bazında filtreleyin."
            metric="128 aktif kayıt"
            rows={['ELEV-001 · Central Business Center', 'ELEV-002 · Residential Complex Block A', 'ELEV-003 · Downtown Plaza']}
          />
          <ProductScreenCard
            title="Revizyon Teklifi"
            subtitle="Standart maddelerle hızlı ve kontrollü teklif hazırlayın."
            metric="18 teklif / 6 onay bekliyor"
            rows={['7.5.26 · Kapı güvenliği', '1.3.8.4 · Kilitleme kontağı', 'Bakım dışı ek ücret kalemi']}
          />
          <ProductScreenCard
            title="Bakım Planlama"
            subtitle="Servis ekipleri ve periyodik bakım yükünü tek planda görün."
            metric="Bu hafta 42 bakım"
            rows={['Pazartesi · Ekip 1 · 6 bina', 'Salı · Ekip 2 · 5 bina', 'Çarşamba · Gecikmeli 1 kayıt']}
          />
          <ProductScreenCard
            title="Dashboard Analytics"
            subtitle="Teklif dönüşümü, bakım performansı ve saha yoğunluğunu ölçün."
            metric="%97 SLA"
            rows={['Aylık teklif dönüşümü · %34', 'Aktif arıza · 7', 'Tahsilat görünümü · canlı']}
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <img
            src={screenTeamImage}
            alt="Teknik ekip toplantısı"
            className="h-56 w-full rounded-[24px] object-cover shadow-lg shadow-slate-900/10"
          />
          <img
            src={screenBuildingImage}
            alt="Modern asansör kabini"
            className="h-56 w-full rounded-[24px] object-cover shadow-lg shadow-slate-900/10"
          />
          <img
            src={screenTechImage}
            alt="Asansör inceleyen teknisyen"
            className="h-56 w-full rounded-[24px] object-cover shadow-lg shadow-slate-900/10"
          />
        </div>
      </section>

      <section id="pricing" className="mt-24">
        <SectionHeading
          eyebrow="SaaS Fiyatlandırma"
          title="Türk B2B pazarına uygun, büyümeyi destekleyen net planlar."
          description="Yıllık planlar her zaman daha avantajlıdır. Professional plan, çoğu asansör firması için ideal başlangıç noktasıdır."
        />

        <div className="mt-10 grid gap-5 xl:grid-cols-3">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} {...plan} onSelectPlan={openPlanModal} />
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <th className="px-5 py-4 text-left">Özellik</th>
                  <th className="px-5 py-4 text-center">Starter</th>
                  <th className="px-5 py-4 text-center">Professional</th>
                  <th className="px-5 py-4 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Asansör yönetimi', true, true, true],
                  ['Revizyon teklif sistemi', true, true, true],
                  ['Bakım planlama', true, true, true],
                  ['Müşteri yönetimi', true, true, true],
                  ['Servis ekipleri', false, true, true],
                  ['Raporlama', false, true, true],
                ].map(([feature, starter, professional, enterprise]) => (
                  <tr key={String(feature)} className="border-t border-slate-200">
                    <td className="px-5 py-4 font-medium text-slate-700">{String(feature)}</td>
                    <td className="px-5 py-4 text-center">{starter ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : '—'}</td>
                    <td className="px-5 py-4 text-center">{professional ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : '—'}</td>
                    <td className="px-5 py-4 text-center">{enterprise ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="demo" className="mt-24 grid gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
        <div>
          <SectionHeading
            eyebrow="Demo Funnel"
            title="Kullanıcıyı login ekranına değil, gerçek onboarding akışına alın."
            description="Canlı demo açılan kullanıcı örnek verilerle sisteme girsin; kurulum isteyen kullanıcı ise plan talebi bırakıp ekibinizle ilerlesin."
          />

          {trialStatus === 'success' && trialResult?.status === 'READY' ? (
            <TrialReadyScreen
              feedback={trialFeedback}
              result={trialResult}
              onReset={() => {
                setTrialStatus('idle')
                setTrialFeedback('')
                setTrialResult(null)
                setTrialRequestToken(null)
              }}
            />
          ) : (
            <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-950">Canlı Demo Aç</h3>
              <p className="mt-2 text-sm text-slate-600">
                Kısa formu doldurun; backend demo tenant hazırlasın, size giriş bağlantısı veya aktivasyon e-postası gönderilsin.
              </p>

              <form className="mt-6 grid gap-4" onSubmit={handleTrialSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <MarketingInput
                    label="Ad Soyad"
                    value={demoForm.name}
                    error={demoFieldErrors.name}
                    onChange={(value) => setDemoForm((prev) => ({ ...prev, name: value }))}
                  />
                  <MarketingInput
                    label="Firma"
                    value={demoForm.company}
                    error={demoFieldErrors.company}
                    onChange={(value) => setDemoForm((prev) => ({ ...prev, company: value }))}
                  />
                  <MarketingInput
                    label="Telefon"
                    value={demoForm.phone}
                    error={demoFieldErrors.phone}
                    onChange={(value) => setDemoForm((prev) => ({ ...prev, phone: value }))}
                  />
                  <MarketingInput
                    label="E-posta"
                    type="email"
                    value={demoForm.email}
                    error={demoFieldErrors.email}
                    onChange={(value) => setDemoForm((prev) => ({ ...prev, email: value }))}
                  />
                </div>

                <MarketingInput
                  label="Firma Büyüklüğü"
                  value={demoForm.companySize}
                  error={demoFieldErrors.companySize}
                  placeholder="Örn: 1-10 kişi, 100 asansör"
                  onChange={(value) => setDemoForm((prev) => ({ ...prev, companySize: value }))}
                />

                <button
                  type="submit"
                  disabled={trialStatus === 'submitting'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {trialStatus === 'submitting' ? 'Hazırlanıyor...' : 'Canlı Demo Aç'}
                </button>

                <FormFeedback
                  status={trialStatus}
                  message={trialFeedback}
                  successMessage="Demo ortamınız hazır."
                />
              </form>
            </div>
          )}

          <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Alternatif akış</div>
            <h3 className="mt-3 text-xl font-bold">Canlı anlatım ve kurulum görüşmesi talep edin.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Tenant açmadan önce ekibinizin sürecini birlikte değerlendirelim. Demo talebi bırakın, size uygun senaryoyu planlayalım.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setTrialModalOpen(true)}
                className="rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Demo Aç
              </button>
              <button
                type="button"
                onClick={() => openPlanModal('Professional')}
                className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Kurulumu Başlat
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-950">Onboarding Akışı</h3>
          <p className="mt-2 text-sm text-slate-600">Yeni tenant’ın yayına alınması dakikalar içinde başlayabilir.</p>

          <div className="mt-8 space-y-4">
            {[
              ['1', 'Hesap oluşturun', 'Firma hesabınızı açın ve tenant alanınızı aktif edin.'],
              ['2', 'Asansörleri ekleyin', 'Portföyünüzü sisteme aktarın, bina ve cari ilişkilerini kurun.'],
              ['3', 'Bakımı yönetin', 'Periyodik planlar ve saha görevlerini dijital akışa taşıyın.'],
              ['4', 'Revizyon tekliflerini gönderin', 'Standart maddeler ile hızlı teklif oluşturup müşteriye iletin.'],
            ].map(([step, title, text]) => (
              <div key={step} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 font-bold text-white">
                  {step}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-950">{title}</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="mt-24">
        <SectionHeading
          eyebrow="Güven ve Dönüşüm"
          title="Kurumsal satın alma kararını destekleyen açık, güvenilir anlatım."
          description="Asenovo pazarlama sitesi ürünün tenant mimarisini açıklar; uygulama app.asenovo.com altında çalışır ve her firma kendi alanında izole edilir."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
            <div className="grid gap-6 md:grid-cols-2">
              <TrustMetric value="Multi-tenant" label="Her firma için ayrı tenant alanı" />
              <TrustMetric value="B2B SaaS" label="Satış ve onboarding odaklı ürün yaklaşımı" />
              <TrustMetric value="Operasyon odaklı" label="Saha + ofis + yönetim tek sistemde" />
              <TrustMetric value="Hızlı başlangıç" label="Demo sonrası tenant kurulum akışı" />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-950">Neden dönüşüm üretir?</h3>
            <div className="mt-5 space-y-4">
              <TrustRow title="Güçlü CTA yapısı" text="Hero, pricing ve demo bölümlerinde net aksiyonlar var." />
              <TrustRow title="Açık fiyatlandırma" text="B2B alıcı için gerçekçi SaaS fiyat yapısı gösteriliyor." />
              <TrustRow title="Ürün anlatımı" text="Özellikler ve ekran mockup’ları karar vericinin ürünü zihninde konumlamasını kolaylaştırıyor." />
              <TrustRow title="Arama görünürlüğü" text="Asansör bakım yazılımı ve servis programı aramalarında bulunabilirliği güçlendiren içerik yapısı ile destekleniyor." />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-950">Sektörel İçerik ve Arama Görünürlüğü</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Asenovo, <strong>asansör bakım yazılımı</strong>, <strong>asansör servis programı</strong>,
            <strong> asansör yönetim sistemi</strong> ve <strong>asansör takip yazılımı</strong> arayan firmalar için
            geliştirildi. Bakım, revizyon, teklif, müşteri, servis ekipleri ve raporlama süreçlerini aynı SaaS
            altyapısında birleştirerek operasyonel karmaşayı azaltır.
          </p>
        </div>
      </section>

      <section id="contact" className="mt-24 grid gap-8 xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] xl:items-start">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeading
            eyebrow="İletişim"
            title="Demo, teklif veya ürün sorularınız için bizimle iletişime geçin."
            description="İletişim formu `/api/contact` endpoint’ine gider ve destek ekibine e-posta akışı başlatır."
          />

          <form className="mt-8 grid gap-4" onSubmit={handleContactSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <MarketingInput
                label="Ad Soyad"
                value={contactForm.name}
                error={contactFieldErrors.name}
                onChange={(value) => setContactForm((prev) => ({ ...prev, name: value }))}
              />
              <MarketingInput
                label="Firma"
                value={contactForm.company}
                error={contactFieldErrors.company}
                onChange={(value) => setContactForm((prev) => ({ ...prev, company: value }))}
              />
              <MarketingInput
                label="Telefon"
                value={contactForm.phone}
                error={contactFieldErrors.phone}
                onChange={(value) => setContactForm((prev) => ({ ...prev, phone: value }))}
              />
              <MarketingInput
                label="E-posta"
                type="email"
                value={contactForm.email}
                error={contactFieldErrors.email}
                onChange={(value) => setContactForm((prev) => ({ ...prev, email: value }))}
              />
            </div>

            <MarketingTextarea
              label="Mesaj"
              value={contactForm.message}
              error={contactFieldErrors.message}
              onChange={(value) => setContactForm((prev) => ({ ...prev, message: value }))}
              placeholder="İhtiyacınızı, ekip yapınızı veya demo beklentinizi kısaca yazın"
            />

            <button
              type="submit"
              disabled={contactStatus === 'submitting'}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {contactStatus === 'submitting' ? 'Gönderiliyor...' : 'Mesaj Gönder'}
            </button>

            <FormFeedback status={contactStatus} message={contactFeedback} successMessage="Ekibimiz sizinle iletişime geçecektir." />
          </form>
        </div>

        <div className="space-y-4">
          <ContactCard
            icon={<Phone className="h-5 w-5" />}
            title="Telefon"
            value={SUPPORT_PHONE}
            href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
          />
          <ContactCard
            icon={<Mail className="h-5 w-5" />}
            title="E-posta"
            value={SUPPORT_EMAIL}
            href={`mailto:${SUPPORT_EMAIL}`}
          />
          <ContactCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="SaaS Yapısı"
            value="asenovo.com marketing, app.asenovo.com ürün alanı olarak çalışır."
          />
          <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Hızlı CTA</div>
            <h3 className="mt-3 text-2xl font-black">Platformu canlı görmek istiyorsanız beklemeyin.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Demo ekibimiz tenant mantığını, bakım planlarını ve revizyon teklif akışını doğrudan gösterebilir.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openPlanModal('Professional')}
                className="rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Kurulumu Başlat
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Ekiple Görüş
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-24 rounded-[32px] border border-slate-200 bg-slate-950 px-6 py-10 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] md:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.8fr_0.9fr]">
          <div>
            <MarketingLogo />
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
              Asenovo, asansör bakım firmaları için geliştirilen çok kiracılı bir yönetim SaaS platformudur.
              Bakım, revizyon, müşteri ve teklif süreçlerini tek sistemde birleştirir.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Bağlantılar</h4>
            <div className="mt-4 grid gap-3 text-sm">
              <FooterLink to="/paketler">Features</FooterLink>
              <FooterLink to="/fiyatlandirma">Pricing</FooterLink>
              <FooterLink to="/iletisim">Contact</FooterLink>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="text-left text-slate-300 transition hover:text-white"
              >
                Demo ve Kurulum
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">İletişim</h4>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div>{SUPPORT_EMAIL}</div>
              <div>{SUPPORT_PHONE}</div>
            </div>
          </div>
        </div>
      </footer>

      <TrialRequestDialog
        open={trialModalOpen}
        onOpenChange={setTrialModalOpen}
        form={demoForm}
        onChange={setDemoForm}
        onSubmit={handleTrialSubmit}
        status={trialStatus}
        feedback={trialFeedback}
        result={trialResult}
      />

      <PlanRequestDialog
        open={planModalOpen}
        onOpenChange={setPlanModalOpen}
        form={planForm}
        onChange={setPlanForm}
        onSubmit={handlePlanSubmit}
        status={planStatus}
        feedback={planFeedback}
      />
    </MarketingLayout>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="max-w-3xl">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-8 text-slate-600 md:text-lg">{description}</p>
    </div>
  )
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 backdrop-blur">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-300">{label}</div>
    </div>
  )
}

function DashboardMockCard({
  title,
  metric,
  lines,
}: {
  title: string
  metric: string
  lines: string[]
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-2 text-2xl font-black text-blue-300">{metric}</div>
        </div>
        <div className="rounded-2xl bg-blue-500/12 p-3 text-blue-300">
          <LayoutDashboard className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {lines.map((line) => (
          <div key={line} className="rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-sm text-slate-300">
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricPill({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 text-white">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{title}</div>
      <div className="mt-2 font-semibold">{value}</div>
    </div>
  )
}

function ProblemCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="inline-flex rounded-2xl bg-rose-50 p-3 text-rose-600">{icon}</div>
      <h3 className="mt-5 text-xl font-bold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
    </article>
  )
}

function FeatureCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">{icon}</div>
      <h3 className="mt-5 text-xl font-bold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
    </article>
  )
}

function SolutionItem({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">{icon}</div>
      <h3 className="mt-4 font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
    </div>
  )
}

function ProductScreenCard({
  title,
  subtitle,
  metric,
  rows,
}: {
  title: string
  subtitle: string
  metric: string
  rows: string[]
}) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="rounded-[24px] border border-slate-200 bg-slate-950 p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">{metric}</div>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-200">SaaS ekranı</span>
        </div>

        <div className="mt-4 space-y-3">
          {rows.map((row, index) => (
            <div key={row} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/85 px-4 py-3 text-sm">
              <span>{row}</span>
              <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs text-blue-200">#{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 text-sm leading-7 text-slate-600">{subtitle}</div>
    </article>
  )
}

function PricingCard({
  name,
  monthly,
  yearly,
  description,
  features,
  highlighted,
  onSelectPlan,
}: {
  name: PlanName
  monthly: string
  yearly: string
  description: string
  features: string[]
  highlighted?: boolean
  onSelectPlan: (plan: PlanName) => void
}) {
  return (
    <article
      className={[
        'relative rounded-[30px] border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]',
        highlighted ? 'border-blue-600 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-950',
      ].join(' ')}
    >
      {highlighted ? (
        <span className="absolute right-5 top-5 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
          Most Popular
        </span>
      ) : null}
      <h3 className="text-2xl font-black">{name}</h3>
      <p className={`mt-3 text-sm leading-7 ${highlighted ? 'text-slate-300' : 'text-slate-600'}`}>{description}</p>

      <div className="mt-6">
        <div className={`text-4xl font-black ${highlighted ? 'text-white' : 'text-slate-950'}`}>{monthly}</div>
        <div className={`mt-2 text-sm ${highlighted ? 'text-blue-200' : 'text-slate-500'}`}>Aylık başlangıç</div>
      </div>

      <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${highlighted ? 'bg-white/8 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
        Yıllık plan: <span className="font-semibold">{yearly}</span>
      </div>

      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-sm">
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${highlighted ? 'bg-white/12 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
              <Check className="h-4 w-4" />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onSelectPlan(name)}
        className={[
          'mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold transition',
          highlighted ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-slate-800',
        ].join(' ')}
      >
        Kurulumu Başlat
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  )
}

function TrustMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white/12 bg-white/6 p-5">
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-2 text-sm text-slate-300">{label}</div>
    </div>
  )
}

function TrustRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="font-semibold text-slate-950">{title}</h4>
      <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
    </div>
  )
}

function ContactCard({
  icon,
  title,
  value,
  href,
}: {
  icon: ReactNode
  title: string
  value: string
  href?: string
}) {
  const content = (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 text-slate-950">
        <span className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">{icon}</span>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{value}</div>
        </div>
      </div>
    </div>
  )

  if (!href) return content

  return (
    <a href={href} className="block transition hover:-translate-y-0.5">
      {content}
    </a>
  )
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
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100',
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
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100',
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

function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={['inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', className].filter(Boolean).join(' ')}>{children}</span>
}

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink to={to} className="text-slate-300 transition hover:text-white">
      {children}
    </NavLink>
  )
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

function TrialRequestDialog({
  open,
  onOpenChange,
  form,
  onChange,
  onSubmit,
  status,
  feedback,
  result,
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
  result: TrialResultData | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Canlı Demo Aç</DialogTitle>
          <DialogDescription>
            Demo tenant hazırlansın, örnek veriler yüklensin ve giriş bilgileri e-posta adresinize gelsin.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <MarketingInput label="Ad Soyad" value={form.name} onChange={(value) => onChange((prev) => ({ ...prev, name: value }))} />
            <MarketingInput label="Firma" value={form.company} onChange={(value) => onChange((prev) => ({ ...prev, company: value }))} />
            <MarketingInput label="Telefon" value={form.phone} onChange={(value) => onChange((prev) => ({ ...prev, phone: value }))} />
            <MarketingInput label="E-posta" type="email" value={form.email} onChange={(value) => onChange((prev) => ({ ...prev, email: value }))} />
          </div>
          <MarketingInput
            label="Firma Büyüklüğü"
            value={form.companySize}
            placeholder="Örn: 10 kişi, 250 asansör"
            onChange={(value) => onChange((prev) => ({ ...prev, companySize: value }))}
          />

          <FormFeedback
            status={status}
            message={feedback}
            successMessage="Demo ortamınız hazır."
          />
          {status === 'success' && result ? (
            <TrialResultCard
              existingDemo={result.existingDemo}
              accessEmailSent={result.accessEmailSent}
              loginUrl={result.loginUrl}
              tenantSlug={result.tenantSlug}
              tenantDatabase={result.tenantDatabase}
              expiresAt={result.expiresAt}
              status={result.status}
              username={result.username}
              temporaryPassword={result.temporaryPassword}
              showTemporaryPassword={result.showTemporaryPassword}
            />
          ) : null}

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

function TrialReadyScreen({
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
  const heading = isExistingDemo ? 'Aktif demo hesabiniz bulundu' : 'Demo ortamınız kullanıma açıldı.'
  const description = isExistingDemo
    ? 'Yeni demo acilmadi. Mevcut demo erisim bilgileriniz kullanıma hazır.'
    : feedback || 'Örnek veriler yüklendi. Aşağıdaki bilgilerle doğrudan giriş yapabilir veya bağlantıyı ekibinizle paylaşabilirsiniz.'
  const ctaLabel = isExistingDemo ? 'Mevcut Demo Ortamina Git' : 'Demo Ortamına Git'

  return (
    <div className="mt-8 rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)] p-6 shadow-sm">
      <Badge className="bg-emerald-100 text-emerald-700">Demo Hazır</Badge>
      <h3 className="mt-4 text-2xl font-black text-slate-950">{heading}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tenant</div>
          <div className="mt-2 text-base font-semibold text-slate-950">{result.tenantSlug || 'Hazırlandı'}</div>
          {result.existingDemo ? <div className="mt-3 text-sm text-slate-600">Aktif demo hesabiniz bulundu. Yeni demo acilmadi.</div> : null}
          {result.tenantDatabase ? <div className="mt-2 text-sm text-slate-600">Veritabanı: <span className="font-semibold text-slate-950">{result.tenantDatabase}</span></div> : null}
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
          {result.emailError ? <div className="mt-2 text-xs text-amber-700">{result.emailError}</div> : null}
          {shouldShowTemporaryPassword && result.temporaryPassword && result.loginUrl ? (
            <div className="mt-2 text-sm text-slate-600">Giriş yapmak için aşağıdaki butonu kullanın.</div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {result.loginUrl ? (
          <a
            href={result.loginUrl}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            {ctaLabel}
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

function PlanRequestDialog({
  open,
  onOpenChange,
  form,
  onChange,
  onSubmit,
  status,
  feedback,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: {
    plan: PlanName
    name: string
    company: string
    phone: string
    email: string
  }
  onChange: React.Dispatch<
    React.SetStateAction<{
      plan: PlanName
      name: string
      company: string
      phone: string
      email: string
    }>
  >
  onSubmit: (event: FormEvent) => Promise<void>
  status: SubmitStatus
  feedback: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Kurulumu Başlat</DialogTitle>
          <DialogDescription>
            Seçtiğiniz plan için ekibimiz sizinle iletişime geçsin, tenant kurulumu ve onboarding akışını birlikte başlatalım.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Plan
            <select
              value={form.plan}
              onChange={(event) => onChange((prev) => ({ ...prev, plan: event.target.value as PlanName }))}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              {PLAN_OPTIONS.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <MarketingInput label="Ad Soyad" value={form.name} onChange={(value) => onChange((prev) => ({ ...prev, name: value }))} />
            <MarketingInput label="Firma" value={form.company} onChange={(value) => onChange((prev) => ({ ...prev, company: value }))} />
            <MarketingInput label="Telefon" value={form.phone} onChange={(value) => onChange((prev) => ({ ...prev, phone: value }))} />
            <MarketingInput label="E-posta" type="email" value={form.email} onChange={(value) => onChange((prev) => ({ ...prev, email: value }))} />
          </div>

          <FormFeedback
            status={status}
            message={feedback}
            successMessage="Plan talebiniz alındı. Ekibimiz sizinle kısa süre içinde iletişime geçecektir."
          />

          <DialogFooter>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === 'submitting' ? 'Gönderiliyor...' : 'Plan Talebini Gönder'}
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
      <Route path="/" element={<MarketingPage />} />
      <Route path="/hakkimizda" element={<MarketingPage focusSection="solution" pageTitle="Asenovo | Çözüm" />} />
      <Route path="/fiyatlandirma" element={<MarketingPage focusSection="pricing" pageTitle="Asenovo | Fiyatlandırma" />} />
      <Route path="/paketler" element={<MarketingPage focusSection="features" pageTitle="Asenovo | Özellikler" />} />
      <Route path="/iletisim" element={<MarketingPage focusSection="contact" pageTitle="Asenovo | İletişim" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
