export const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

export function isValidWhatsAppPhone(value?: string | null) {
  const normalized = (value || "").trim();
  if (!normalized) {
    return true;
  }
  return E164_PHONE_REGEX.test(normalized);
}

export function sanitizePhoneDigits(value?: string | null) {
  return String(value || "").replace(/\D+/g, "");
}

export function normalizeLocalPhoneToE164(localValue: string | null | undefined, dialCode: string | null | undefined) {
  const normalizedDialCode = String(dialCode || "").trim();
  if (!normalizedDialCode.startsWith("+")) {
    return "";
  }

  let digits = sanitizePhoneDigits(localValue);
  while (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!digits) {
    return "";
  }

  const normalized = `${normalizedDialCode}${digits}`;
  return isValidWhatsAppPhone(normalized) ? normalized : normalized;
}

export function extractLocalPhoneFromE164(phoneNumber: string | null | undefined, dialCode: string | null | undefined) {
  const normalizedPhone = String(phoneNumber || "").trim();
  const normalizedDialCode = String(dialCode || "").trim();
  if (!normalizedPhone || !normalizedDialCode || !normalizedPhone.startsWith(normalizedDialCode)) {
    return sanitizePhoneDigits(normalizedPhone);
  }

  return sanitizePhoneDigits(normalizedPhone.slice(normalizedDialCode.length));
}
