/** Normalise Kenyan mobile numbers to +254XXXXXXXXX. Returns null if it does not look valid. */
export function normalizePhone(raw: string): string | null {
  const digits = (raw || '').replace(/[^\d+]/g, '');
  let n = digits.replace(/^\+/, '');
  if (n.startsWith('254')) n = n.slice(3);
  else if (n.startsWith('0')) n = n.slice(1);
  return /^[17]\d{8}$/.test(n) ? `+254${n}` : null;
}

/** M-Pesa confirmation codes are 10 upper-case letters/digits, e.g. SGH7K2L9QX. */
export function normalizeMpesaCode(raw: string): string | null {
  const code = (raw || '').trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9]{10}$/.test(code) ? code : null;
}
