export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhoneNumber(value: string) {
  return /^\d{10}$/.test(value.trim());
}

export function isValidAadhaarNumber(value: string) {
  return /^\d{12}$/.test(value.trim());
}

export function normalizeDigits(value: string, maxLength: number) {
  let cleaned = value.replace(/[^\d]/g, "");
  if (maxLength === 10 && cleaned.length > 10 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  }
  return cleaned.slice(0, maxLength);
}

export function isNonEmptyString(value: string) {
  return value.trim().length > 0;
}
