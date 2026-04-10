import { type FormEvent, useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { ApiResponse } from '@/lib/api-response'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { userService } from '@/services/user.service'

interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type ChangePasswordFieldKey = keyof ChangePasswordForm
type ChangePasswordFieldErrors = Partial<Record<ChangePasswordFieldKey, string>>

const initialForm: ChangePasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

function validateForm(form: ChangePasswordForm): ChangePasswordFieldErrors {
  const errors: ChangePasswordFieldErrors = {}

  if (!form.currentPassword.trim()) errors.currentPassword = 'Mevcut şifre zorunludur.'
  if (!form.newPassword.trim()) errors.newPassword = 'Yeni şifre zorunludur.'
  if (!form.confirmPassword.trim()) errors.confirmPassword = 'Yeni şifre tekrar zorunludur.'
  if (form.newPassword.trim() && form.confirmPassword.trim() && form.newPassword !== form.confirmPassword) {
    errors.confirmPassword = 'Yeni şifreler eşleşmiyor.'
  }

  return errors
}

function parseFieldErrors(error: unknown): ChangePasswordFieldErrors {
  const mapped: ChangePasswordFieldErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const response = error.response?.data as ApiResponse<unknown> | undefined
  const errors = Array.isArray(response?.errors) ? response.errors : []

  errors.forEach((raw) => {
    const message = String(raw || '').toLowerCase()
    if (message.includes('currentpassword') || message.includes('current password')) {
      mapped.currentPassword = 'Mevcut şifre zorunludur.'
    }
    if (message.includes('newpassword') || message.includes('new password')) {
      mapped.newPassword = 'Yeni şifre zorunludur.'
    }
    if (message.includes('confirmpassword') || message.includes('confirm password') || message.includes('eşleş')) {
      mapped.confirmPassword = 'Yeni şifreler eşleşmiyor.'
    }
  })

  const message = String(response?.message || '').toLowerCase()
  if (message.includes('currentpassword') || message.includes('current password')) {
    mapped.currentPassword = mapped.currentPassword || 'Mevcut şifre zorunludur.'
  }
  if (message.includes('newpassword') || message.includes('new password')) {
    mapped.newPassword = mapped.newPassword || 'Yeni şifre zorunludur.'
  }
  if (
    message.includes('confirmpassword') ||
    message.includes('confirm password') ||
    message.includes('must match') ||
    message.includes('eşleş')
  ) {
    mapped.confirmPassword = mapped.confirmPassword || 'Yeni şifreler eşleşmiyor.'
  }

  return mapped
}

export function ChangePasswordPage() {
  const { toast } = useToast()
  const [form, setForm] = useState<ChangePasswordForm>(initialForm)
  const [fieldErrors, setFieldErrors] = useState<ChangePasswordFieldErrors>({})

  const mutation = useMutation({
    mutationFn: () =>
      userService.changeOwnPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      }),
    onSuccess: () => {
      setForm(initialForm)
      setFieldErrors({})
      toast({
        title: 'Başarılı',
        description: 'Şifreniz başarıyla güncellendi.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mapped = parseFieldErrors(error)
      if (Object.keys(mapped).length > 0) setFieldErrors(mapped)
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const setField = <K extends ChangePasswordFieldKey>(key: K, value: ChangePasswordForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const errors = validateForm(form)
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    mutation.mutate()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Şifre Değiştir</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5 md:max-w-xl" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="change-password-current">Mevcut Şifre</Label>
            <Input
              id="change-password-current"
              type="password"
              value={form.currentPassword}
              onChange={(event) => setField('currentPassword', event.target.value)}
              className={fieldErrors.currentPassword ? 'border-destructive' : ''}
            />
            {fieldErrors.currentPassword ? <p className="text-sm text-destructive">{fieldErrors.currentPassword}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="change-password-new">Yeni Şifre</Label>
            <Input
              id="change-password-new"
              type="password"
              value={form.newPassword}
              onChange={(event) => setField('newPassword', event.target.value)}
              className={fieldErrors.newPassword ? 'border-destructive' : ''}
            />
            {fieldErrors.newPassword ? <p className="text-sm text-destructive">{fieldErrors.newPassword}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="change-password-confirm">Yeni Şifre Tekrar</Label>
            <Input
              id="change-password-confirm"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setField('confirmPassword', event.target.value)}
              className={fieldErrors.confirmPassword ? 'border-destructive' : ''}
            />
            {fieldErrors.confirmPassword ? <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p> : null}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
