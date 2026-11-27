import type { PrismaClient } from '@/generated/prisma/client';
import {
  AccountStatus,
  AddressLabel,
  MarketplaceStatus,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/enums';
import { formatCustomerStoreHours } from '@/lib/marketplace/server';
import { formatMasterProductUnit, toNumericValue } from '@/lib/vendor/server';
import {
  type AddressActionResult,
  type AddressListActionResult,
  type CartActionResult,
  type CartIssueCode,
  type CheckoutValidationResult,
  type CreateCustomerAddressInput,
  createEmptyCustomerCartDto,
  type CustomerAddressDto,
  type CustomerAddressTag,
  type CustomerCartDto,
  type CustomerCartItemDto,
  type CustomerCartStoreDto,
  type CustomerOrderAddressSnapshotDto,
  type CustomerOrderDetailDto,
  type CustomerOrderItemDto,
  type CustomerOrderStatusDto,
  type CustomerOrderStatusHistoryDto,
  type CustomerOrderSummaryDto,
  type CustomerPaymentMethodDto,
  type CustomerPaymentStatusDto,
  type CustomerProfileDto,
  deriveDeliveryLocationLabel,
  type ProfileUpdateActionResult,
} from '@/lib/cart/types';

const DEFAULT_PRODUCT_IMAGE = '/images/placeholder-product.svg';
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

function deriveDeliveryWindowLabel(radiusKm: number): string {
  if (radiusKm <= 2) return '15–25 mins';
  if (radiusKm <= 5) return '20–35 mins';
  return '30–45 mins';
}

function mapLabelToTag(label: AddressLabel): CustomerAddressTag {
  switch (label) {
    case AddressLabel.WORK:
      return 'Work';
    case AddressLabel.OTHER:
      return 'Other';
    case AddressLabel.HOME:
    default:
      return 'Home';
  }
}

function mapTagToLabel(tag: string | undefined): AddressLabel | null {
  switch (tag) {
    case 'Home':
    case 'HOME':
      return AddressLabel.HOME;
    case 'Work':
    case 'WORK':
      return AddressLabel.WORK;
    case 'Other':
    case 'OTHER':
      return AddressLabel.OTHER;
    default:
      return null;
  }
}

interface RawAddressRow {
  id: string;
  label: AddressLabel;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

function mapAddressRowToDto(row: RawAddressRow): CustomerAddressDto {
  const formattedAddress = [
    row.addressLine1,
    row.addressLine2,
    row.area,
    row.city,
    `${row.state} - ${row.postalCode}`,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    id: row.id,
    label: row.label,
    tag: mapLabelToTag(row.label),
    recipientName: row.recipientName,
    phone: row.phone,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2 ?? '',
    landmark: row.landmark ?? '',
    area: row.area,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    formattedAddress,
    isDefault: row.isDefault,
  };
}

const ADDRESS_SCALAR_SELECT = {
  id: true,
  label: true,
  recipientName: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  landmark: true,
  area: true,
  city: true,
  state: true,
  postalCode: true,
  isDefault: true,
} as const;

interface EvaluatedStoreEligibility {
  eligible: boolean;
  issueCode: CartIssueCode | null;
  issueMessage: string | null;
}

function evaluateStoreEligibility(params: {
  storeName: string;
  isOpen: boolean;
  marketplaceStatus: MarketplaceStatus;
  verificationStatus: VerificationStatus;
  categoryIsActive: boolean;
  vendorVerificationStatus: VerificationStatus;
  vendorUserRole: UserRole;
  vendorAccountStatus: AccountStatus;
}): EvaluatedStoreEligibility {
  if (
    params.marketplaceStatus !== MarketplaceStatus.ACTIVE ||
    params.vendorAccountStatus !== AccountStatus.ACTIVE ||
    params.vendorUserRole !== UserRole.VENDOR
  ) {
    return {
      eligible: false,
      issueCode: 'STORE_SUSPENDED',
      issueMessage: `${params.storeName} is currently unavailable in the marketplace.`,
    };
  }

  if (
    params.verificationStatus === VerificationStatus.REJECTED ||
    params.vendorVerificationStatus === VerificationStatus.REJECTED
  ) {
    return {
      eligible: false,
      issueCode: 'STORE_REJECTED',
      issueMessage: `${params.storeName} is currently unavailable for orders.`,
    };
  }

  if (!params.categoryIsActive) {
    return {
      eligible: false,
      issueCode: 'STORE_INELIGIBLE',
      issueMessage: `${params.storeName} belongs to an inactive category and cannot accept orders.`,
    };
  }

  if (!params.isOpen) {
    return {
      eligible: false,
      issueCode: 'STORE_CLOSED',
      issueMessage: `${params.storeName} is currently closed and not accepting orders.`,
    };
  }

  return {
    eligible: true,
    issueCode: null,
    issueMessage: null,
  };
}

/**
 * Loads the authenticated customer's authoritative Cart and CartItems from PostgreSQL,
 * computing all prices, stock limits, and staleness/eligibility flags from CURRENT
 * PostgreSQL Store, StoreProduct, MasterProduct, and Category state.
 *
 * Uses flat scalar queries so Prisma 7 opens zero implicit BEGIN/COMMIT transactions.
 */
export async function queryCustomerCart(
  prisma: PrismaClient,
  customerProfileId: string
): Promise<CustomerCartDto> {
  const cartRow = await prisma.cart.findUnique({
    where: { customerProfileId },
    select: {
      id: true,
      customerProfileId: true,
      storeId: true,
    },
  });

  if (!cartRow) {
    return createEmptyCustomerCartDto();
  }

  const cartItemRows = await prisma.cartItem.findMany({
    where: { cartId: cartRow.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      cartId: true,
      storeProductId: true,
      quantity: true,
    },
  });

  if (cartItemRows.length === 0) {
    await prisma.cart.deleteMany({
      where: {
        id: cartRow.id,
        customerProfileId,
      },
    });
    return createEmptyCustomerCartDto();
  }

  const storeProductIds = cartItemRows.map((ci) => ci.storeProductId);

  const [storeRow, storeProductRows] = await Promise.all([
    prisma.store.findUnique({
      where: { id: cartRow.storeId },
      select: {
        id: true,
        vendorProfileId: true,
        categoryId: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        area: true,
        city: true,
        state: true,
        postalCode: true,
        openingTime: true,
        closingTime: true,
        deliveryRadiusKm: true,
        minimumOrderAmount: true,
        isOpen: true,
        verificationStatus: true,
        marketplaceStatus: true,
      },
    }),
    prisma.storeProduct.findMany({
      where: { id: { in: storeProductIds } },
      select: {
        id: true,
        storeId: true,
        masterProductId: true,
        sellingPrice: true,
        stockQuantity: true,
        isAvailable: true,
      },
    }),
  ]);

  if (!storeRow) {
    return createEmptyCustomerCartDto();
  }

  const masterProductIds = Array.from(
    new Set(storeProductRows.map((sp) => sp.masterProductId))
  );

  const [vendorProfileRow, masterRows] = await Promise.all([
    prisma.vendorProfile.findUnique({
      where: { id: storeRow.vendorProfileId },
      select: {
        id: true,
        userId: true,
        verificationStatus: true,
      },
    }),
    masterProductIds.length > 0
      ? prisma.masterProduct.findMany({
          where: { id: { in: masterProductIds } },
          select: {
            id: true,
            categoryId: true,
            name: true,
            brand: true,
            unitValue: true,
            unitType: true,
            mrp: true,
            imageUrl: true,
            isActive: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const categoryIds = Array.from(
    new Set([storeRow.categoryId, ...masterRows.map((m) => m.categoryId)])
  );

  const [vendorUserRow, categoryRows] = await Promise.all([
    vendorProfileRow
      ? prisma.user.findUnique({
          where: { id: vendorProfileRow.userId },
          select: {
            id: true,
            role: true,
            accountStatus: true,
          },
        })
      : Promise.resolve(null),
    prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    }),
  ]);

  const categoriesById = new Map(categoryRows.map((c) => [c.id, c]));
  const storeProductsById = new Map(storeProductRows.map((sp) => [sp.id, sp]));
  const mastersById = new Map(masterRows.map((m) => [m.id, m]));

  const storeCategory = categoriesById.get(storeRow.categoryId);
  const storeEligibility = evaluateStoreEligibility({
    storeName: storeRow.name,
    isOpen: storeRow.isOpen,
    marketplaceStatus: storeRow.marketplaceStatus,
    verificationStatus: storeRow.verificationStatus,
    categoryIsActive: storeCategory?.isActive ?? false,
    vendorVerificationStatus:
      vendorProfileRow?.verificationStatus ?? VerificationStatus.REJECTED,
    vendorUserRole: vendorUserRow?.role ?? UserRole.CUSTOMER,
    vendorAccountStatus: vendorUserRow?.accountStatus ?? AccountStatus.SUSPENDED,
  });

  const radiusKm = Number(toNumericValue(storeRow.deliveryRadiusKm).toFixed(2));
  const minOrderAmount = Number(toNumericValue(storeRow.minimumOrderAmount).toFixed(2));
  const fullStoreAddress = [
    storeRow.addressLine1,
    storeRow.addressLine2,
    storeRow.area,
    storeRow.city,
    storeRow.postalCode ? `${storeRow.state} - ${storeRow.postalCode}` : storeRow.state,
  ]
    .filter(Boolean)
    .join(', ');

  const storeDto: CustomerCartStoreDto = {
    id: storeRow.id,
    name: storeRow.name,
    category: storeCategory?.name ?? 'Local Store',
    address: fullStoreAddress,
    area: storeRow.area,
    city: storeRow.city,
    timing: formatCustomerStoreHours(storeRow.openingTime, storeRow.closingTime),
    deliveryTimeMin: deriveDeliveryWindowLabel(radiusKm),
    deliveryRadiusKm: radiusKm,
    minOrderAmount,
    isOpen: storeRow.isOpen,
    isEligibleForCheckout: storeEligibility.eligible,
    statusIssueCode: storeEligibility.issueCode,
    statusIssueMessage: storeEligibility.issueMessage,
  };

  const blockingIssues: string[] = [];
  if (storeEligibility.issueMessage) {
    blockingIssues.push(storeEligibility.issueMessage);
  }

  const items: CustomerCartItemDto[] = [];
  let itemCount = 0;
  let subtotal = 0;

  for (const ci of cartItemRows) {
    const sp = storeProductsById.get(ci.storeProductId);
    const mp = sp ? mastersById.get(sp.masterProductId) : undefined;
    const prodCategory = mp ? categoriesById.get(mp.categoryId) : undefined;

    if (!sp || !mp || !prodCategory) {
      const msg = 'An item in your cart is no longer available and must be removed.';
      blockingIssues.push(msg);
      items.push({
        cartItemId: ci.id,
        storeProductId: ci.storeProductId,
        masterProductId: sp?.masterProductId ?? '',
        name: mp?.name ?? 'Unavailable Product',
        brand: mp?.brand ?? 'Unavailable',
        category: prodCategory?.name ?? 'Unavailable',
        unit: '',
        image: DEFAULT_PRODUCT_IMAGE,
        unitPrice: 0,
        mrp: 0,
        quantity: ci.quantity,
        lineSubtotal: 0,
        stockQuantity: 0,
        isAvailable: false,
        issueCode: 'PRODUCT_UNAVAILABLE',
        issueMessage: msg,
      });
      itemCount += ci.quantity;
      continue;
    }

    const unitPrice = Number(toNumericValue(sp.sellingPrice).toFixed(2));
    const mrp = Number(toNumericValue(mp.mrp).toFixed(2));
    const unitVal = Number(toNumericValue(mp.unitValue).toFixed(3));
    const lineSubtotal = Number((unitPrice * ci.quantity).toFixed(2));

    let issueCode: CartIssueCode | null = null;
    let issueMessage: string | null = null;

    if (sp.storeId !== cartRow.storeId) {
      issueCode = 'STORE_INELIGIBLE';
      issueMessage = `${mp.name} does not belong to ${storeRow.name}. Please remove it.`;
    } else if (!mp.isActive || !prodCategory.isActive) {
      issueCode = 'MASTER_PRODUCT_INACTIVE';
      issueMessage = `${mp.name} is no longer active in the catalog. Please remove it from your cart.`;
    } else if (!sp.isAvailable) {
      issueCode = 'PRODUCT_UNAVAILABLE';
      issueMessage = `${mp.name} is currently marked unavailable by ${storeRow.name}.`;
    } else if (sp.stockQuantity <= 0) {
      issueCode = 'OUT_OF_STOCK';
      issueMessage = `${mp.name} is currently out of stock at ${storeRow.name}.`;
    } else if (ci.quantity > sp.stockQuantity) {
      issueCode = 'INSUFFICIENT_STOCK';
      issueMessage = `Only ${sp.stockQuantity} ${sp.stockQuantity === 1 ? 'unit' : 'units'} of ${mp.name} left in stock (you have ${ci.quantity} in cart).`;
    }

    if (issueMessage) {
      blockingIssues.push(issueMessage);
    }

    items.push({
      cartItemId: ci.id,
      storeProductId: sp.id,
      masterProductId: mp.id,
      name: mp.name,
      brand: mp.brand ?? 'Generic',
      category: prodCategory.name,
      unit: formatMasterProductUnit(unitVal, mp.unitType),
      image: mp.imageUrl || DEFAULT_PRODUCT_IMAGE,
      unitPrice,
      mrp,
      quantity: ci.quantity,
      lineSubtotal,
      stockQuantity: sp.stockQuantity,
      isAvailable: issueCode === null && storeEligibility.eligible,
      issueCode,
      issueMessage,
    });

    itemCount += ci.quantity;
    subtotal = Number((subtotal + lineSubtotal).toFixed(2));
  }

  const hasBlockingIssues = blockingIssues.length > 0;

  return {
    cartId: cartRow.id,
    store: storeDto,
    items,
    itemCount,
    lineCount: items.length,
    subtotal,
    hasBlockingIssues,
    blockingIssues,
    canCheckout: items.length > 0 && !hasBlockingIssues,
  };
}

/**
 * Validates that a StoreProduct exists and is currently customer-purchasable
 * (open active non-rejected store with active vendor user, active MasterProduct & Category,
 * StoreProduct.isAvailable === true, and stockQuantity > 0).
 */
async function validatePurchasableStoreProduct(
  prisma: PrismaClient,
  storeProductId: string
): Promise<
  | {
      ok: true;
      storeProduct: {
        id: string;
        storeId: string;
        storeName: string;
        productName: string;
        stockQuantity: number;
      };
    }
  | {
      ok: false;
      code: 'NOT_FOUND' | 'STORE_INELIGIBLE' | 'PRODUCT_INELIGIBLE' | 'OUT_OF_STOCK';
      error: string;
    }
> {
  const cleanSpId = storeProductId?.trim() || '';
  if (!cleanSpId) {
    return { ok: false, code: 'NOT_FOUND', error: 'Invalid product selection.' };
  }

  const sp = await prisma.storeProduct.findUnique({
    where: { id: cleanSpId },
    select: {
      id: true,
      storeId: true,
      masterProductId: true,
      stockQuantity: true,
      isAvailable: true,
    },
  });

  if (!sp) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      error: 'The selected product listing was not found.',
    };
  }

  const [storeRow, masterRow] = await Promise.all([
    prisma.store.findUnique({
      where: { id: sp.storeId },
      select: {
        id: true,
        vendorProfileId: true,
        categoryId: true,
        name: true,
        isOpen: true,
        verificationStatus: true,
        marketplaceStatus: true,
      },
    }),
    prisma.masterProduct.findUnique({
      where: { id: sp.masterProductId },
      select: {
        id: true,
        categoryId: true,
        name: true,
        isActive: true,
      },
    }),
  ]);

  if (!storeRow || !masterRow) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      error: 'The selected store or product could not be found.',
    };
  }

  const [vendorProfileRow, categoryRows] = await Promise.all([
    prisma.vendorProfile.findUnique({
      where: { id: storeRow.vendorProfileId },
      select: {
        id: true,
        userId: true,
        verificationStatus: true,
      },
    }),
    prisma.category.findMany({
      where: { id: { in: Array.from(new Set([storeRow.categoryId, masterRow.categoryId])) } },
      select: { id: true, isActive: true },
    }),
  ]);

  const vendorUserRow = vendorProfileRow
    ? await prisma.user.findUnique({
        where: { id: vendorProfileRow.userId },
        select: { role: true, accountStatus: true },
      })
    : null;

  const catMap = new Map(categoryRows.map((c) => [c.id, c]));
  const storeCheck = evaluateStoreEligibility({
    storeName: storeRow.name,
    isOpen: storeRow.isOpen,
    marketplaceStatus: storeRow.marketplaceStatus,
    verificationStatus: storeRow.verificationStatus,
    categoryIsActive: catMap.get(storeRow.categoryId)?.isActive ?? false,
    vendorVerificationStatus:
      vendorProfileRow?.verificationStatus ?? VerificationStatus.REJECTED,
    vendorUserRole: vendorUserRow?.role ?? UserRole.CUSTOMER,
    vendorAccountStatus: vendorUserRow?.accountStatus ?? AccountStatus.SUSPENDED,
  });

  if (!storeCheck.eligible) {
    return {
      ok: false,
      code: 'STORE_INELIGIBLE',
      error: storeCheck.issueMessage || 'This store is not currently accepting orders.',
    };
  }

  if (!masterRow.isActive || !(catMap.get(masterRow.categoryId)?.isActive ?? false)) {
    return {
      ok: false,
      code: 'PRODUCT_INELIGIBLE',
      error: `"${masterRow.name}" is currently inactive in the catalog.`,
    };
  }

  if (!sp.isAvailable) {
    return {
      ok: false,
      code: 'PRODUCT_INELIGIBLE',
      error: `"${masterRow.name}" is currently marked unavailable by ${storeRow.name}.`,
    };
  }

  if (sp.stockQuantity <= 0) {
    return {
      ok: false,
      code: 'OUT_OF_STOCK',
      error: `"${masterRow.name}" is out of stock at ${storeRow.name}.`,
    };
  }

  return {
    ok: true,
    storeProduct: {
      id: sp.id,
      storeId: storeRow.id,
      storeName: storeRow.name,
      productName: masterRow.name,
      stockQuantity: sp.stockQuantity,
    },
  };
}

/**
 * Adds a StoreProduct to the customer's PostgreSQL Cart.
 * - Strictly enforces single-store cart rule (rejects with STORE_CONFLICT if cart
 *   contains items from a different store; never silently deletes existing items).
 * - Deduplicates on `(cartId, storeProductId)` by incrementing existing quantity.
 * - Enforces `1 <= finalQuantity <= StoreProduct.stockQuantity`.
 */
export async function executeAddToCart(
  prisma: PrismaClient,
  params: {
    customerProfileId: string;
    storeProductId: string;
    quantityToAdd: number;
  }
): Promise<CartActionResult> {
  if (!Number.isInteger(params.quantityToAdd) || params.quantityToAdd < 1) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: 'Quantity to add must be a whole number of at least 1.',
    };
  }

  const check = await validatePurchasableStoreProduct(prisma, params.storeProductId);
  if (!check.ok) {
    return {
      success: false,
      code: check.code,
      error: check.error,
    };
  }

  const target = check.storeProduct;

  const existingCart = await prisma.cart.findUnique({
    where: { customerProfileId: params.customerProfileId },
    select: {
      id: true,
      storeId: true,
    },
  });

  let activeCartId: string;

  if (!existingCart) {
    if (params.quantityToAdd > target.stockQuantity) {
      return {
        success: false,
        code: 'INSUFFICIENT_STOCK',
        error: `Only ${target.stockQuantity} ${target.stockQuantity === 1 ? 'unit' : 'units'} of "${target.productName}" available in stock.`,
      };
    }

    const createdCart = await prisma.cart.create({
      data: {
        customerProfileId: params.customerProfileId,
        storeId: target.storeId,
      },
      select: { id: true },
    });
    activeCartId = createdCart.id;
  } else if (existingCart.storeId !== target.storeId) {
    const existingItemCount = await prisma.cartItem.count({
      where: { cartId: existingCart.id },
    });

    if (existingItemCount > 0) {
      const currentStore = await prisma.store.findUnique({
        where: { id: existingCart.storeId },
        select: { id: true, name: true },
      });
      const conflictName = currentStore?.name ?? 'another store';

      return {
        success: false,
        code: 'STORE_CONFLICT',
        error: `Your cart already contains items from ${conflictName}. VyaparHub carts support one store at a time.`,
        conflictStore: {
          id: existingCart.storeId,
          name: conflictName,
        },
      };
    }

    if (params.quantityToAdd > target.stockQuantity) {
      return {
        success: false,
        code: 'INSUFFICIENT_STOCK',
        error: `Only ${target.stockQuantity} ${target.stockQuantity === 1 ? 'unit' : 'units'} of "${target.productName}" available in stock.`,
      };
    }

    await prisma.cart.update({
      where: { id: existingCart.id },
      data: { storeId: target.storeId },
      select: { id: true },
    });
    activeCartId = existingCart.id;
  } else {
    activeCartId = existingCart.id;
  }

  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_storeProductId: {
        cartId: activeCartId,
        storeProductId: target.id,
      },
    },
    select: {
      id: true,
      quantity: true,
    },
  });

  const nextQuantity = (existingItem?.quantity ?? 0) + params.quantityToAdd;
  if (nextQuantity > target.stockQuantity) {
    return {
      success: false,
      code: 'INSUFFICIENT_STOCK',
      error: existingItem
        ? `Cannot add ${params.quantityToAdd} more — only ${target.stockQuantity} available in stock (${existingItem.quantity} already in your cart).`
        : `Only ${target.stockQuantity} ${target.stockQuantity === 1 ? 'unit' : 'units'} of "${target.productName}" available in stock.`,
    };
  }

  await prisma.cartItem.upsert({
    where: {
      cartId_storeProductId: {
        cartId: activeCartId,
        storeProductId: target.id,
      },
    },
    update: {
      quantity: nextQuantity,
    },
    create: {
      cartId: activeCartId,
      storeProductId: target.id,
      quantity: nextQuantity,
    },
    select: { id: true },
  });

  const cart = await queryCustomerCart(prisma, params.customerProfileId);
  return { success: true, cart };
}

