import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { warningService, type GroupedWarning } from '@/services/warning.service'
import { elevatorService } from '@/services/elevator.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, Search, ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import { TableResponsive } from '@/components/ui/table-responsive'

export function WarningsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  const { data: groupedWarnings, isLoading } = useQuery({
    queryKey: ['warnings', 'grouped'],
    queryFn: () => warningService.getGrouped(),
  })

  const { data: elevators } = useQuery({
    queryKey: ['elevators'],
    queryFn: () => elevatorService.getAll(),
  })

  const groupedWarningsArray = Array.isArray(groupedWarnings) ? groupedWarnings : []
  const elevatorsArray = Array.isArray(elevators) ? elevators : []

  const handleViewElevator = (identityNo: string) => {
    console.log('👁 View elevator clicked:', identityNo)
    
    const elevator = elevatorsArray.find((e) => e.kimlikNo === identityNo)
    
    if (elevator) {
      console.log('✅ Found elevator with ID:', elevator.id)
      navigate(`/elevators/${elevator.id}`)
    } else {
      console.warn('⚠️ Elevator not found with identityNo:', identityNo)
    }
  }

  const toggleBuilding = (buildingKey: string) => {
    setExpandedBuildings((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(buildingKey)) {
        newSet.delete(buildingKey)
      } else {
        newSet.add(buildingKey)
      }
      return newSet
    })
  }

  const filterGroupedWarnings = (warnings: GroupedWarning[]) => {
    if (!searchTerm.trim()) {
      return warnings
    }

    const searchLower = searchTerm.toLowerCase().trim()
    return warnings.filter((warning) => {
      const buildingName = warning.buildingName.toLowerCase()
      const address = warning.address.toLowerCase()
      const hasMatchingElevator = warning.elevators.some((elevator) =>
        elevator.identityNo.toLowerCase().includes(searchLower)
      )

      return (
        buildingName.includes(searchLower) ||
        address.includes(searchLower) ||
        hasMatchingElevator
      )
    })
  }

  const filteredWarnings = filterGroupedWarnings(groupedWarningsArray)
  const expiredWarnings = filteredWarnings.filter((w) => w.status === 'EXPIRED')
  const warningWarnings = filteredWarnings.filter((w) => w.status === 'WARNING')

  const getWarningColumns = (status: 'EXPIRED' | 'WARNING') => [
    {
      key: 'identityNo',
      header: 'Kimlik No',
      mobileLabel: 'Kimlik No',
      mobilePriority: 10,
      render: (row: any) => <span className="font-medium">{row.identityNo}</span>,
      exportValue: (row: any) => row.identityNo || '',
    },
    {
      key: 'maintenanceEndDate',
      header: 'Bitiş Tarihi',
      mobileLabel: 'Bitiş Tarihi',
      mobilePriority: 9,
      render: (row: any) => (row.maintenanceEndDate ? formatDateShort(row.maintenanceEndDate) : '-'),
      exportValue: (row: any) => (row.maintenanceEndDate ? formatDateShort(row.maintenanceEndDate) : '-'),
    },
    {
      key: 'status',
      header: 'Durum',
      mobileLabel: 'Durum',
      mobilePriority: 8,
      render: () => (
        <Badge variant={status === 'EXPIRED' ? 'expired' : 'warning'}>
          {status === 'EXPIRED' ? 'Süresi Geçti' : '30 Gün Kaldı'}
        </Badge>
      ),
      exportValue: () => (status === 'EXPIRED' ? 'Süresi Geçti' : '30 Gün Kaldı'),
    },
    {
      key: 'actions',
      header: 'İşlem',
      mobileLabel: 'İşlem',
      mobilePriority: 7,
      render: (row: any) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 sm:h-10 sm:w-10 min-h-[44px] min-w-[44px] cursor-pointer hover:bg-red-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            handleViewElevator(row.identityNo)
          }}
          title={`${row.identityNo} detaylarını görüntüle`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
      exportable: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Uyarılar</h1>
        <p className="text-muted-foreground">Süresi geçen ve uyarı veren asansörler</p>
      </div>

      <Tabs defaultValue="expired" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expired" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Süresi Geçenler ({expiredWarnings.length})
          </TabsTrigger>
          <TabsTrigger value="warning" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            30 Gün Kalanlar ({warningWarnings.length})
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Bina adı veya kimlik no ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="expired" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Süresi Geçen Asansörler</CardTitle>
              <CardDescription>Bakım süresi geçmiş asansörlerin listesi</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : expiredWarnings.length > 0 ? (
                <div className="space-y-2">
                  {expiredWarnings.map((warning, index) => {
                    const buildingKey = `expired-${warning.buildingName}-${warning.address}-${index}`
                    const isExpanded = expandedBuildings.has(buildingKey)
                    const elevatorCount = warning.elevators.length

                    return (
                      <div key={buildingKey} className="rounded-md border border-red-200 bg-red-50/50">
                        <div
                          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-red-100/50 transition-colors"
                          onClick={() => toggleBuilding(buildingKey)}
                        >
                          <div className="flex items-center justify-center w-6 h-6">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-red-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
                            <div>
                              <p className="font-medium text-red-900 text-sm sm:text-base">{warning.buildingName}</p>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-muted-foreground">{warning.address}</p>
                            </div>
                            <div>
                              <Badge variant="expired" className="text-xs">Süresi Geçti</Badge>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {elevatorCount} {elevatorCount === 1 ? 'asansör' : 'asansör'}
                              </p>
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-red-200 bg-white">
                            <div className="p-4">
                  <TableResponsive
                    data={warning.elevators.map((elevator, elevatorIndex) => ({
                      ...elevator,
                      rowIndex: elevatorIndex,
                    }))}
                    keyExtractor={(row: any) => `${buildingKey}-${row.rowIndex}`}
                    columns={getWarningColumns('EXPIRED')}
                    tableTitle={`${warning.buildingName} Süresi Geçti`}
                    className="w-full"
                    pageSize={10}
                  />
                </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : searchTerm.trim() ? (
                <p className="text-center text-muted-foreground">Sonuç bulunamadı.</p>
              ) : (
                <p className="text-center text-muted-foreground">
                  Süresi geçen asansör bulunmamaktadır.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>30 Gün Kalan Asansörler</CardTitle>
              <CardDescription>Bakım süresi yaklaşan asansörlerin listesi</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : warningWarnings.length > 0 ? (
                <div className="space-y-2">
                  {warningWarnings.map((warning, index) => {
                    const buildingKey = `warning-${warning.buildingName}-${warning.address}-${index}`
                    const isExpanded = expandedBuildings.has(buildingKey)
                    const elevatorCount = warning.elevators.length

                    return (
                      <div key={buildingKey} className="rounded-md border border-orange-200 bg-orange-50/50">
                        <div
                          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-orange-100/50 transition-colors"
                          onClick={() => toggleBuilding(buildingKey)}
                        >
                          <div className="flex items-center justify-center w-6 h-6">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-orange-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-orange-600" />
                            )}
                          </div>
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
                            <div>
                              <p className="font-medium text-orange-900 text-sm sm:text-base">{warning.buildingName}</p>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-muted-foreground">{warning.address}</p>
                            </div>
                            <div>
                              <Badge variant="warning" className="text-xs">30 Gün Kaldı</Badge>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {elevatorCount} {elevatorCount === 1 ? 'asansör' : 'asansör'}
                              </p>
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-orange-200 bg-white">
                            <div className="p-4">
                  <TableResponsive
                    data={warning.elevators.map((elevator, elevatorIndex) => ({
                      ...elevator,
                      rowIndex: elevatorIndex,
                    }))}
                    keyExtractor={(row: any) => `${buildingKey}-${row.rowIndex}`}
                    columns={getWarningColumns('WARNING')}
                    tableTitle={`${warning.buildingName} 30 Gün Kalan`}
                    className="w-full"
                    pageSize={10}
                  />
                </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : searchTerm.trim() ? (
                <p className="text-center text-muted-foreground">Sonuç bulunamadı.</p>
              ) : (
                <p className="text-center text-muted-foreground">
                  30 gün içinde süresi dolacak asansör bulunmamaktadır.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
