import assert from 'node:assert/strict'
import test from 'node:test'
import { canScopeAccessPath, hasScopedRole } from '../src/lib/roles'

test('platform scope can only satisfy PLATFORM_ADMIN', () => {
  assert.equal(hasScopedRole('PLATFORM_ADMIN', 'PLATFORM', 'PLATFORM_ADMIN'), true)
  assert.equal(hasScopedRole('PLATFORM_ADMIN', 'PLATFORM', 'TENANT_ADMIN'), false)
  assert.equal(hasScopedRole('PLATFORM_ADMIN', 'PLATFORM', 'STAFF_USER'), false)
})

test('tenant scope role checks stay compatible for tenant/staff/cari', () => {
  assert.equal(hasScopedRole('TENANT_ADMIN', 'TENANT', 'TENANT_ADMIN'), true)
  assert.equal(hasScopedRole('TENANT_ADMIN', 'TENANT', 'STAFF_USER'), true)
  assert.equal(hasScopedRole('STAFF_USER', 'TENANT', 'TENANT_ADMIN'), false)
  assert.equal(hasScopedRole('CARI_USER', 'TENANT', 'CARI_USER'), true)
  assert.equal(hasScopedRole('CARI_USER', 'TENANT', 'STAFF_USER'), false)
})

test('scope-based path guard blocks cross-context access', () => {
  assert.equal(canScopeAccessPath('PLATFORM', '/system-admin/tenants'), true)
  assert.equal(canScopeAccessPath('PLATFORM', '/dashboard'), false)
  assert.equal(canScopeAccessPath('PLATFORM', '/tenant-admin/users'), false)
  assert.equal(canScopeAccessPath('TENANT', '/dashboard'), true)
  assert.equal(canScopeAccessPath('TENANT', '/tenant-admin/users'), true)
  assert.equal(canScopeAccessPath('TENANT', '/system-admin/tenants'), false)
})

test('tenant-admin user management route requires tenant admin role', () => {
  assert.equal(hasScopedRole('TENANT_ADMIN', 'TENANT', 'TENANT_ADMIN'), true)
  assert.equal(hasScopedRole('STAFF_USER', 'TENANT', 'TENANT_ADMIN'), false)
  assert.equal(hasScopedRole('CARI_USER', 'TENANT', 'TENANT_ADMIN'), false)
})