/**
 * Explicit user-confirmed store switch (`SwitchCartModal` -> "Clear & Switch Store"):
 * Validates the new StoreProduct BEFORE replacing the customer's cart in a minimal
 * non-interactive Prisma batch transaction.
 */
export async function executeReplaceCartWithItem(
  prisma: PrismaClient,
  params: {
    customerProfileId: string;
    storeProductId: string;
    quantity: number;
  }
): Promise<CartActionResult> {
  if (!Number.isInteger(params.quantity) || params.quantity < 1) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: 'Quantity must be a whole number of at least 1.',
    };
  }

  const check = await validatePurchasableStoreProduct(prisma, params.storeProductId);
  if (!check.ok) {
    return {
      success: false,
      code: check.code,
      error: check.error,
    };
  }

  const target = check.storeProduct;
  if (params.quantity > target.stockQuantity) {
    return {
      success: false,
      code: 'INSUFFICIENT_STOCK',
      error: `Only ${target.stockQuantity} ${target.stockQuantity === 1 ? 'unit' : 'units'} of "${target.productName}" available in stock.`,
    };
  }

  await prisma.$transaction([
    prisma.cart.deleteMany({
      where: { customerProfileId: params.customerProfileId },
    }),
    prisma.cart.create({
      data: {
        customerProfileId: params.customerProfileId,
        storeId: target.storeId,
        items: {
          create: {
            storeProductId: target.id,
            quantity: params.quantity,
          },
        },
      },
      select: { id: true },
    }),
  ]);

  const cart = await queryCustomerCart(prisma, params.customerProfileId);
  return { success: true, cart };
}

