import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { QrCodeItem } from '../qr-codes.service'
import { QrCodePreviewImage } from './QrCodePreviewImage'

interface QrCodeItemCardProps {
  item: QrCodeItem
  onPrint: (item: QrCodeItem) => void
}

export function QrCodeItemCard({ item, onPrint }: QrCodeItemCardProps) {
  return (
    <Card className="qr-codes-card">
      <CardContent className="qr-codes-card__content">
        <div className="qr-codes-card__image-wrap">
          {item.hasQr ? (
            <QrCodePreviewImage
              src={item.qrImageUrl}
              alt={`${item.elevatorName} QR`}
              className="qr-codes__image"
            />
          ) : (
            <div className="qr-codes__image qr-codes__image--empty" aria-label={`${item.elevatorName} QR yok`}>
              QR yok
            </div>
          )}
        </div>

        <div className="qr-codes-card__info">
          <p className="qr-codes-card__label">Asansör</p>
          <p className="qr-codes-card__value">{item.elevatorName}</p>

          <p className="qr-codes-card__label">Tesis(Bina)</p>
          <p className="qr-codes-card__value">{item.buildingName}</p>

          <p className="qr-codes-card__label">Cari</p>
          <p className="qr-codes-card__value">{item.customerName}</p>
        </div>

        <div className="qr-codes-card__actions">
          <Button type="button" variant="outline" className="qr-codes__button qr-codes__button--muted qr-codes__button--full" onClick={() => onPrint(item)}>
            Yazdır
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
