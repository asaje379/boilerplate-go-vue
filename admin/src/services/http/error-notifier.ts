import { pinia } from "@/pinia";
import { getApiErrorMessage } from "@/services/http/error-messages";
import { ApiError } from "@/services/http/errors";
import { useToastStore } from "@/stores/toast";

export interface ApiErrorNotificationOptions {
  defaultErrorMessageKey?: string;
  skipErrorToast?: boolean;
}

export function notifyApiError(error: unknown, options: ApiErrorNotificationOptions = {}) {
  if (options.skipErrorToast) {
    return;
  }

  if (error instanceof ApiError && error.suppressToast) {
    return;
  }

  useToastStore(pinia).error(getApiErrorMessage(error, options.defaultErrorMessageKey));
}
