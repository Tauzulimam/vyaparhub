export const MAX_STOCK_QUANTITY = 1_000_000;
export const MAX_SELLING_PRICE = 99_999_999.99;

export type ValidationOutcome<T> =
  | { valid: true; value: T }
  | { valid: false; error: string };

/**
 * Validates store-specific selling price:
 * - positive finite monetary number (> 0)
 * - at most 2 decimal places (Decimal(10, 2))
 * - must not exceed authoritative MasterProduct MRP
 */
export function validateSellingPrice(
  rawPrice: unknown,
  authoritativeMrp: number
): ValidationOutcome<number> {
  if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice)) {
    return { valid: false, error: 'Enter a valid numeric selling price.' };
  }

  if (rawPrice <= 0) {
    return { valid: false, error: 'Selling price must be greater than ₹0.' };
  }

  if (rawPrice > MAX_SELLING_PRICE) {
    return { valid: false, error: 'Selling price exceeds the maximum allowed amount.' };
  }

  const scaled = rawPrice * 100;
  if (Math.abs(Math.round(scaled) - scaled) > 1e-6) {
    return { valid: false, error: 'Selling price can have at most 2 decimal places.' };
  }

  const normalizedPrice = Math.round(scaled) / 100;
  const normalizedMrp = Math.round(authoritativeMrp * 100) / 100;

  if (normalizedPrice > normalizedMrp) {
    return {
      valid: false,
      error: `Selling price (₹${normalizedPrice}) cannot exceed MRP (₹${normalizedMrp}).`,
    };
  }

  return { valid: true, value: normalizedPrice };
}

/**
 * Validates whole-number stock quantities (rejects floats, NaN, negatives, or values below min).
 */
export function validateWholeQuantity(
  rawQuantity: unknown,
  min: number,
  label = 'Quantity'
): ValidationOutcome<number> {
  if (typeof rawQuantity !== 'number' || !Number.isSafeInteger(rawQuantity)) {
    return { valid: false, error: `${label} must be a whole number.` };
  }

  if (rawQuantity < min) {
    return {
      valid: false,
      error: min === 1 ? `${label} must be 1 or more.` : `${label} cannot be negative.`,
    };
  }

  if (rawQuantity > MAX_STOCK_QUANTITY) {
    return {
      valid: false,
      error: `${label} cannot exceed ${MAX_STOCK_QUANTITY.toLocaleString('en-IN')}.`,
    };
  }

  return { valid: true, value: rawQuantity };
}

/**
 * Computes next stock and availability for normal restock (+quantityToAdd).
 * Re-enables availability when restocking from 0; otherwise preserves vendor's availability toggle.
 */
export function computeAddedStockState(
  currentStock: number,
  currentAvailable: boolean,
  quantityToAdd: number
): ValidationOutcome<{ stockQuantity: number; isAvailable: boolean }> {
  const check = validateWholeQuantity(quantityToAdd, 1, 'Quantity to add');
  if (!check.valid) return check;

  const nextStock = currentStock + check.value;
  if (nextStock > MAX_STOCK_QUANTITY) {
    return {
      valid: false,
      error: `Total stock cannot exceed ${MAX_STOCK_QUANTITY.toLocaleString('en-IN')}.`,
    };
  }

  return {
    valid: true,
    value: {
      stockQuantity: nextStock,
      isAvailable: currentStock <= 0 ? true : currentAvailable,
    },
  };
}

/**
 * Computes exact stock and availability for explicit stock correction.
 * Setting quantity to 0 forces isAvailable = false (out of stock / unavailable).
 */
export function computeCorrectedStockState(
  currentStock: number,
  currentAvailable: boolean,
  exactQuantity: number
): ValidationOutcome<{ stockQuantity: number; isAvailable: boolean }> {
  const check = validateWholeQuantity(exactQuantity, 0, 'Stock quantity');
  if (!check.valid) return check;

  const nextStock = check.value;
  const nextAvailable =
    nextStock === 0 ? false : currentStock <= 0 ? true : currentAvailable;

  return {
    valid: true,
    value: {
      stockQuantity: nextStock,
      isAvailable: nextAvailable,
    },
  };
}
