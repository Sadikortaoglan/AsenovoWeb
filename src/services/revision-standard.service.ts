import apiClient from '@/lib/api'

export type RevisionStandardSearchResult = {
  id: number
  articleNo: string
  description: string
  standardCode: string
  tagColor: string | null
}

function mapRevisionStandardFromBackend(raw: Record<string, unknown>): RevisionStandardSearchResult {
  return {
    id: Number(raw.id || 0),
    articleNo: String(raw.articleNo || raw.article_no || ''),
    description: String(raw.description || ''),
    standardCode: String(raw.standardCode || raw.standard_code || ''),
    tagColor: raw.tagColor == null ? null : String(raw.tagColor),
  }
}

export const revisionStandardService = {
  async search(query: string, limit = 20): Promise<RevisionStandardSearchResult[]> {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return []

    const normalizedLimit = Math.min(Math.max(limit, 1), 50)
    const { data } = await apiClient.get<unknown[]>('/revision-standards/search', {
      params: {
        q: trimmedQuery,
        limit: normalizedLimit,
      },
    })

    if (!Array.isArray(data)) return []
    return data.map((item) => mapRevisionStandardFromBackend(item as Record<string, unknown>))
  },
}
