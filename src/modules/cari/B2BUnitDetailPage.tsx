import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import {
  cariService,
  type B2BUnitDetailMenuItem,
  type B2BUnitDetailMenuKey,
} from './cari.service'
import {
  B2BUnitBankPaymentPanel,
  B2BUnitBankCollectionPanel,
  B2BUnitCashPaymentPanel,
  B2BUnitCashCollectionPanel,
  B2BUnitCheckCollectionPanel,
  B2BUnitCheckPaymentPanel,
  B2BUnitDetailFilterPanel,
  B2BUnitCreditCardCollectionPanel,
  B2BUnitCreditCardPaymentPanel,
  B2BUnitElevatorCreatePanel,
  B2BUnitElevatorListPanel,
  B2BUnitFacilityCreatePanel,
  B2BUnitFacilityListPanel,
  B2BUnitMaintenanceFailureListPanel,
  B2BUnitManualCreditPanel,
  B2BUnitManualDebitPanel,
  B2BUnitPaytrCollectionPanel,
  B2BUnitPromissoryNoteCollectionPanel,
  B2BUnitPromissoryNotePaymentPanel,
  B2BUnitPurchaseInvoicePanel,
  B2BUnitReportingPanel,
  B2BUnitSalesInvoicePanel,
} from './B2BUnitDetailPanels'

const FALLBACK_MENUS: B2BUnitDetailMenuItem[] = [
  { key: 'filter', label: 'Filtrele' },
  { key: 'invoice', label: 'Fatura' },
  { key: 'accountTransactions', label: 'Cari İşlemler' },
  { key: 'collection', label: 'Tahsilat' },
  { key: 'payment', label: 'Ödeme' },
  { key: 'reporting', label: 'Raporlama' },
]

type DetailPanelKey =
  | B2BUnitDetailMenuKey
  | 'purchaseInvoice'
  | 'salesInvoice'
  | 'manualDebit'
  | 'manualCredit'
  | 'cashCollection'
  | 'paytrCollection'
  | 'creditCardCollection'
  | 'bankCollection'
  | 'checkCollection'
  | 'promissoryNoteCollection'
  | 'cashPayment'
  | 'creditCardPayment'
  | 'bankPayment'
  | 'checkPayment'
  | 'promissoryNotePayment'
  | 'facilityList'
  | 'facilityCreate'
  | 'elevatorList'
  | 'elevatorCreate'
  | 'maintenanceFailureList'

const INVOICE_SUBMENU_LABELS: Record<'purchaseInvoice' | 'salesInvoice', string> = {
  purchaseInvoice: 'Alış Yap',
  salesInvoice: 'Satış Yap',
}

const ACCOUNT_SUBMENU_LABELS: Record<'manualDebit' | 'manualCredit', string> = {
  manualDebit: 'Cari Borçlandır',
  manualCredit: 'Cari Alacaklandır',
}

const COLLECTION_SUBMENU_LABELS: Record<
  | 'cashCollection'
  | 'paytrCollection'
  | 'creditCardCollection'
  | 'bankCollection'
  | 'checkCollection'
  | 'promissoryNoteCollection',
  string
> = {
  cashCollection: 'Nakit Tahsilat',
  paytrCollection: 'PayTR Tahsilat',
  creditCardCollection: 'Kredi Kartı Tahsilat',
  bankCollection: 'Banka Tahsilat',
  checkCollection: 'Çek Tahsilat',
  promissoryNoteCollection: 'Senet Tahsilat',
}

const PAYMENT_SUBMENU_LABELS: Record<
  'cashPayment' | 'creditCardPayment' | 'bankPayment' | 'checkPayment' | 'promissoryNotePayment',
  string
> = {
  cashPayment: 'Nakit Ödeme',
  creditCardPayment: 'Kredi Kartı Ödeme',
  bankPayment: 'Banka Ödeme',
  checkPayment: 'Çek Ödeme',
  promissoryNotePayment: 'Senet Ödeme',
}

