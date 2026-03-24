import assert from 'node:assert/strict'
import test from 'node:test'
import { hasScopedRole, type AnyRole, type AppRole, type AuthScopeType } from '../src/lib/roles'

type MenuVisibilityCase = {
  title: string
  roles: readonly AnyRole[]
}

const menuCases: MenuVisibilityCase[] = [
  { title: 'Sistem Yönetimi', roles: ['PLATFORM_ADMIN'] },
  { title: 'Asansörler', roles: ['TENANT_ADMIN', 'STAFF_USER'] },
  { title: 'Kullanıcılar', roles: ['TENANT_ADMIN'] },
  { title: 'Cari Bilgilerim', roles: ['CARI_USER'] },
]

function getVisibleMenus(userRole: AppRole, authScopeType: AuthScopeType): string[] {
  return menuCases
    .filter((item) => item.roles.some((role) => hasScopedRole(userRole, authScopeType, role)))
    .map((item) => item.title)
}

test('platform admin sees only platform menu sections by default', () => {
  const visible = getVisibleMenus('PLATFORM_ADMIN', 'PLATFORM')
  assert.deepEqual(visible, ['Sistem Yönetimi'])
})

test('tenant roles do not see platform-only menu section', () => {
  const tenantVisible = getVisibleMenus('TENANT_ADMIN', 'TENANT')
  const staffVisible = getVisibleMenus('STAFF_USER', 'TENANT')
  const cariVisible = getVisibleMenus('CARI_USER', 'TENANT')

  assert.equal(tenantVisible.includes('Sistem Yönetimi'), false)
  assert.equal(staffVisible.includes('Sistem Yönetimi'), false)
  assert.equal(cariVisible.includes('Sistem Yönetimi'), false)
})

test('tenant-admin user management menu is hidden for staff and cari roles', () => {
  const tenantVisible = getVisibleMenus('TENANT_ADMIN', 'TENANT')
  const staffVisible = getVisibleMenus('STAFF_USER', 'TENANT')
  const cariVisible = getVisibleMenus('CARI_USER', 'TENANT')

  assert.equal(tenantVisible.includes('Kullanıcılar'), true)
  assert.equal(staffVisible.includes('Kullanıcılar'), false)
  assert.equal(cariVisible.includes('Kullanıcılar'), false)
})
