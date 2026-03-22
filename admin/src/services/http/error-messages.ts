import type { ApiErrorCode } from '@/types/api'
import { ApiError } from '@/services/http/errors'
import { i18n } from '@/lib/i18n'

const codeToKey: Record<ApiErrorCode, string> = {
  BAD_REQUEST: 'errors.api.badRequest',
  CONFLICT: 'errors.api.conflict',
  FORBIDDEN: 'errors.api.forbidden',
  INTERNAL_ERROR: 'errors.api.internalError',
  NETWORK_ERROR: 'errors.api.networkError',
  NOT_FOUND: 'errors.api.notFound',
  UNAUTHORIZED: 'errors.api.unauthorized',
  VALIDATION_ERROR: 'errors.api.validationError',
}

/**
 * Returns a user-friendly, translated error message for any caught error.
 * Prefers the i18n mapping of ApiError.code, falls back to a provided
 * default key, and finally falls back to a generic error message.
 */
export function getApiErrorMessage(error: unknown, defaultKey?: string): string {
  const { t } = i18n.global

  if (error instanceof ApiError) {
    const key = codeToKey[error.code]
    if (key) {
      return t(key)
    }
  }

  if (defaultKey) {
    return t(defaultKey)
  }

  return t('errors.api.unknown')
}

/**
 * Extracts field-level validation errors from an ApiError, if present.
 * Returns a Record suitable for VeeValidate's `setErrors()`.
 */
export function getApiFieldErrors(error: unknown): Record<string, string> | null {
  if (!(error instanceof ApiError) || !error.details?.fields) {
    return null
  }

  const result: Record<string, string> = {}

  for (const [field, messages] of Object.entries(error.details.fields)) {
    const firstMessage = Array.isArray(messages) ? messages[0] : undefined

    if (typeof firstMessage === 'string') {
      result[field] = firstMessage
    }
  }

  return Object.keys(result).length > 0 ? result : null
}
