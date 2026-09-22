export class BarcodeError extends Error {
  public readonly code: "invalid_barcode";

  constructor(code: "invalid_barcode", message: string) {
    super(message);
    this.code = code;
    this.name = "BarcodeError";
  }
}

/**
 * Normalizes UPC/EAN/GTIN input to digits only while preserving meaningful
 * leading zeroes. Check digits are validated for standard GTIN lengths.
 */
export function normalizeBarcode(raw: string): string {
  const digits = raw.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits) || ![8, 12, 13, 14].includes(digits.length)) {
    throw new BarcodeError("invalid_barcode", "Barcode must be a GTIN-8, UPC-A, EAN-13, or GTIN-14 value.");
  }
  if (!hasValidGtinCheckDigit(digits)) throw new BarcodeError("invalid_barcode", "Barcode check digit is invalid.");
  return digits;
}

export function hasValidGtinCheckDigit(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length < 2) return false;
  const body = digits.slice(0, -1);
  const expected = Number(digits.at(-1));
  let sum = 0;
  for (let offset = 0; offset < body.length; offset += 1) {
    const digit = Number(body[body.length - 1 - offset]);
    sum += digit * (offset % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === expected;
}
