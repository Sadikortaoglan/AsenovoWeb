import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export type RevisionStandardAdminStandard = {
  id: number
  standardCode: string
  articleCount: number
}

export type RevisionStandardArticle = {
  id: number
  articleNo: string
  description: string
  tagColor: string | null
  price: number | null
}

export type RevisionStandardArticlePayload = {
  articleNo: string
  description: string
  tagColor: string | null
  price: number | null
}

export type RevisionStandardImportResult = {
  filesProcessed: number
  articlesParsed: number
  articlesInserted: number
  articlesUpdated: number
  errors: string[] | null
}

function mapStandard(raw: Record<string, unknown>): RevisionStandardAdminStandard {
  return {
    id: Number(raw.id || 0),
    standardCode: String(raw.standardCode || raw.standard_code || ''),
    articleCount: Number(raw.articleCount || raw.article_count || 0),
  }
}

function mapArticle(raw: Record<string, unknown>): RevisionStandardArticle {
  return {
    id: Number(raw.id || 0),
    articleNo: String(raw.articleNo || raw.article_no || ''),
    description: String(raw.description || ''),
    tagColor: raw.tagColor == null ? null : String(raw.tagColor),
    price:
      raw.price === null || raw.price === undefined || raw.price === ''
        ? null
        : Number(raw.price),
  }
}

function mapImportResult(raw: Record<string, unknown>): RevisionStandardImportResult {
  return {
    filesProcessed: Number(raw.filesProcessed || raw.files_processed || 0),
    articlesParsed: Number(raw.articlesParsed || raw.articles_parsed || 0),
    articlesInserted: Number(raw.articlesInserted || raw.articles_inserted || 0),
    articlesUpdated: Number(raw.articlesUpdated || raw.articles_updated || 0),
    errors: Array.isArray(raw.errors) ? raw.errors.map((item) => String(item)) : null,
  }
}

export const revisionStandardsAdminService = {
  async getRevisionStandards(params: {
    page?: number
    size?: number
    query?: string
  }): Promise<SpringPage<RevisionStandardAdminStandard>> {
    const page = await getPage<unknown>('/admin/revision-standards/standards', {
      page: (params.page ?? 0) + 1,
      size: params.size ?? 25,
      query: params.query,
    })

    return {
      ...page,
      content: page.content.map((item) => mapStandard(item as Record<string, unknown>)),
    }
  },

  async getRevisionStandard(id: number): Promise<RevisionStandardAdminStandard> {
    const { data } = await apiClient.get<ApiResponse<unknown> | unknown>(`/admin/revision-standards/standards/${id}`)
    return mapStandard(unwrapResponse(data) as Record<string, unknown>)
  },

  async createRevisionStandard(payload: { standardCode: string }): Promise<RevisionStandardAdminStandard> {
    const { data } = await apiClient.post<ApiResponse<unknown> | unknown>('/admin/revision-standards/standards', payload)
    return mapStandard(unwrapResponse(data) as Record<string, unknown>)
  },

  async updateRevisionStandard(id: number, payload: { standardCode: string }): Promise<RevisionStandardAdminStandard> {
    const { data } = await apiClient.put<ApiResponse<unknown> | unknown>(`/admin/revision-standards/standards/${id}`, payload)
    return mapStandard(unwrapResponse(data) as Record<string, unknown>)
  },

  async deleteRevisionStandard(id: number): Promise<void> {
    await apiClient.delete(`/admin/revision-standards/standards/${id}`)
  },

  async getRevisionStandardArticles(
    standardId: number,
    params: { query?: string; tagColor?: string; minPrice?: number; maxPrice?: number; page?: number; size?: number }
  ): Promise<SpringPage<RevisionStandardArticle>> {
    const page = await getPage<unknown>(`/admin/revision-standards/standards/${standardId}/articles`, {
      query: params.query,
      tagColor: params.tagColor,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      page: (params.page ?? 0) + 1,
      size: params.size ?? 25,
    })

    return {
      ...page,
      content: page.content.map((item) => mapArticle(item as Record<string, unknown>)),
    }
  },

  async createRevisionStandardArticle(
    standardId: number,
    payload: RevisionStandardArticlePayload
  ): Promise<RevisionStandardArticle> {
    const { data } = await apiClient.post<ApiResponse<unknown> | unknown>(
      `/admin/revision-standards/standards/${standardId}/articles`,
      payload
    )
    return mapArticle(unwrapResponse(data) as Record<string, unknown>)
  },

  async updateRevisionStandardArticle(articleId: number, payload: RevisionStandardArticlePayload): Promise<RevisionStandardArticle> {
    const { data } = await apiClient.put<ApiResponse<unknown> | unknown>(
      `/admin/revision-standards/articles/${articleId}`,
      payload
    )
    return mapArticle(unwrapResponse(data) as Record<string, unknown>)
  },

  async deleteRevisionStandardArticle(articleId: number): Promise<void> {
    await apiClient.delete(`/admin/revision-standards/articles/${articleId}`)
  },

  async importRevisionStandards(): Promise<RevisionStandardImportResult> {
    const { data } = await apiClient.post<ApiResponse<unknown> | unknown>('/admin/revision-standards/import')
    return mapImportResult(unwrapResponse(data) as Record<string, unknown>)
  },
}