/**
 * Updates exact quantity on an existing CartItem owned by `customerProfileId`.
 * - Rejects cross-customer `cartItemId` attempts (`cart.customerProfileId` check).
 * - `nextQuantity === 0` removes the item cleanly.
 * - `nextQuantity >= 1` revalidates current PostgreSQL stock (`nextQuantity <= stockQuantity`).
 */
export async function executeUpdateCartItemQuantity(
  prisma: PrismaClient,
  params: {
    customerProfileId: string;
    cartItemId: string;
    nextQuantity: number;
  }
): Promise<CartActionResult> {
  const cleanItemId = params.cartItemId?.trim() || '';
  if (!cleanItemId) {
    return {
      success: false,
      code: 'NOT_FOUND',
      error: 'Invalid cart item reference.',
    };
  }

  if (!Number.isInteger(params.nextQuantity) || params.nextQuantity < 0) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: 'Quantity must be a non-negative whole number.',
    };
  }

  const ownedItem = await prisma.cartItem.findFirst({
    where: {
      id: cleanItemId,
      cart: {
        customerProfileId: params.customerProfileId,
      },
    },
    select: {
      id: true,
      cartId: true,
      storeProductId: true,
      quantity: true,
    },
  });

  if (!ownedItem) {
    return {
      success: false,
      code: 'NOT_FOUND',
      error: 'Cart item not found or unauthorized.',
    };
  }

  if (params.nextQuantity === 0) {
    return executeRemoveCartItem(prisma, {
      customerProfileId: params.customerProfileId,
      cartItemId: ownedItem.id,
    });
  }

  const sp = await prisma.storeProduct.findUnique({
    where: { id: ownedItem.storeProductId },
    select: {
      id: true,
      masterProductId: true,
      stockQuantity: true,
      isAvailable: true,
    },
  });

  const mp = sp
    ? await prisma.masterProduct.findUnique({
        where: { id: sp.masterProductId },
        select: { name: true, isActive: true },
      })
    : null;

  if (!sp || !mp || !mp.isActive || !sp.isAvailable || sp.stockQuantity <= 0) {
    const cart = await queryCustomerCart(prisma, params.customerProfileId);
    return {
      success: false,
      code: sp && sp.stockQuantity <= 0 ? 'OUT_OF_STOCK' : 'PRODUCT_INELIGIBLE',
      error: `"${mp?.name ?? 'This product'}" is currently unavailable or out of stock. Please remove it from your cart.`,
      cart,
    };
  }

  if (params.nextQuantity > sp.stockQuantity) {
    const cart = await queryCustomerCart(prisma, params.customerProfileId);
    return {
      success: false,
      code: 'INSUFFICIENT_STOCK',
      error: `Only ${sp.stockQuantity} ${sp.stockQuantity === 1 ? 'unit' : 'units'} of "${mp.name}" available in stock.`,
      cart,
    };
  }

  await prisma.cartItem.update({
    where: { id: ownedItem.id },
    data: { quantity: params.nextQuantity },
    select: { id: true },
  });

  const cart = await queryCustomerCart(prisma, params.customerProfileId);
  return { success: true, cart };
}

