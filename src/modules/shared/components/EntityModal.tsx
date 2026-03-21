import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'

interface EntityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  onSubmit: () => void
  submitLabel?: string
  pending?: boolean
}

export function EntityModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Kaydet',
  pending,
}: EntityModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-3">{children}</div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)} disabled={pending}>İptal</Button>
          <Button className="w-full sm:w-auto" onClick={onSubmit} disabled={pending}>{pending ? 'Kaydediliyor...' : submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
