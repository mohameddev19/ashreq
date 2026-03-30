/** Keep digits only for stable unique lookup (SMS-ready later). */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidPhoneNormalized(phone: string): boolean {
  return phone.length >= 9 && phone.length <= 15;
}
