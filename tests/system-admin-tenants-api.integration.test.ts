import assert from 'node:assert/strict'
import test from 'node:test'

class MemoryStorage {
  private store = new Map<string, string>()

  get length() {
    return this.store.size
  }

  clear() {
    this.store.clear()
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
}

test('system-admin tenants request keeps bearer token for platform admin session', async () => {
  const localStorage = new MemoryStorage()
  const sessionStorage = new MemoryStorage()

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: localStorage,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    writable: true,
    value: sessionStorage,
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      location: { hostname: 'localhost' },
      dispatchEvent: () => true,
    },
  })

  const { getAccessTokenKey } = await import('../src/lib/tenant')
  localStorage.setItem(getAccessTokenKey('default'), 'platform-admin-token')

  const { default: apiClient } = await import('../src/lib/api')
  const handlers = (apiClient.interceptors.request as any).handlers
  const requestFulfilled = handlers[0]?.fulfilled as (config: any) => Promise<any>

  assert.equal(typeof requestFulfilled, 'function')

  const configured = await requestFulfilled({
    url: '/system-admin/tenants',
    method: 'get',
    headers: {},
  })

  assert.equal(configured.headers.Authorization, 'Bearer platform-admin-token')
})

test('system-admin tenants service returns rows on successful response', async () => {
  const { default: apiClient } = await import('../src/lib/api')
  const { systemAdminService } = await import('../src/modules/system-admin/system-admin.service')

  const originalGet = apiClient.get.bind(apiClient)
  ;(apiClient as any).get = async (url: string) => {
    assert.equal(url, '/system-admin/tenants')
    return {
      data: {
        success: true,
        data: [
          {
            id: 1,
            companyName: 'Asenovo',
            subdomain: 'asenovo',
            schemaName: 'asenovo_schema',
            planType: 'ENTERPRISE',
            status: 'ACTIVE',
          },
        ],
      },
    }
  }

  try {
    const rows = await systemAdminService.listTenants()
    assert.equal(rows.length, 1)
    assert.equal(rows[0].id, 1)
    assert.equal(rows[0].companyName, 'Asenovo')
  } finally {
    ;(apiClient as any).get = originalGet
  }
})