const FACILITY_SUBMENU_LABELS: Record<'facilityList' | 'facilityCreate', string> = {
  facilityList: 'Tesisler (Binalar)',
  facilityCreate: 'Tesis (Bina) Ekle',
}

const ELEVATOR_SUBMENU_LABELS: Record<'elevatorList' | 'elevatorCreate', string> = {
  elevatorList: 'Asansörler',
  elevatorCreate: 'Asansör Ekle',
}

const MAINTENANCE_FAILURE_SUBMENU_LABELS: Record<'maintenanceFailureList', string> = {
  maintenanceFailureList: 'Bakım-Arıza',
}

function formatAmount(value: number): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function renderPanel(
  menu: DetailPanelKey,
  b2bUnitId: number,
  options: {
    editingFacilityId: number | null
    editingElevatorId: number | null
    onOpenCreateFacility: () => void
    onOpenEditFacility: (facilityId: number) => void
    onFacilitySaved: () => void
    onOpenCreateElevator: () => void
    onOpenEditElevator: (elevatorId: number) => void
    onElevatorSaved: () => void
  },
) {
  if (menu === 'filter') return <B2BUnitDetailFilterPanel b2bUnitId={b2bUnitId} />
  if (menu === 'invoice') return <B2BUnitPurchaseInvoicePanel b2bUnitId={b2bUnitId} />
  if (menu === 'purchaseInvoice') return <B2BUnitPurchaseInvoicePanel b2bUnitId={b2bUnitId} />
  if (menu === 'salesInvoice') return <B2BUnitSalesInvoicePanel b2bUnitId={b2bUnitId} />
  if (menu === 'accountTransactions') return <B2BUnitManualDebitPanel b2bUnitId={b2bUnitId} />
  if (menu === 'manualDebit') return <B2BUnitManualDebitPanel b2bUnitId={b2bUnitId} />
  if (menu === 'manualCredit') return <B2BUnitManualCreditPanel b2bUnitId={b2bUnitId} />
  if (menu === 'collection') return <B2BUnitCashCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'cashCollection') return <B2BUnitCashCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'paytrCollection') return <B2BUnitPaytrCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'creditCardCollection') return <B2BUnitCreditCardCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'bankCollection') return <B2BUnitBankCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'checkCollection') return <B2BUnitCheckCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'promissoryNoteCollection') return <B2BUnitPromissoryNoteCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'payment') return <B2BUnitCashPaymentPanel b2bUnitId={b2bUnitId} />
  if (menu === 'cashPayment') return <B2BUnitCashPaymentPanel b2bUnitId={b2bUnitId} />
  if (menu === 'creditCardPayment') return <B2BUnitCreditCardPaymentPanel b2bUnitId={b2bUnitId} />
  if (menu === 'bankPayment') return <B2BUnitBankPaymentPanel b2bUnitId={b2bUnitId} />
  if (menu === 'checkPayment') return <B2BUnitCheckPaymentPanel b2bUnitId={b2bUnitId} />
  if (menu === 'promissoryNotePayment') return <B2BUnitPromissoryNotePaymentPanel b2bUnitId={b2bUnitId} />
  if (menu === 'facilityList') {
    return (
      <B2BUnitFacilityListPanel
        b2bUnitId={b2bUnitId}
        onOpenCreate={options.onOpenCreateFacility}
        onOpenEdit={options.onOpenEditFacility}
      />
    )
  }
  if (menu === 'facilityCreate') {
    return (
      <B2BUnitFacilityCreatePanel
        b2bUnitId={b2bUnitId}
        facilityId={options.editingFacilityId}
        onSaved={options.onFacilitySaved}
      />
    )
  }
  if (menu === 'elevatorList') {
    return (
      <B2BUnitElevatorListPanel
        b2bUnitId={b2bUnitId}
        onOpenCreate={options.onOpenCreateElevator}
        onOpenEdit={options.onOpenEditElevator}
      />
    )
  }
  if (menu === 'elevatorCreate') {
    return (
      <B2BUnitElevatorCreatePanel
        b2bUnitId={b2bUnitId}
        elevatorId={options.editingElevatorId}
        onSaved={options.onElevatorSaved}
      />
    )
  }
  if (menu === 'maintenanceFailureList') {
    return <B2BUnitMaintenanceFailureListPanel b2bUnitId={b2bUnitId} />
  }
  return <B2BUnitReportingPanel b2bUnitId={b2bUnitId} />
}

