import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RevisionOfferForm } from './RevisionOfferForm'
import { revisionOfferService } from '@/services/revision-offer.service'

export function RevisionOfferFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)

  const offerQuery = useQuery({
    queryKey: ['revision-offers', 'detail', id],
    queryFn: () => revisionOfferService.getById(Number(id)),
    enabled: isEditMode,
  })

  const isReadonly =
    offerQuery.data?.status === 'REJECTED' || offerQuery.data?.status === 'CONVERTED'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={() => navigate('/revision-offers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri Dön
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? 'Revizyon Teklifi Düzenle' : 'Yeni Revizyon Teklifi Oluştur'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? 'Mevcut revizyon teklifini sayfa üzerinde düzenleyin.'
              : 'Yeni revizyon teklifini geniş çalışma alanında oluşturun.'}
          </p>
        </div>
      </div>

      {isEditMode && offerQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : null}

      {isEditMode && offerQuery.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="font-semibold text-destructive">Teklif bilgileri yüklenemedi.</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Tekrar deneyin veya liste ekranına geri dönün.
          </div>
        </div>
      ) : null}

      {isEditMode && !offerQuery.isLoading && !offerQuery.isError && isReadonly ? (
        <div className="rounded-xl border border-muted bg-muted/30 p-6">
          <div className="font-semibold">Bu revizyon teklifi salt okunur durumda.</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {offerQuery.data?.status === 'CONVERTED'
              ? 'Satışa dönüştürülen teklifler artık düzenlenemez.'
              : 'Reddedilen teklifler artık düzenlenemez.'}
          </div>
        </div>
      ) : null}

      {!offerQuery.isLoading && !offerQuery.isError && !isReadonly ? (
        <RevisionOfferForm
          offer={offerQuery.data || null}
          onCancel={() => navigate('/revision-offers')}
          onSuccess={() => navigate('/revision-offers')}
        />
      ) : null}
    </div>
  )
}
