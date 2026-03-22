import type { ApiErrorCode, ApiErrorPayload } from '@/types/api'

const statusCodeMap: Record<number, ApiErrorCode> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
}

export class ApiError extends Error {
  code: ApiErrorCode
  details?: ApiErrorPayload['details']
  status: number
  suppressToast: boolean

  constructor(payload: ApiErrorPayload) {
    super(payload.message)
    this.name = 'ApiError'
    this.code = payload.code
    this.details = payload.details
    this.status = payload.status
    this.suppressToast = false
  }
}

export function createApiError(status: number, payload?: unknown) {
  if (payload instanceof ApiError) {
    return payload
  }

  if (payload && typeof payload === 'object' && 'error' in payload) {
    const message = typeof payload.error === 'string' ? payload.error : 'Request failed'
    const code = 'code' in payload && typeof payload.code === 'string' ? payload.code : statusCodeMap[status]
    const details: ApiErrorPayload['details'] =
      'details' in payload && payload.details && typeof payload.details === 'object'
        ? (payload.details as ApiErrorPayload['details'])
        : undefined

    return new ApiError({
      code: (code as ApiErrorCode | undefined) || 'INTERNAL_ERROR',
      details,
      message,
      status,
    })
  }

  return new ApiError({
    code: statusCodeMap[status] || 'INTERNAL_ERROR',
    message: 'Request failed',
    status,
  })
}

export function createNetworkError(message = 'Network error') {
  return new ApiError({
    code: 'NETWORK_ERROR',
    message,
    status: 0,
  })
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function suppressApiErrorToast(error: unknown) {
  if (error instanceof ApiError) {
    error.suppressToast = true
  }

  return error
}