/**
 * Removes a single CartItem owned strictly by `customerProfileId`.
 * Deletes the parent Cart if no items remain so the store lock resets cleanly.
 */
export async function executeRemoveCartItem(
  prisma: PrismaClient,
  params: {
    customerProfileId: string;
    cartItemId: string;
  }
): Promise<CartActionResult> {
  const cleanItemId = params.cartItemId?.trim() || '';
  if (!cleanItemId) {
    return {
      success: false,
      code: 'NOT_FOUND',
      error: 'Invalid cart item reference.',
    };
  }

  const ownedItem = await prisma.cartItem.findFirst({
    where: {
      id: cleanItemId,
      cart: {
        customerProfileId: params.customerProfileId,
      },
    },
    select: {
      id: true,
      cartId: true,
    },
  });

  if (!ownedItem) {
    return {
      success: false,
      code: 'NOT_FOUND',
      error: 'Cart item not found or unauthorized.',
    };
  }

  await prisma.cartItem.delete({
    where: { id: ownedItem.id },
    select: { id: true },
  });

  const remaining = await prisma.cartItem.count({
    where: { cartId: ownedItem.cartId },
  });

  if (remaining === 0) {
    await prisma.cart.deleteMany({
      where: {
        id: ownedItem.cartId,
        customerProfileId: params.customerProfileId,
      },
    });
    return {
      success: true,
      cart: createEmptyCustomerCartDto(),
    };
  }

  const cart = await queryCustomerCart(prisma, params.customerProfileId);
  return { success: true, cart };
}

