import assert from 'node:assert/strict'
import test from 'node:test'
import { hasAnyRole, normalizeRole, resolveRoleFromAuthSource, roleSatisfies, toEffectiveRole } from '../src/lib/roles'

test('legacy system_admin maps to PLATFORM_ADMIN', () => {
  assert.equal(normalizeRole('system_admin'), 'PLATFORM_ADMIN')
  assert.equal(normalizeRole('SYSTEM_ADMIN'), 'PLATFORM_ADMIN')
})

test('legacy staff_admin maps to TENANT_ADMIN', () => {
  assert.equal(normalizeRole('staff_admin'), 'TENANT_ADMIN')
  assert.equal(normalizeRole('STAFF_ADMIN'), 'TENANT_ADMIN')
  assert.equal(normalizeRole('STAFF_USER'), 'STAFF_USER')
  assert.equal(normalizeRole('CARI_USER'), 'CARI_USER')
})

test('canonical roles are preserved', () => {
  assert.equal(normalizeRole('PLATFORM_ADMIN'), 'PLATFORM_ADMIN')
  assert.equal(normalizeRole('TENANT_ADMIN'), 'TENANT_ADMIN')
  assert.equal(normalizeRole('STAFF_USER'), 'STAFF_USER')
  assert.equal(normalizeRole('CARI_USER'), 'CARI_USER')
  assert.equal(normalizeRole('ROLE_PLATFORM_ADMIN'), 'PLATFORM_ADMIN')
})

test('authorization checks remain stable for canonical/legacy inputs', () => {
  const platformAdmin = normalizeRole('system_admin')
  const tenantAdmin = normalizeRole('staff_admin')
  const staffUser = normalizeRole('staff_user')

  assert.equal(roleSatisfies(platformAdmin, 'PLATFORM_ADMIN'), true)
  assert.equal(roleSatisfies(tenantAdmin, 'PLATFORM_ADMIN'), false)
  assert.equal(hasAnyRole(staffUser, ['STAFF_USER', 'CARI_USER']), true)
  assert.equal(hasAnyRole(staffUser, ['TENANT_ADMIN']), false)
  assert.equal(hasAnyRole(tenantAdmin, ['staff_admin']), true)
})

test('effective role always returns canonical role values', () => {
  assert.equal(toEffectiveRole('system_admin'), 'PLATFORM_ADMIN')
  assert.equal(toEffectiveRole('ROLE_TENANT_ADMIN'), 'TENANT_ADMIN')
})

test('role can be resolved from authorities/roles claims list', () => {
  assert.equal(
    resolveRoleFromAuthSource({ authorities: [{ authority: 'ROLE_PLATFORM_ADMIN' }] }),
    'PLATFORM_ADMIN'
  )
  assert.equal(
    resolveRoleFromAuthSource({ roles: ['STAFF_ADMIN'] }),
    'TENANT_ADMIN'
  )
})
