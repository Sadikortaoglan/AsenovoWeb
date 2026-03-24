import assert from 'node:assert/strict'
import test from 'node:test'

test('tenant and platform login both use /auth/login endpoint', async () => {
  const { default: apiClient } = await import('../src/lib/api')
  const { authService } = await import('../src/services/auth.service')

  const originalPost = apiClient.post.bind(apiClient)
  const calledUrls: string[] = []

  ;(apiClient as any).post = async (url: string) => {
    calledUrls.push(url)
    return {
      data: {
        success: true,
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          userId: 1,
          username: 'platformadmin',
          role: 'PLATFORM_ADMIN',
        },
      },
    }
  }

  try {
    await authService.login({ username: 'tenant', password: '123456' })
    await authService.platformLogin({ username: 'platform', password: '123456' })
    assert.deepEqual(calledUrls, ['/auth/login', '/auth/login'])
  } finally {
    ;(apiClient as any).post = originalPost
  }
})