/**
 * Clears the entire Cart belonging strictly to `customerProfileId`.
 */
export async function executeClearCustomerCart(
  prisma: PrismaClient,
  customerProfileId: string
): Promise<CartActionResult> {
  await prisma.cart.deleteMany({
    where: { customerProfileId },
  });

  return {
    success: true,
    cart: createEmptyCustomerCartDto(),
  };
}

/**
 * Lists all saved delivery addresses belonging strictly to `customerProfileId`.
 */
export async function queryCustomerAddresses(
  prisma: PrismaClient,
  customerProfileId: string
): Promise<CustomerAddressDto[]> {
  const rows = await prisma.address.findMany({
    where: { customerProfileId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    select: ADDRESS_SCALAR_SELECT,
  });

  return rows.map(mapAddressRowToDto);
}

/**
 * Validates and persists a new delivery Address owned strictly by `customerProfileId`.
 * Respects `addresses_one_default_per_customer_uidx` by unsetting any prior default
 * before inserting a new default row inside a 2-statement non-interactive batch transaction.
 */
export async function executeCreateCustomerAddress(
  prisma: PrismaClient,
  customerProfileId: string,
  input: CreateCustomerAddressInput
): Promise<AddressActionResult> {
  const fieldErrors: Record<string, string> = {};

  const label = mapTagToLabel(input.tag);
  if (!label) {
    fieldErrors.tag = 'Select a valid address label (Home, Work, or Other).';
  }

  const recipientName = input.recipientName?.trim() || '';
  if (recipientName.length < 2 || recipientName.length > 100) {
    fieldErrors.recipientName = 'Recipient full name must be between 2 and 100 characters.';
  }

  const rawPhone = input.phone?.trim() || '';
  const digits = rawPhone.replace(/\D/g, '');
  const normalizedPhone =
    digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (!INDIAN_PHONE_REGEX.test(normalizedPhone)) {
    fieldErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }

  const addressLine1 = input.addressLine1?.trim() || '';
  if (addressLine1.length < 3 || addressLine1.length > 200) {
    fieldErrors.addressLine1 = 'House / flat / street address is required (min 3 characters).';
  }

  const addressLine2 = input.addressLine2?.trim() || null;
  if (addressLine2 && addressLine2.length > 200) {
    fieldErrors.addressLine2 = 'Address line 2 cannot exceed 200 characters.';
  }

  const landmark = input.landmark?.trim() || null;
  if (landmark && landmark.length > 150) {
    fieldErrors.landmark = 'Landmark cannot exceed 150 characters.';
  }

  const area = input.area?.trim() || '';
  if (area.length < 2 || area.length > 100) {
    fieldErrors.area = 'Area or locality is required (min 2 characters).';
  }

  const city = input.city?.trim() || '';
  if (city.length < 2 || city.length > 80) {
    fieldErrors.city = 'City is required (min 2 characters).';
  }

  const state = input.state?.trim() || '';
  if (state.length < 2 || state.length > 80) {
    fieldErrors.state = 'State is required (min 2 characters).';
  }

  const postalCode = input.postalCode?.trim() || '';
  if (!PINCODE_REGEX.test(postalCode)) {
    fieldErrors.postalCode = 'Enter a valid 6-digit Indian PIN code (e.g. 585401).';
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstError = Object.values(fieldErrors)[0];
    return {
      success: false,
      error: firstError || 'Please correct the highlighted address fields.',
      fieldErrors,
    };
  }

  const existingCount = await prisma.address.count({
    where: { customerProfileId },
  });

  const makeDefault = existingCount === 0 ? true : Boolean(input.isDefault);
  let createdRow: RawAddressRow;

  if (makeDefault && existingCount > 0) {
    const [, created] = await prisma.$transaction([
      prisma.address.updateMany({
        where: { customerProfileId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.address.create({
        data: {
          customerProfileId,
          label: label!,
          recipientName,
          phone: normalizedPhone,
          addressLine1,
          addressLine2,
          landmark,
          area,
          city,
          state,
          postalCode,
          isDefault: true,
        },
        select: ADDRESS_SCALAR_SELECT,
      }),
    ]);
    createdRow = created;
  } else {
    createdRow = await prisma.address.create({
      data: {
        customerProfileId,
        label: label!,
        recipientName,
        phone: normalizedPhone,
        addressLine1,
        addressLine2,
        landmark,
        area,
        city,
        state,
        postalCode,
        isDefault: makeDefault,
      },
      select: ADDRESS_SCALAR_SELECT,
    });
  }

  const addresses = await queryCustomerAddresses(prisma, customerProfileId);
  return {
    success: true,
    address: mapAddressRowToDto(createdRow),
    addresses,
  };
}

function formatMemberSince(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

/**
 * Loads the authoritative PostgreSQL User + CustomerProfile + real Order count
 * for an authenticated CUSTOMER user.
 */
export async function queryCustomerProfileSummary(
  prisma: PrismaClient,
  userId: string
): Promise<CustomerProfileDto | null> {
  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      accountStatus: true,
      createdAt: true,
    },
  });

  if (
    !userRow ||
    userRow.role !== UserRole.CUSTOMER ||
    userRow.accountStatus !== AccountStatus.ACTIVE
  ) {
    return null;
  }

  const profileRow = await prisma.customerProfile.findUnique({
    where: { userId: userRow.id },
    select: {
      id: true,
      userId: true,
      fullName: true,
    },
  });

  if (!profileRow) {
    return null;
  }

  const orderCount = await prisma.order.count({
    where: { customerProfileId: profileRow.id },
  });

  return {
    userId: userRow.id,
    customerProfileId: profileRow.id,
    fullName: profileRow.fullName,
    email: userRow.email,
    phone: userRow.phone,
    createdAtIso: userRow.createdAt.toISOString(),
    memberSinceLabel: formatMemberSince(userRow.createdAt),
    orderCount,
  };
}

/**
 * Updates `CustomerProfile.fullName` for the authenticated customer.
 */
export async function executeUpdateCustomerProfileName(
  prisma: PrismaClient,
  customerProfileId: string,
  rawFullName: string
): Promise<ProfileUpdateActionResult> {
  const fullName = rawFullName?.trim() || '';
  if (fullName.length < 2 || fullName.length > 100) {
    return {
      success: false,
      error: 'Full name must be between 2 and 100 characters.',
    };
  }

  const updated = await prisma.customerProfile.update({
    where: { id: customerProfileId },
    data: { fullName },
    select: { fullName: true },
  });

  return {
    success: true,
    fullName: updated.fullName,
  };
}

/**
 * Updates an existing Address owned strictly by `customerProfileId`.
 */
export async function executeUpdateCustomerAddress(
  prisma: PrismaClient,
  customerProfileId: string,
  addressId: string,
  input: CreateCustomerAddressInput
): Promise<AddressActionResult> {
  const cleanId = addressId?.trim() || '';
  if (!cleanId) {
    return { success: false, error: 'Invalid address reference.' };
  }

  const existing = await prisma.address.findFirst({
    where: {
      id: cleanId,
      customerProfileId,
    },
    select: {
      id: true,
      isDefault: true,
    },
  });

  if (!existing) {
    return {
      success: false,
      error: 'Address not found in your account.',
    };
  }

  const fieldErrors: Record<string, string> = {};
  const label = mapTagToLabel(input.tag);
  if (!label) {
    fieldErrors.tag = 'Select a valid address label (Home, Work, or Other).';
  }

  const recipientName = input.recipientName?.trim() || '';
  if (recipientName.length < 2 || recipientName.length > 100) {
    fieldErrors.recipientName = 'Recipient full name must be between 2 and 100 characters.';
  }

  const rawPhone = input.phone?.trim() || '';
  const digits = rawPhone.replace(/\D/g, '');
  const normalizedPhone =
    digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (!INDIAN_PHONE_REGEX.test(normalizedPhone)) {
    fieldErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }

  const addressLine1 = input.addressLine1?.trim() || '';
  if (addressLine1.length < 3 || addressLine1.length > 200) {
    fieldErrors.addressLine1 = 'House / flat / street address is required (min 3 characters).';
  }

  const addressLine2 = input.addressLine2?.trim() || null;
  if (addressLine2 && addressLine2.length > 200) {
    fieldErrors.addressLine2 = 'Address line 2 cannot exceed 200 characters.';
  }

  const landmark = input.landmark?.trim() || null;
  if (landmark && landmark.length > 150) {
    fieldErrors.landmark = 'Landmark cannot exceed 150 characters.';
  }

  const area = input.area?.trim() || '';
  if (area.length < 2 || area.length > 100) {
    fieldErrors.area = 'Area or locality is required (min 2 characters).';
  }

  const city = input.city?.trim() || '';
  if (city.length < 2 || city.length > 80) {
    fieldErrors.city = 'City is required (min 2 characters).';
  }

  const state = input.state?.trim() || '';
  if (state.length < 2 || state.length > 80) {
    fieldErrors.state = 'State is required (min 2 characters).';
  }

  const postalCode = input.postalCode?.trim() || '';
  if (!PINCODE_REGEX.test(postalCode)) {
    fieldErrors.postalCode = 'Enter a valid 6-digit Indian PIN code (e.g. 585401).';
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstError = Object.values(fieldErrors)[0];
    return {
      success: false,
      error: firstError || 'Please correct the highlighted address fields.',
      fieldErrors,
    };
  }

  const makeDefault = input.isDefault !== undefined ? Boolean(input.isDefault) : existing.isDefault;
  let updatedRow: RawAddressRow;

  if (makeDefault && !existing.isDefault) {
    const [, updated] = await prisma.$transaction([
      prisma.address.updateMany({
        where: { customerProfileId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id: existing.id },
        data: {
          label: label!,
          recipientName,
          phone: normalizedPhone,
          addressLine1,
          addressLine2,
          landmark,
          area,
          city,
          state,
          postalCode,
          isDefault: true,
        },
        select: ADDRESS_SCALAR_SELECT,
      }),
    ]);
    updatedRow = updated;
  } else {
    updatedRow = await prisma.address.update({
      where: { id: existing.id },
      data: {
        label: label!,
        recipientName,
        phone: normalizedPhone,
        addressLine1,
        addressLine2,
        landmark,
        area,
        city,
        state,
        postalCode,
        isDefault: existing.isDefault ? true : makeDefault,
      },
      select: ADDRESS_SCALAR_SELECT,
    });
  }

  const addresses = await queryCustomerAddresses(prisma, customerProfileId);
  return {
    success: true,
    address: mapAddressRowToDto(updatedRow),
    addresses,
  };
}

/**
 * Marks an owned Address as the customer's single default delivery address.
 */
export async function executeSetDefaultCustomerAddress(
  prisma: PrismaClient,
  customerProfileId: string,
  addressId: string
): Promise<AddressListActionResult> {
  const cleanId = addressId?.trim() || '';
  if (!cleanId) {
    return { success: false, error: 'Invalid address reference.' };
  }

  const existing = await prisma.address.findFirst({
    where: {
      id: cleanId,
      customerProfileId,
    },
    select: { id: true, isDefault: true },
  });

  if (!existing) {
    return { success: false, error: 'Address not found in your account.' };
  }

  if (!existing.isDefault) {
    await prisma.$transaction([
      prisma.address.updateMany({
        where: { customerProfileId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id: existing.id },
        data: { isDefault: true },
        select: { id: true },
      }),
    ]);
  }

  const addresses = await queryCustomerAddresses(prisma, customerProfileId);
  return { success: true, addresses };
}

/**
 * Deletes an Address owned strictly by `customerProfileId`.
 * If the deleted address was default, promotes the most recent remaining address.
 */
export async function executeDeleteCustomerAddress(
  prisma: PrismaClient,
  customerProfileId: string,
  addressId: string
): Promise<AddressListActionResult> {
  const cleanId = addressId?.trim() || '';
  if (!cleanId) {
    return { success: false, error: 'Invalid address reference.' };
  }

  const existing = await prisma.address.findFirst({
    where: {
      id: cleanId,
      customerProfileId,
    },
    select: { id: true, isDefault: true },
  });

  if (!existing) {
    return { success: false, error: 'Address not found in your account.' };
  }

  await prisma.address.delete({
    where: { id: existing.id },
    select: { id: true },
  });

  if (existing.isDefault) {
    const nextCandidate = await prisma.address.findFirst({
      where: { customerProfileId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (nextCandidate) {
      await prisma.address.update({
        where: { id: nextCandidate.id },
        data: { isDefault: true },
        select: { id: true },
      });
    }
  }

  const addresses = await queryCustomerAddresses(prisma, customerProfileId);
  return { success: true, addresses };
}

/**
 * Revalidates the entire checkout payload server-side against live PostgreSQL state:
 * - Payment method must be Cash on Delivery (`COD`).
 * - Selected `addressId` must exist and belong strictly to `customerProfileId`.
 * - Cart must exist, be non-empty, and have zero store or item blocking issues.
 * - If `expectedSubtotal` is provided from the checkout review UI and differs from
 *   the current authoritative PostgreSQL subtotal, fails safely with `PRICE_CHANGED`
 *   and returns the refreshed cart so stale prices are never silently accepted.
 *
 * Does NOT create an Order (Order creation belongs strictly to Phase 9).
 */
export async function executeValidateCustomerCheckout(
  prisma: PrismaClient,
  params: {
    customerProfileId: string;
    addressId: string;
    paymentMethod: string;
    expectedSubtotal?: number;
  }
): Promise<CheckoutValidationResult> {
  if (params.paymentMethod !== 'COD') {
    return {
      valid: false,
      code: 'INVALID_PAYMENT_METHOD',
      error: 'Only Cash on Delivery (COD) is supported for checkout.',
    };
  }

  const cleanAddressId = params.addressId?.trim() || '';
  if (!cleanAddressId) {
    return {
      valid: false,
      code: 'ADDRESS_REQUIRED',
      error: 'Please select or add a delivery address before continuing.',
    };
  }

  const [ownedAddress, liveCart] = await Promise.all([
    prisma.address.findFirst({
      where: {
        id: cleanAddressId,
        customerProfileId: params.customerProfileId,
      },
      select: ADDRESS_SCALAR_SELECT,
    }),
    queryCustomerCart(prisma, params.customerProfileId),
  ]);

  if (!ownedAddress) {
    return {
      valid: false,
      code: 'ADDRESS_UNAUTHORIZED',
      error: 'Selected delivery address was not found in your account.',
      cart: liveCart,
    };
  }

  if (liveCart.items.length === 0 || !liveCart.store) {
    return {
      valid: false,
      code: 'EMPTY_CART',
      error: 'Your cart is empty. Add items from an open store before checking out.',
      cart: liveCart,
    };
  }

  if (liveCart.hasBlockingIssues || !liveCart.canCheckout) {
    return {
      valid: false,
      code: 'STALE_OR_INVALID_CART',
      error:
        liveCart.blockingIssues[0] ||
        'One or more items in your cart are no longer available. Please review your cart.',
      issues: liveCart.blockingIssues,
      cart: liveCart,
    };
  }

  if (
    params.expectedSubtotal !== undefined &&
    Number.isFinite(params.expectedSubtotal) &&
    Math.abs(liveCart.subtotal - params.expectedSubtotal) > 0.009
  ) {
    return {
      valid: false,
      code: 'PRICE_CHANGED',
      error: `Store prices were updated since you opened checkout (updated subtotal: ₹${liveCart.subtotal}). Please review the updated total and confirm again.`,
      cart: liveCart,
    };
  }

  return {
    valid: true,
    readyForPhase9Order: true,
    paymentMethod: 'COD',
    cart: liveCart,
    selectedAddress: mapAddressRowToDto(ownedAddress),
    subtotal: liveCart.subtotal,
    totalAmount: liveCart.subtotal,
    validatedAtIso: new Date().toISOString(),
  };
}

/**
 * Resolves the customer's authoritative default delivery location label (`${area}, ${city}`)
 * from PostgreSQL `Address` records, or returns `'Local Delivery Zone'` when none exists.
 */
export async function queryCustomerDefaultLocationLabel(
  prisma: PrismaClient,
  customerProfileId: string
): Promise<string> {
  const row = await prisma.address.findFirst({
    where: { customerProfileId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    select: {
      area: true,
      city: true,
      isDefault: true,
    },
  });

  return deriveDeliveryLocationLabel(row ? [row] : []);
}

const ORDER_SCALAR_SELECT = {
  id: true,
  orderNumber: true,
  storeId: true,
  storeNameSnapshot: true,
  storePhoneSnapshot: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  subtotal: true,
  deliveryFee: true,
  discountAmount: true,
  totalAmount: true,
  placedAt: true,
} as const;

const ORDER_ITEM_SCALAR_SELECT = {
  id: true,
  orderId: true,
  storeProductId: true,
  productNameSnapshot: true,
  brandSnapshot: true,
  unitSnapshot: true,
  imageUrlSnapshot: true,
  unitPrice: true,
  quantity: true,
  lineTotal: true,
} as const;

const ORDER_ADDRESS_SCALAR_SELECT = {
  recipientName: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  landmark: true,
  area: true,
  city: true,
  state: true,
  postalCode: true,
} as const;

function formatPlacedAtLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

/**
 * Lists real PostgreSQL orders owned strictly by `customerProfileId` (newest first).
 */
export async function queryCustomerOrders(
  prisma: PrismaClient,
  customerProfileId: string
): Promise<CustomerOrderSummaryDto[]> {
  const orderRows = await prisma.order.findMany({
    where: { customerProfileId },
    orderBy: { placedAt: 'desc' },
    select: ORDER_SCALAR_SELECT,
  });

  if (orderRows.length === 0) {
    return [];
  }

  const orderIds = orderRows.map((o) => o.id);
  const itemRows = await prisma.orderItem.findMany({
    where: { orderId: { in: orderIds } },
    orderBy: { createdAt: 'asc' },
    select: {
      orderId: true,
      productNameSnapshot: true,
      quantity: true,
    },
  });

  const itemsByOrderId = new Map<
    string,
    { name: string; quantity: number }[]
  >();
  for (const item of itemRows) {
    let list = itemsByOrderId.get(item.orderId);
    if (!list) {
      list = [];
      itemsByOrderId.set(item.orderId, list);
    }
    list.push({
      name: item.productNameSnapshot,
      quantity: item.quantity,
    });
  }

  return orderRows.map((row) => {
    const orderItems = itemsByOrderId.get(row.id) ?? [];
    const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: row.id,
      orderNumber: row.orderNumber,
      storeId: row.storeId,
      storeName: row.storeNameSnapshot,
      status: row.status as CustomerOrderStatusDto,
      paymentMethod: row.paymentMethod as CustomerPaymentMethodDto,
      paymentStatus: row.paymentStatus as CustomerPaymentStatusDto,
      subtotal: Number(toNumericValue(row.subtotal).toFixed(2)),
      deliveryFee: Number(toNumericValue(row.deliveryFee).toFixed(2)),
      discountAmount: Number(toNumericValue(row.discountAmount).toFixed(2)),
      totalAmount: Number(toNumericValue(row.totalAmount).toFixed(2)),
      placedAtIso: row.placedAt.toISOString(),
      placedAtLabel: formatPlacedAtLabel(row.placedAt),
      itemCount,
      itemsPreview: orderItems.slice(0, 3),
    };
  });
}

/**
 * Loads a single real PostgreSQL Order (by `id` or `orderNumber`) ONLY if it belongs
 * strictly to `customerProfileId`. Returns `null` for non-existent, mock, or
 * another customer's orders.
 */
export async function queryCustomerOrderDetail(
  prisma: PrismaClient,
  params: {
    customerProfileId: string;
    orderIdOrNumber: string;
  }
): Promise<CustomerOrderDetailDto | null> {
  const cleanRef = params.orderIdOrNumber?.trim() || '';
  if (!cleanRef) {
    return null;
  }

  const orderRow = await prisma.order.findFirst({
    where: {
      customerProfileId: params.customerProfileId,
      OR: [{ id: cleanRef }, { orderNumber: cleanRef }],
    },
    select: ORDER_SCALAR_SELECT,
  });

  if (!orderRow) {
    return null;
  }

  const [itemRows, addressRow, historyRows] = await Promise.all([
    prisma.orderItem.findMany({
      where: { orderId: orderRow.id },
      orderBy: { createdAt: 'asc' },
      select: ORDER_ITEM_SCALAR_SELECT,
    }),
    prisma.orderAddress.findUnique({
      where: { orderId: orderRow.id },
      select: ORDER_ADDRESS_SCALAR_SELECT,
    }),
    prisma.orderStatusHistory.findMany({
      where: { orderId: orderRow.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        status: true,
        changedByType: true,
        note: true,
        createdAt: true,
      },
    }),
  ]);

  const items: CustomerOrderItemDto[] = itemRows.map((it) => ({
    id: it.id,
    storeProductId: it.storeProductId,
    name: it.productNameSnapshot,
    brand: it.brandSnapshot ?? 'Generic',
    unit: it.unitSnapshot,
    image: it.imageUrlSnapshot || DEFAULT_PRODUCT_IMAGE,
    unitPrice: Number(toNumericValue(it.unitPrice).toFixed(2)),
    quantity: it.quantity,
    lineTotal: Number(toNumericValue(it.lineTotal).toFixed(2)),
  }));

  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

  let deliveryAddress: CustomerOrderAddressSnapshotDto | null = null;
  if (addressRow) {
    const formattedAddress = [
      addressRow.addressLine1,
      addressRow.addressLine2,
      addressRow.area,
      addressRow.city,
      `${addressRow.state} - ${addressRow.postalCode}`,
    ]
      .filter(Boolean)
      .join(', ');

    deliveryAddress = {
      recipientName: addressRow.recipientName,
      phone: addressRow.phone,
      addressLine1: addressRow.addressLine1,
      addressLine2: addressRow.addressLine2,
      landmark: addressRow.landmark,
      area: addressRow.area,
      city: addressRow.city,
      state: addressRow.state,
      postalCode: addressRow.postalCode,
      formattedAddress,
    };
  }

  const statusHistory: CustomerOrderStatusHistoryDto[] = historyRows.map((h) => ({
    id: h.id,
    status: h.status as CustomerOrderStatusDto,
    changedByType: h.changedByType,
    note: h.note,
    createdAtIso: h.createdAt.toISOString(),
    createdAtLabel: formatPlacedAtLabel(h.createdAt),
  }));

  return {
    id: orderRow.id,
    orderNumber: orderRow.orderNumber,
    storeId: orderRow.storeId,
    storeName: orderRow.storeNameSnapshot,
    storePhone: orderRow.storePhoneSnapshot,
    status: orderRow.status as CustomerOrderStatusDto,
    paymentMethod: orderRow.paymentMethod as CustomerPaymentMethodDto,
    paymentStatus: orderRow.paymentStatus as CustomerPaymentStatusDto,
    subtotal: Number(toNumericValue(orderRow.subtotal).toFixed(2)),
    deliveryFee: Number(toNumericValue(orderRow.deliveryFee).toFixed(2)),
    discountAmount: Number(toNumericValue(orderRow.discountAmount).toFixed(2)),
    totalAmount: Number(toNumericValue(orderRow.totalAmount).toFixed(2)),
    placedAtIso: orderRow.placedAt.toISOString(),
    placedAtLabel: formatPlacedAtLabel(orderRow.placedAt),
    itemCount,
    itemsPreview: items.slice(0, 3).map((it) => ({
      name: it.name,
      quantity: it.quantity,
    })),
    items,
    deliveryAddress,
    statusHistory,
  };
}
