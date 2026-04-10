import { useEffect, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { ApiResponse } from '@/lib/api-response'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { useAuth } from '@/contexts/AuthContext'
import { companySettingsService } from './company-settings.service'

interface FieldErrors {
  companyName?: string
  logo?: string
}

function parseFieldErrors(error: unknown): FieldErrors {
  const mapped: FieldErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const response = error.response?.data as ApiResponse<unknown> | undefined
  const errors = Array.isArray(response?.errors) ? response?.errors : []

  errors.forEach((raw) => {
    const message = String(raw || '').toLowerCase()
    if (message.includes('companyname') || message.includes('company name') || message.includes('firma')) {
      mapped.companyName = 'Firma adı zorunludur.'
    }
    if (message.includes('logo') || message.includes('file') || message.includes('image')) {
      mapped.logo = 'Logo dosyası geçersiz.'
    }
  })

  const message = String(response?.message || '').toLowerCase()
  if (message.includes('companyname') || message.includes('company name') || message.includes('firma')) {
    mapped.companyName = mapped.companyName || 'Firma adı zorunludur.'
  }
  if (message.includes('logo') || message.includes('file') || message.includes('image')) {
    mapped.logo = mapped.logo || 'Logo dosyası geçersiz.'
  }

  return mapped
}

export function CompanySettingsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { setTenantBranding } = useAuth()

  const [companyName, setCompanyName] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const settingsQuery = useQuery({
    queryKey: ['tenant-branding'],
    queryFn: () => companySettingsService.get(),
  })

  useEffect(() => {
    if (!settingsQuery.data) return
    setCompanyName(settingsQuery.data.companyName || '')
    setTenantBranding({
      tenantName: settingsQuery.data.companyName || null,
      tenantLogoUrl: settingsQuery.data.logoUrl || null,
    })
  }, [settingsQuery.data, setTenantBranding])

  const logoPreviewUrl = useMemo(() => {
    if (!logoFile) return null
    return URL.createObjectURL(logoFile)
  }, [logoFile])

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl)
      }
    }
  }, [logoPreviewUrl])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = companyName.trim()
      const currentName = settingsQuery.data?.companyName?.trim() || ''
      let latest = settingsQuery.data || null

      if (trimmedName && trimmedName !== currentName) {
        latest = await companySettingsService.update({ companyName: trimmedName })
      }

      if (logoFile) {
        latest = await companySettingsService.updateLogo(logoFile)
      }

      return latest
    },
    onSuccess: (updated) => {
      const safeName = updated?.companyName?.trim() || companyName.trim()
      const safeLogo = updated?.logoUrl ?? settingsQuery.data?.logoUrl ?? null

      setLogoFile(null)
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['tenant-branding'] })
      setTenantBranding({
        tenantName: safeName || null,
        tenantLogoUrl: safeLogo,
      })

      toast({
        title: 'Başarılı',
        description: 'Firma ayarları güncellendi.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mapped = parseFieldErrors(error)
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped)
      }
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const handleSave = () => {
    const trimmedName = companyName.trim()
    const currentName = settingsQuery.data?.companyName?.trim() || ''
    const hasNameChange = trimmedName !== currentName
    const hasLogoChange = Boolean(logoFile)

    const nextErrors: FieldErrors = {}
    if (!trimmedName) {
      nextErrors.companyName = 'Firma adı zorunludur.'
    }
    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    if (!hasNameChange && !hasLogoChange) {
      toast({
        title: 'Bilgi',
        description: 'Kaydedilecek bir değişiklik bulunamadı.',
      })
      return
    }

    saveMutation.mutate()
  }

  const currentLogo = logoPreviewUrl || settingsQuery.data?.logoUrl || ''

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Firma Ayarları</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {settingsQuery.isLoading ? <p className="text-sm text-muted-foreground">Ayarlar yükleniyor...</p> : null}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company-settings-name">Firma Adı</Label>
            <Input
              id="company-settings-name"
              value={companyName}
              placeholder="Firma Adı Girin"
              onChange={(event) => {
                setCompanyName(event.target.value)
                setFieldErrors((prev) => ({ ...prev, companyName: undefined }))
              }}
              className={fieldErrors.companyName ? 'border-destructive' : ''}
            />
            {fieldErrors.companyName ? <p className="text-sm text-destructive">{fieldErrors.companyName}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-settings-logo">Logo</Label>
            {currentLogo ? (
              <div className="rounded-md border bg-white p-3">
                <img src={currentLogo} alt="Firma logosu" className="h-14 w-auto object-contain" />
              </div>
            ) : (
              <div className="rounded-md border border-dashed px-3 py-5 text-sm text-muted-foreground">
                Logo yüklenmedi.
              </div>
            )}
            <Input
              id="company-settings-logo"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={(event) => {
                const selected = event.target.files?.[0] || null
                setLogoFile(selected)
                setFieldErrors((prev) => ({ ...prev, logo: undefined }))
              }}
              className={fieldErrors.logo ? 'border-destructive' : ''}
            />
            <p className="text-xs text-muted-foreground">PNG, JPG veya SVG (maks. 2MB)</p>
            {fieldErrors.logo ? <p className="text-sm text-destructive">{fieldErrors.logo}</p> : null}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={settingsQuery.isLoading || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

