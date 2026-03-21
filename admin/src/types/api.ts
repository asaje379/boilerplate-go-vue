export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'

export interface ApiFieldErrors {
  [field: string]: string[]
}

export interface ApiErrorPayload {
  code: ApiErrorCode
  details?: {
    fields?: ApiFieldErrors
    [key: string]: unknown
  }
  message: string
  status: number
}

export interface PaginationMeta {
  limit: number
  page: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  total: number
  totalPages: number
}

export interface PaginatedResponse<TItem> {
  items: TItem[]
  meta: PaginationMeta
}

export interface ListQueryParams {
  limit?: number
  page?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
