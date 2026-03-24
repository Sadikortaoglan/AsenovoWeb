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

test('tenant-admin users list service calls tenant-admin endpoint and maps user rows', async () => {
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
      location: { hostname: 'tenant.asenovo.local' },
      dispatchEvent: () => true,
    },
  })

  const { default: apiClient } = await import('../src/lib/api')
  const { userService } = await import('../src/services/user.service')

  const originalGet = apiClient.get.bind(apiClient)
  ;(apiClient as any).get = async (url: string, config?: any) => {
    assert.equal(url, '/tenant-admin/users')
    assert.equal(config?.params?.search, 'ahmet')
    assert.equal(config?.params?.role, 'CARI_USER')
    assert.equal(config?.params?.enabled, true)

    return {
      data: {
        success: true,
        data: {
          content: [
            {
              id: 42,
              username: 'ahmet.cari',
              role: 'CARI_USER',
              enabled: true,
              linkedB2BUnitId: 7,
              linkedB2BUnitName: 'Deneme Cari',
            },
          ],
          number: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        },
      },
    }
  }

  try {
    const result = await userService.listTenantUsers({
      page: 0,
      size: 20,
      search: 'ahmet',
      role: 'CARI_USER',
      enabled: true,
    })

    assert.equal(result.content.length, 1)
    assert.equal(result.content[0].role, 'CARI_USER')
    assert.equal(result.content[0].linkedB2BUnitName, 'Deneme Cari')
    assert.equal(result.totalElements, 1)
  } finally {
    ;(apiClient as any).get = originalGet
  }
})