export function B2BUnitDetailPage() {
  const { hasAnyRole } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const parsedId = Number(id)
  const isValidId = Number.isFinite(parsedId) && parsedId > 0
  const canUseFinancePanels = hasAnyRole(['STAFF_USER'])
  const canManageFacilities = hasAnyRole(['STAFF_USER'])
  const canManageElevators = hasAnyRole(['STAFF_USER'])

  const detailQuery = useQuery({
    queryKey: ['b2bunits', 'detail', parsedId],
    queryFn: () => cariService.getUnitDetail(parsedId),
    enabled: isValidId,
  })

  const menus = useMemo(() => {
    if (detailQuery.data?.menus && detailQuery.data.menus.length > 0) {
      return detailQuery.data.menus
    }
    return FALLBACK_MENUS
  }, [detailQuery.data?.menus])

  const visibleMenus = useMemo(() => {
    return menus.filter((menu) => {
      if (menu.key === 'invoice') return canUseFinancePanels
      if (menu.key === 'accountTransactions') return canUseFinancePanels
      if (menu.key === 'collection') return canUseFinancePanels
      if (menu.key === 'payment') return canUseFinancePanels
      return true
    })
  }, [canUseFinancePanels, menus])

  const [activeMenu, setActiveMenu] = useState<DetailPanelKey>('filter')
  const [invoiceExpanded, setInvoiceExpanded] = useState(false)
  const [accountExpanded, setAccountExpanded] = useState(false)
  const [collectionExpanded, setCollectionExpanded] = useState(false)
  const [paymentExpanded, setPaymentExpanded] = useState(false)
  const [facilityExpanded, setFacilityExpanded] = useState(false)
  const [elevatorExpanded, setElevatorExpanded] = useState(false)
  const [editingFacilityId, setEditingFacilityId] = useState<number | null>(null)
  const [editingElevatorId, setEditingElevatorId] = useState<number | null>(null)

  useEffect(() => {
    const validKeys: DetailPanelKey[] = [
      ...(visibleMenus.map((menu) => menu.key) as B2BUnitDetailMenuKey[]),
      ...(canUseFinancePanels
        ? ([
            'purchaseInvoice',
            'salesInvoice',
            'manualDebit',
            'manualCredit',
            'cashCollection',
            'paytrCollection',
            'creditCardCollection',
            'bankCollection',
            'checkCollection',
            'promissoryNoteCollection',
            'cashPayment',
            'creditCardPayment',
            'bankPayment',
            'checkPayment',
            'promissoryNotePayment',
          ] as const)
        : []),
      'facilityList',
      ...(canManageFacilities ? (['facilityCreate'] as const) : []),
      'elevatorList',
      ...(canManageElevators ? (['elevatorCreate'] as const) : []),
      'maintenanceFailureList',
    ]

    if (!validKeys.includes(activeMenu)) {
      const firstVisibleMenu = visibleMenus[0]?.key
      if (firstVisibleMenu === 'invoice' && canUseFinancePanels) {
        setInvoiceExpanded(true)
        setActiveMenu('purchaseInvoice')
      } else if (firstVisibleMenu === 'accountTransactions' && canUseFinancePanels) {
        setAccountExpanded(true)
        setActiveMenu('manualDebit')
      } else if (firstVisibleMenu === 'collection' && canUseFinancePanels) {
        setCollectionExpanded(true)
        setActiveMenu('cashCollection')
      } else if (firstVisibleMenu === 'payment' && canUseFinancePanels) {
        setPaymentExpanded(true)
        setActiveMenu('cashPayment')
      } else {
        setActiveMenu((firstVisibleMenu || 'filter') as DetailPanelKey)
      }
    }
  }, [activeMenu, canManageElevators, canManageFacilities, canUseFinancePanels, visibleMenus])

  const isInvoiceChildActive = activeMenu === 'purchaseInvoice' || activeMenu === 'salesInvoice'
  const isAccountChildActive = activeMenu === 'manualDebit' || activeMenu === 'manualCredit'
  const isCollectionChildActive =
    activeMenu === 'cashCollection' ||
    activeMenu === 'paytrCollection' ||
    activeMenu === 'creditCardCollection' ||
    activeMenu === 'bankCollection' ||
    activeMenu === 'checkCollection' ||
    activeMenu === 'promissoryNoteCollection'
  const isPaymentChildActive =
    activeMenu === 'cashPayment' ||
    activeMenu === 'creditCardPayment' ||
    activeMenu === 'bankPayment' ||
    activeMenu === 'checkPayment' ||
    activeMenu === 'promissoryNotePayment'
  const isFacilityChildActive = activeMenu === 'facilityList' || activeMenu === 'facilityCreate'
  const isElevatorChildActive = activeMenu === 'elevatorList' || activeMenu === 'elevatorCreate'
  const showInvoiceChildren = canUseFinancePanels && (invoiceExpanded || isInvoiceChildActive)
  const showAccountChildren = canUseFinancePanels && (accountExpanded || isAccountChildActive)
  const showCollectionChildren = canUseFinancePanels && (collectionExpanded || isCollectionChildActive)
  const showPaymentChildren = canUseFinancePanels && (paymentExpanded || isPaymentChildActive)
  const showFacilityChildren = facilityExpanded || isFacilityChildActive
  const showElevatorChildren = elevatorExpanded || isElevatorChildActive

  const handleOpenFacilityList = () => {
    setFacilityExpanded(true)
    setActiveMenu('facilityList')
  }

  const handleOpenFacilityCreate = () => {
    setFacilityExpanded(true)
    setEditingFacilityId(null)
    setActiveMenu('facilityCreate')
  }

  const handleOpenFacilityEdit = (facilityId: number) => {
    setFacilityExpanded(true)
    setEditingFacilityId(facilityId)
    setActiveMenu('facilityCreate')
  }

  const handleFacilitySaved = () => {
    setEditingFacilityId(null)
    setActiveMenu('facilityList')
  }

  const handleOpenElevatorList = () => {
    setElevatorExpanded(true)
    setActiveMenu('elevatorList')
  }

  const handleOpenElevatorCreate = () => {
    setElevatorExpanded(true)
    setEditingElevatorId(null)
    setActiveMenu('elevatorCreate')
  }

  const handleOpenElevatorEdit = (elevatorId: number) => {
    void elevatorId
  }

  const handleElevatorSaved = () => {
    setEditingElevatorId(null)
    setActiveMenu('elevatorList')
  }

  const activeMenuLabel = useMemo(() => {
    if (activeMenu === 'purchaseInvoice' || activeMenu === 'salesInvoice') {
      return INVOICE_SUBMENU_LABELS[activeMenu]
    }
    if (activeMenu === 'manualDebit' || activeMenu === 'manualCredit') {
      return ACCOUNT_SUBMENU_LABELS[activeMenu]
    }
    if (
      activeMenu === 'cashCollection' ||
      activeMenu === 'paytrCollection' ||
      activeMenu === 'creditCardCollection' ||
      activeMenu === 'bankCollection' ||
      activeMenu === 'checkCollection' ||
      activeMenu === 'promissoryNoteCollection'
    ) {
      return COLLECTION_SUBMENU_LABELS[activeMenu]
    }
    if (
      activeMenu === 'cashPayment' ||
      activeMenu === 'creditCardPayment' ||
      activeMenu === 'bankPayment' ||
      activeMenu === 'checkPayment' ||
      activeMenu === 'promissoryNotePayment'
    ) {
      return PAYMENT_SUBMENU_LABELS[activeMenu]
    }
    if (activeMenu === 'facilityList' || activeMenu === 'facilityCreate') {
      return FACILITY_SUBMENU_LABELS[activeMenu]
    }
    if (activeMenu === 'elevatorList' || activeMenu === 'elevatorCreate') {
      return ELEVATOR_SUBMENU_LABELS[activeMenu]
    }
    if (activeMenu === 'maintenanceFailureList') {
      return MAINTENANCE_FAILURE_SUBMENU_LABELS[activeMenu]
    }
    return visibleMenus.find((item) => item.key === activeMenu)?.label || 'Detay'
  }, [activeMenu, visibleMenus])

  if (!isValidId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Geçersiz cari ID.</p>
        </CardContent>
      </Card>
    )
  }

  if (detailQuery.isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">Yükleniyor...</CardContent>
      </Card>
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cari Detay</CardTitle>
          <Button variant="outline" onClick={() => navigate('/b2bunits')}>
            Listeye Dön
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{getUserFriendlyErrorMessage(detailQuery.error)}</p>
        </CardContent>
      </Card>
    )
  }

  const detail = detailQuery.data

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>{detail.name || 'Cari Detay'}</CardTitle>
            {detail.code ? <p className="mt-1 text-sm text-muted-foreground">{detail.code}</p> : null}
          </div>
          <Button variant="outline" onClick={() => navigate('/b2bunits')}>
            Listeye Dön
          </Button>
        </CardHeader>
      </Card>

      {detail.summary ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatAmount(detail.summary.totalIncome)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gider</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatAmount(detail.summary.totalExpense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bakiye</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatAmount(detail.summary.totalBalance)}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Menü</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {visibleMenus.map((menu) => {
                if (menu.key === 'invoice') {
                return (
                  <div key={menu.key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceExpanded(true)
                        if (!isInvoiceChildActive) {
                          setActiveMenu('purchaseInvoice')
                        }
                      }}
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-sm transition',
                        isInvoiceChildActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground',
                      )}
                    >
                      {menu.label}
                    </button>

                    {showInvoiceChildren ? (
                      <div className="space-y-1 pl-3">
                        <button
                          type="button"
                          onClick={() => setActiveMenu('purchaseInvoice')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'purchaseInvoice'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Alış Yap
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('salesInvoice')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'salesInvoice'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Satış Yap
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              }

              if (menu.key === 'accountTransactions') {
                return (
                  <div key={menu.key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountExpanded(true)
                        if (!isAccountChildActive) {
                          setActiveMenu('manualDebit')
                        }
                      }}
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-sm transition',
                        isAccountChildActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground',
                      )}
                    >
                      {menu.label}
                    </button>

                    {showAccountChildren ? (
                      <div className="space-y-1 pl-3">
                        <button
                          type="button"
                          onClick={() => setActiveMenu('manualDebit')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'manualDebit'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Cari Borçlandır
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('manualCredit')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'manualCredit'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Cari Alacaklandır
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              }

              if (menu.key === 'collection') {
                return (
                  <div key={menu.key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCollectionExpanded(true)
                        if (!isCollectionChildActive) {
                          setActiveMenu('cashCollection')
                        }
                      }}
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-sm transition',
                        isCollectionChildActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground',
                      )}
                    >
                      {menu.label}
                    </button>

                    {showCollectionChildren ? (
                      <div className="space-y-1 pl-3">
                        <button
                          type="button"
                          onClick={() => setActiveMenu('cashCollection')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'cashCollection'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Nakit Tahsilat
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('paytrCollection')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'paytrCollection'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          PayTR Tahsilat
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('creditCardCollection')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'creditCardCollection'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Kredi Kartı Tahsilat
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('bankCollection')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'bankCollection'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Banka Tahsilat
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('checkCollection')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'checkCollection'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Çek Tahsilat
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('promissoryNoteCollection')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'promissoryNoteCollection'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Senet Tahsilat
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              }

              if (menu.key === 'payment') {
                return (
                  <div key={menu.key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentExpanded(true)
                        if (!isPaymentChildActive) {
                          setActiveMenu('cashPayment')
                        }
                      }}
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-sm transition',
                        isPaymentChildActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground',
                      )}
                    >
                      {menu.label}
                    </button>

                    {showPaymentChildren ? (
                      <div className="space-y-1 pl-3">
                        <button
                          type="button"
                          onClick={() => setActiveMenu('cashPayment')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'cashPayment'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Nakit Ödeme
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('creditCardPayment')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'creditCardPayment'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Kredi Kartı Ödeme
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('bankPayment')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'bankPayment'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Banka Ödeme
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('checkPayment')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'checkPayment'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Çek Ödeme
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('promissoryNotePayment')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'promissoryNotePayment'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Senet Ödeme
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              }

              return (
                <button
                  key={menu.key}
                  type="button"
                  onClick={() => setActiveMenu(menu.key)}
                  className={cn(
                    'w-full rounded-md px-3 py-2 text-left text-sm transition',
                    activeMenu === menu.key
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground',
                  )}
                >
                  {menu.label}
                </button>
              )
            })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Asansör İşlemleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setFacilityExpanded(true)
                  if (!isFacilityChildActive) {
                    setActiveMenu('facilityList')
                  }
                }}
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm transition',
                  isFacilityChildActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground',
                )}
              >
                Tesisler (Binalar)
              </button>
              {showFacilityChildren ? (
                <div className="space-y-1 pl-3">
                  <button
                    type="button"
                    onClick={handleOpenFacilityList}
                    className={cn(
                      'w-full rounded-md px-3 py-2 text-left text-sm transition',
                      activeMenu === 'facilityList'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-foreground',
                    )}
                  >
                    Tesisler (Binalar)
                  </button>
                  {canManageFacilities ? (
                    <button
                      type="button"
                      onClick={handleOpenFacilityCreate}
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-sm transition',
                        activeMenu === 'facilityCreate'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground',
                      )}
                    >
                      Tesis (Bina) Ekle
                    </button>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setElevatorExpanded(true)
                  if (!isElevatorChildActive) {
                    setActiveMenu('elevatorList')
                  }
                }}
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm transition',
                  isElevatorChildActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground',
                )}
              >
                Asansör
              </button>
              {showElevatorChildren ? (
                <div className="space-y-1 pl-3">
                  <button
                    type="button"
                    onClick={handleOpenElevatorList}
                    className={cn(
                      'w-full rounded-md px-3 py-2 text-left text-sm transition',
                      activeMenu === 'elevatorList'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-foreground',
                    )}
                  >
                    Asansörler
                  </button>
                  {canManageElevators ? (
                    <button
                      type="button"
                      onClick={handleOpenElevatorCreate}
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-sm transition',
                        activeMenu === 'elevatorCreate'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground',
                      )}
                    >
                      Asansör Ekle
                    </button>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setActiveMenu('maintenanceFailureList')}
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm transition',
                  activeMenu === 'maintenanceFailureList'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground',
                )}
              >
                Bakım-Arıza
              </button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{activeMenuLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderPanel(activeMenu, detail.id || parsedId, {
              editingFacilityId,
              editingElevatorId,
              onOpenCreateFacility: handleOpenFacilityCreate,
              onOpenEditFacility: handleOpenFacilityEdit,
              onFacilitySaved: handleFacilitySaved,
              onOpenCreateElevator: handleOpenElevatorCreate,
              onOpenEditElevator: handleOpenElevatorEdit,
              onElevatorSaved: handleElevatorSaved,
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
