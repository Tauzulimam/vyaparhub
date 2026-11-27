import crypto from 'node:crypto';
import type { PrismaClient } from '@/generated/prisma/client';
import {
  AccountStatus,
  MarketplaceStatus,
  OrderActorType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/enums';
import { queryCustomerCart } from '@/lib/cart/persistence';
import {
  createEmptyCustomerCartDto,
  type PlaceOrderActionResult,
} from '@/lib/cart/types';
import { formatMasterProductUnit, toNumericValue } from '@/lib/vendor/server';
import type { VendorOrder, VendorOrderStatus } from '@/types/vendor';

const DEFAULT_PRODUCT_IMAGE = '/images/placeholder-product.svg';
const ORDER_NUMBER_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Strict vendor-controlled forward-only order lifecycle transitions:
 * PLACED -> ACCEPTED -> PREPARING -> READY_FOR_PICKUP
 */
export const ALLOWED_VENDOR_NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PLACED]: OrderStatus.ACCEPTED,
  [OrderStatus.ACCEPTED]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.READY_FOR_PICKUP,
};

const VENDOR_STATUS_HISTORY_NOTE: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.ACCEPTED]: 'Store accepted your order.',
  [OrderStatus.PREPARING]: 'Store started preparing your items.',
  [OrderStatus.READY_FOR_PICKUP]: 'Order is packed and ready for pickup.',
};

function generateRecordId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Generates a unique, collision-safe, human-readable server-side order number:
 * Format: `VYP-YYYY-XXXXXX` (e.g. `VYP-2026-8F4K2M`).
 */
export function generateOrderNumber(now: Date = new Date()): string {
  const year = new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(now);

  const bytes = crypto.randomBytes(6);
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += ORDER_NUMBER_ALPHABET[bytes[i] % ORDER_NUMBER_ALPHABET.length];
  }

  return `VYP-${year}-${suffix}`;
}

function isPrismaUniqueOrderNumberError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  const code = (error as { code?: string }).code;
  if (code !== 'P2002') {
    return false;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('orderNumber') || msg.includes('orders_orderNumber_key');
}

function isConcurrentRaceOrConstraintError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
  if (code === 'P2025' || code === 'P2034') {
    return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('store_products_stock_non_negative_chk') ||
    msg.includes('23514') ||
    msg.includes('Record to update not found') ||
    msg.includes('Record to delete does not exist')
  );
}

export interface ExecutePlaceCustomerOrderParams {
  customerUserId: string;
  customerProfileId: string;
  addressId: string;
  paymentMethod?: string;
  expectedSubtotal?: number;
  customerNote?: string;
}

/**
 * Server-authoritative atomic COD order placement:
 * 1. Revalidates Customer, Address ownership, Cart, Store eligibility, StoreProduct
 *    availability & live stock, MasterProduct/Category active status, live selling prices,
 *    and optional client `expectedSubtotal` price-drift check.
 * 2. Atomically executes a single non-interactive Prisma batch transaction (`prisma.$transaction([...])`)
 *    with scalar-only selects (Supabase Supavisor transaction-pooler safe):
 *    - Deletes the verified `Cart` row (cascading `CartItem`s) — prevents double submission.
 *    - Conditionally decrements each `StoreProduct.stockQuantity` (`stockQuantity >= quantity`,
 *      backed by PostgreSQL `store_products_stock_non_negative_chk`).
 *    - Marks any resulting zero-stock `StoreProduct` as `isAvailable = false`.
 *    - Inserts `Order`, snapshotted `OrderItem`s, snapshotted `OrderAddress`, and initial
 *      `OrderStatusHistory` (`PLACED`).
 * 3. If any check or concurrent write fails, zero partial `Order` or inventory mutations persist
 *    and the customer's `Cart` remains intact for correction.
 */
export async function executePlaceCustomerOrder(
  prisma: PrismaClient,
  params: ExecutePlaceCustomerOrderParams
): Promise<PlaceOrderActionResult> {
  const paymentMethod = params.paymentMethod ?? 'COD';
  if (paymentMethod !== 'COD') {
    return {
      success: false,
      code: 'INVALID_PAYMENT_METHOD',
      error: 'Only Cash on Delivery (COD) is supported for order placement.',
    };
  }

  const cleanAddressId = params.addressId?.trim() || '';
  if (!cleanAddressId) {
    return {
      success: false,
      code: 'ADDRESS_REQUIRED',
      error: 'Please select a delivery address before placing your order.',
    };
  }

  // 1. Revalidate Customer + CustomerProfile + Owned Address + Cart in parallel
  const [userRow, profileRow, ownedAddress, cartRow] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.customerUserId },
      select: {
        id: true,
        role: true,
        accountStatus: true,
      },
    }),
    prisma.customerProfile.findUnique({
      where: { id: params.customerProfileId },
      select: {
        id: true,
        userId: true,
      },
    }),
    prisma.address.findFirst({
      where: {
        id: cleanAddressId,
        customerProfileId: params.customerProfileId,
      },
      select: {
        id: true,
        recipientName: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        landmark: true,
        area: true,
        city: true,
        state: true,
        postalCode: true,
        latitude: true,
        longitude: true,
      },
    }),
    prisma.cart.findUnique({
      where: { customerProfileId: params.customerProfileId },
      select: {
        id: true,
        customerProfileId: true,
        storeId: true,
      },
    }),
  ]);

  if (!userRow || !profileRow || profileRow.userId !== userRow.id) {
    return {
      success: false,
      code: 'UNAUTHENTICATED',
      error: 'Please sign in with an active customer account to place an order.',
    };
  }

  if (userRow.role !== UserRole.CUSTOMER) {
    return {
      success: false,
      code: 'FORBIDDEN_ROLE',
      error: 'Only customer accounts can place marketplace orders.',
    };
  }

  if (userRow.accountStatus !== AccountStatus.ACTIVE) {
    return {
      success: false,
      code: 'ACCOUNT_INACTIVE',
      error: 'Your customer account is not active.',
    };
  }

  if (!ownedAddress) {
    const liveCart = await queryCustomerCart(prisma, params.customerProfileId);
    return {
      success: false,
      code: 'ADDRESS_UNAUTHORIZED',
      error: 'Selected delivery address was not found in your account.',
      cart: liveCart,
    };
  }

  if (!cartRow) {
    return {
      success: false,
      code: 'EMPTY_CART',
      error: 'Your cart is empty. Add items from an open store before placing an order.',
      cart: createEmptyCustomerCartDto(),
    };
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
      where: { id: cartRow.id, customerProfileId: params.customerProfileId },
    });
    return {
      success: false,
      code: 'EMPTY_CART',
      error: 'Your cart is empty. Add items from an open store before placing an order.',
      cart: createEmptyCustomerCartDto(),
    };
  }

  // 2. Revalidate Store, Vendor, Categories, MasterProducts, and StoreProducts
  const storeProductIds = cartItemRows.map((ci) => ci.storeProductId);
  const [storeRow, storeProductRows] = await Promise.all([
    prisma.store.findUnique({
      where: { id: cartRow.storeId },
      select: {
        id: true,
        vendorProfileId: true,
        categoryId: true,
        name: true,
        phone: true,
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
    const liveCart = await queryCustomerCart(prisma, params.customerProfileId);
    return {
      success: false,
      code: 'STORE_INELIGIBLE',
      error: 'The selected store is no longer available.',
      cart: liveCart,
    };
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
        isActive: true,
      },
    }),
  ]);

  const categoriesById = new Map(categoryRows.map((c) => [c.id, c]));
  const storeCategoryActive = categoriesById.get(storeRow.categoryId)?.isActive ?? false;

  const storeEligible =
    storeRow.isOpen &&
    storeRow.marketplaceStatus === MarketplaceStatus.ACTIVE &&
    storeRow.verificationStatus !== VerificationStatus.REJECTED &&
    storeCategoryActive &&
    vendorProfileRow !== null &&
    vendorProfileRow.verificationStatus !== VerificationStatus.REJECTED &&
    vendorUserRow !== null &&
    vendorUserRow.role === UserRole.VENDOR &&
    vendorUserRow.accountStatus === AccountStatus.ACTIVE;

  if (!storeEligible) {
    const liveCart = await queryCustomerCart(prisma, params.customerProfileId);
    return {
      success: false,
      code: 'STORE_INELIGIBLE',
      error:
        liveCart.blockingIssues[0] ||
        `${storeRow.name} is currently closed or unavailable for orders.`,
      issues: liveCart.blockingIssues,
      cart: liveCart,
    };
  }

  const storeProductsById = new Map(storeProductRows.map((sp) => [sp.id, sp]));
  const mastersById = new Map(masterRows.map((m) => [m.id, m]));

  interface VerifiedOrderLine {
    storeProductId: string;
    masterProductId: string;
    productNameSnapshot: string;
    brandSnapshot: string | null;
    unitSnapshot: string;
    imageUrlSnapshot: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }

  const verifiedLines: VerifiedOrderLine[] = [];
  let subtotal = 0;

  for (const ci of cartItemRows) {
    if (!Number.isInteger(ci.quantity) || ci.quantity < 1) {
      const liveCart = await queryCustomerCart(prisma, params.customerProfileId);
      return {
        success: false,
        code: 'STALE_OR_INVALID_CART',
        error: 'Invalid item quantity in cart.',
        cart: liveCart,
      };
    }

    const sp = storeProductsById.get(ci.storeProductId);
    const mp = sp ? mastersById.get(sp.masterProductId) : undefined;
    const prodCategory = mp ? categoriesById.get(mp.categoryId) : undefined;

    if (!sp || !mp || !prodCategory || sp.storeId !== storeRow.id) {
      const liveCart = await queryCustomerCart(prisma, params.customerProfileId);
      return {
        success: false,
        code: 'STALE_OR_INVALID_CART',
        error:
          liveCart.blockingIssues[0] ||
          'One or more items in your cart are no longer available.',
        issues: liveCart.blockingIssues,
        cart: liveCart,
      };
    }

    if (!mp.isActive || !prodCategory.isActive || !sp.isAvailable) {
      const liveCart = await queryCustomerCart(prisma, params.customerProfileId);
      return {
        success: false,
        code: 'STALE_OR_INVALID_CART',
        error:
          liveCart.blockingIssues[0] ||
          `"${mp.name}" is currently unavailable at ${storeRow.name}.`,
        issues: liveCart.blockingIssues,
        cart: liveCart,
      };
    }

    if (sp.stockQuantity <= 0 || ci.quantity > sp.stockQuantity) {
      const liveCart = await queryCustomerCart(prisma, params.customerProfileId);
      return {
        success: false,
        code: 'INSUFFICIENT_STOCK',
        error:
          sp.stockQuantity <= 0
            ? `"${mp.name}" is out of stock at ${storeRow.name}.`
            : `Only ${sp.stockQuantity} ${sp.stockQuantity === 1 ? 'unit' : 'units'} of "${mp.name}" available in stock.`,
        issues: liveCart.blockingIssues,
        cart: liveCart,
      };
    }

    const unitPrice = Number(toNumericValue(sp.sellingPrice).toFixed(2));
    const lineTotal = Number((unitPrice * ci.quantity).toFixed(2));
    const unitVal = Number(toNumericValue(mp.unitValue).toFixed(3));

    verifiedLines.push({
      storeProductId: sp.id,
      masterProductId: mp.id,
      productNameSnapshot: mp.name,
      brandSnapshot: mp.brand?.trim() || null,
      unitSnapshot: formatMasterProductUnit(unitVal, mp.unitType),
      imageUrlSnapshot: mp.imageUrl || DEFAULT_PRODUCT_IMAGE,
      unitPrice,
      quantity: ci.quantity,
      lineTotal,
    });

    subtotal = Number((subtotal + lineTotal).toFixed(2));
  }

  // 3. Price-drift guard against stale client subtotal
  if (
    params.expectedSubtotal !== undefined &&
    Number.isFinite(params.expectedSubtotal) &&
    Math.abs(subtotal - params.expectedSubtotal) > 0.009
  ) {
    const liveCart = await queryCustomerCart(prisma, params.customerProfileId);
    return {
      success: false,
      code: 'PRICE_CHANGED',
      error: `Store prices changed since you opened checkout (updated total: ₹${subtotal}). Please review the updated total and place your order again.`,
      cart: liveCart,
    };
  }

  const deliveryFee = 0;
  const discountAmount = 0;
  const totalAmount = Number((subtotal + deliveryFee - discountAmount).toFixed(2));

  const hasBothCoords =
    ownedAddress.latitude !== null &&
    ownedAddress.latitude !== undefined &&
    ownedAddress.longitude !== null &&
    ownedAddress.longitude !== undefined;

  const cleanNote = params.customerNote?.trim().slice(0, 240) || '';
  const initialHistoryNote = cleanNote
    ? `Order placed (Cash on Delivery). Note: ${cleanNote}`
    : 'Order placed (Cash on Delivery).';

  // 4. Atomic non-interactive Prisma batch execution (up to 3 retries on orderNumber collision)
  for (let attempt = 0; attempt < 3; attempt++) {
    const orderId = generateRecordId('ord');
    const orderNumber = generateOrderNumber();
    const placedAt = new Date();

    try {
      await prisma.$transaction([
        // Claim & delete verified cart first (prevents concurrent duplicate submissions)
        prisma.cart.delete({
          where: {
            id: cartRow.id,
          },
          select: { id: true },
        }),
        // Conditional atomic stock decrements (enforces stockQuantity >= quantity + non-negative CHECK)
        ...verifiedLines.map((line) =>
          prisma.storeProduct.update({
            where: {
              id: line.storeProductId,
              storeId: storeRow.id,
              isAvailable: true,
              stockQuantity: { gte: line.quantity },
            },
            data: {
              stockQuantity: { decrement: line.quantity },
            },
            select: { id: true },
          })
        ),
        // Auto-mark any depleted StoreProduct (stockQuantity === 0) as unavailable
        prisma.storeProduct.updateMany({
          where: {
            id: { in: verifiedLines.map((l) => l.storeProductId) },
            stockQuantity: 0,
            isAvailable: true,
          },
          data: {
            isAvailable: false,
          },
        }),
        // Create Order header
        prisma.order.create({
          data: {
            id: orderId,
            orderNumber,
            customerProfileId: params.customerProfileId,
            storeId: storeRow.id,
            storeNameSnapshot: storeRow.name,
            storePhoneSnapshot: storeRow.phone || null,
            addressId: ownedAddress.id,
            status: OrderStatus.PLACED,
            paymentMethod: PaymentMethod.COD,
            paymentStatus: PaymentStatus.PENDING,
            subtotal,
            deliveryFee,
            discountAmount,
            totalAmount,
            placedAt,
          },
          select: { id: true },
        }),
        // Create immutable OrderItem commercial snapshots
        prisma.orderItem.createMany({
          data: verifiedLines.map((line) => ({
            id: generateRecordId('oi'),
            orderId,
            masterProductId: line.masterProductId,
            storeProductId: line.storeProductId,
            productNameSnapshot: line.productNameSnapshot,
            brandSnapshot: line.brandSnapshot,
            unitSnapshot: line.unitSnapshot,
            imageUrlSnapshot: line.imageUrlSnapshot,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            lineTotal: line.lineTotal,
          })),
        }),
        // Create immutable OrderAddress delivery snapshot
        prisma.orderAddress.create({
          data: {
            id: generateRecordId('oa'),
            orderId,
            recipientName: ownedAddress.recipientName,
            phone: ownedAddress.phone,
            addressLine1: ownedAddress.addressLine1,
            addressLine2: ownedAddress.addressLine2,
            landmark: ownedAddress.landmark,
            area: ownedAddress.area,
            city: ownedAddress.city,
            state: ownedAddress.state,
            postalCode: ownedAddress.postalCode,
            latitude: hasBothCoords ? ownedAddress.latitude : null,
            longitude: hasBothCoords ? ownedAddress.longitude : null,
          },
          select: { id: true },
        }),
        // Create initial OrderStatusHistory audit entry
        prisma.orderStatusHistory.create({
          data: {
            id: generateRecordId('osh'),
            orderId,
            status: OrderStatus.PLACED,
            changedByType: OrderActorType.CUSTOMER,
            changedById: params.customerUserId,
            note: initialHistoryNote,
          },
          select: { id: true },
        }),
      ]);

      return {
        success: true,
        orderId,
        orderNumber,
        totalAmount,
      };
    } catch (error: unknown) {
      if (isPrismaUniqueOrderNumberError(error) && attempt < 2) {
        continue;
      }

      if (isConcurrentRaceOrConstraintError(error)) {
        const refreshedCart = await queryCustomerCart(prisma, params.customerProfileId);

        if (refreshedCart.items.length === 0) {
          return {
            success: false,
            code: 'DUPLICATE_SUBMISSION',
            error: 'Your order was already submitted or your cart was cleared.',
            cart: refreshedCart,
          };
        }

        const hasInsufficient = refreshedCart.items.some(
          (i) => i.issueCode === 'OUT_OF_STOCK' || i.issueCode === 'INSUFFICIENT_STOCK'
        );

        return {
          success: false,
          code: hasInsufficient ? 'INSUFFICIENT_STOCK' : 'STALE_OR_INVALID_CART',
          error:
            refreshedCart.blockingIssues[0] ||
            'Stock availability changed while placing your order. Please review your cart and try again.',
          issues: refreshedCart.blockingIssues,
          cart: refreshedCart,
        };
      }

      throw error;
    }
  }

  return {
    success: false,
    code: 'ORDER_CREATION_FAILED',
    error: 'Could not generate a unique order number. Please try again.',
  };
}

function formatVendorPlacedAt(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function extractCustomerNoteFromInitialHistory(note: string | null | undefined): string | undefined {
  if (!note) return undefined;
  const marker = 'Note: ';
  const idx = note.indexOf(marker);
  if (idx >= 0) {
    const extracted = note.slice(idx + marker.length).trim();
    return extracted || undefined;
  }
  return undefined;
}

/**
 * Loads real PostgreSQL orders strictly for the provided `storeIds` (scalar-only queries).
 * Never exposes customer `User.email` or `User.authUserId` — uses only the checkout
 * `OrderAddress` recipient snapshot needed for store fulfillment.
 */
export async function queryVendorOrdersForStores(
  prisma: PrismaClient,
  storeIds: string[]
): Promise<VendorOrder[]> {
  if (storeIds.length === 0) {
    return [];
  }

  const orderRows = await prisma.order.findMany({
    where: { storeId: { in: storeIds } },
    orderBy: { placedAt: 'desc' },
    select: {
      id: true,
      storeId: true,
      orderNumber: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      subtotal: true,
      deliveryFee: true,
      totalAmount: true,
      placedAt: true,
    },
  });

  if (orderRows.length === 0) {
    return [];
  }

  const orderIds = orderRows.map((o) => o.id);

  const [itemRows, addressRows, placedHistoryRows] = await Promise.all([
    prisma.orderItem.findMany({
      where: { orderId: { in: orderIds } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        orderId: true,
        storeProductId: true,
        productNameSnapshot: true,
        brandSnapshot: true,
        unitSnapshot: true,
        imageUrlSnapshot: true,
        unitPrice: true,
        quantity: true,
      },
    }),
    prisma.orderAddress.findMany({
      where: { orderId: { in: orderIds } },
      select: {
        id: true,
        orderId: true,
        recipientName: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        landmark: true,
        area: true,
        city: true,
        postalCode: true,
      },
    }),
    prisma.orderStatusHistory.findMany({
      where: {
        orderId: { in: orderIds },
        status: OrderStatus.PLACED,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        orderId: true,
        note: true,
      },
    }),
  ]);

  const itemsByOrderId = new Map<string, VendorOrder['items']>();
  for (const it of itemRows) {
    let list = itemsByOrderId.get(it.orderId);
    if (!list) {
      list = [];
      itemsByOrderId.set(it.orderId, list);
    }
    const price = Number(toNumericValue(it.unitPrice).toFixed(2));
    list.push({
      id: it.id,
      productId: it.storeProductId,
      name: it.productNameSnapshot,
      brand: it.brandSnapshot ?? 'Generic',
      unit: it.unitSnapshot,
      price,
      mrp: price,
      quantity: it.quantity,
      image: it.imageUrlSnapshot || DEFAULT_PRODUCT_IMAGE,
    });
  }

  const addressByOrderId = new Map(addressRows.map((a) => [a.orderId, a]));
  const noteByOrderId = new Map<string, string | undefined>();
  for (const h of placedHistoryRows) {
    if (!noteByOrderId.has(h.orderId)) {
      noteByOrderId.set(h.orderId, extractCustomerNoteFromInitialHistory(h.note));
    }
  }

  return orderRows.map((row) => {
    const addr = addressByOrderId.get(row.id);
    const addressLineParts = [
      addr?.addressLine1,
      addr?.addressLine2,
      addr?.area,
    ].filter(Boolean);

    return {
      id: row.id,
      storeId: row.storeId,
      orderNumber: row.orderNumber,
      customerName: addr?.recipientName ?? 'Customer',
      customerPhone: addr?.phone ?? '',
      placedAt: formatVendorPlacedAt(row.placedAt),
      placedAtIso: row.placedAt.toISOString(),
      items: itemsByOrderId.get(row.id) ?? [],
      subtotal: Number(toNumericValue(row.subtotal).toFixed(2)),
      deliveryFee: Number(toNumericValue(row.deliveryFee).toFixed(2)),
      total: Number(toNumericValue(row.totalAmount).toFixed(2)),
      status: row.status as VendorOrderStatus,
      deliveryAddress: {
        id: addr?.id ?? row.id,
        tag: 'Home',
        name: addr?.recipientName ?? 'Customer',
        phone: addr?.phone ?? '',
        addressLine: addressLineParts.join(', ') || 'Delivery address',
        landmark: addr?.landmark ?? undefined,
        city: addr?.city ?? '',
        pincode: addr?.postalCode ?? '',
      },
      note: noteByOrderId.get(row.id),
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
    };
  });
}

/**
 * Loads real PostgreSQL orders strictly for ONE owned Store (`storeId` must belong
 * to `vendorProfileId`). Returns an empty array if the store is not owned by the vendor.
 */
export async function queryVendorStoreOrders(
  prisma: PrismaClient,
  params: {
    vendorProfileId: string;
    storeId: string;
  }
): Promise<VendorOrder[]> {
  const cleanStoreId = params.storeId?.trim() || '';
  if (!cleanStoreId) {
    return [];
  }

  const ownedStore = await prisma.store.findFirst({
    where: {
      id: cleanStoreId,
      vendorProfileId: params.vendorProfileId,
    },
    select: { id: true },
  });

  if (!ownedStore) {
    return [];
  }

  return queryVendorOrdersForStores(prisma, [ownedStore.id]);
}

export type VendorOrderTransitionResult =
  | {
      success: true;
      order: VendorOrder;
    }
  | {
      success: false;
      code:
        | 'UNAUTHORIZED'
        | 'ORDER_NOT_FOUND'
        | 'INVALID_STATUS_VALUE'
        | 'INVALID_TRANSITION';
      error: string;
    };

const VALID_ORDER_STATUS_SET = new Set<string>(Object.values(OrderStatus));

/**
 * Server-authoritative vendor order status transition:
 * - Verifies `vendorUserId` is an ACTIVE VENDOR owning `vendorProfileId`.
 * - Verifies `activeStoreId` belongs to `vendorProfileId`.
 * - Verifies `orderId` belongs strictly to `activeStoreId` (multi-store & cross-vendor isolation).
 * - Allows ONLY the exact next step in `PLACED -> ACCEPTED -> PREPARING -> READY_FOR_PICKUP`.
 * - Atomically updates `Order.status` and appends `OrderStatusHistory` in a 2-statement
 *   non-interactive Prisma batch transaction.
 */
export async function executeVendorOrderStatusTransition(
  prisma: PrismaClient,
  params: {
    vendorUserId: string;
    vendorProfileId: string;
    activeStoreId: string | null;
    orderId: string;
    requestedNextStatus: string;
  }
): Promise<VendorOrderTransitionResult> {
  const cleanOrderId = params.orderId?.trim() || '';
  const cleanRequested = params.requestedNextStatus?.trim() || '';

  if (!cleanOrderId) {
    return {
      success: false,
      code: 'ORDER_NOT_FOUND',
      error: 'Invalid order reference.',
    };
  }

  if (!VALID_ORDER_STATUS_SET.has(cleanRequested)) {
    return {
      success: false,
      code: 'INVALID_STATUS_VALUE',
      error: 'Invalid target order status.',
    };
  }

  const targetStatus = cleanRequested as OrderStatus;

  if (!params.activeStoreId) {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      error: 'No active store selected for your vendor account.',
    };
  }

  const [vendorUser, ownedActiveStore] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.vendorUserId },
      select: {
        id: true,
        role: true,
        accountStatus: true,
      },
    }),
    prisma.store.findFirst({
      where: {
        id: params.activeStoreId,
        vendorProfileId: params.vendorProfileId,
      },
      select: { id: true },
    }),
  ]);

  if (
    !vendorUser ||
    vendorUser.role !== UserRole.VENDOR ||
    vendorUser.accountStatus !== AccountStatus.ACTIVE ||
    !ownedActiveStore
  ) {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      error: 'You are not authorized to manage orders for this store.',
    };
  }

  const existingOrder = await prisma.order.findFirst({
    where: {
      id: cleanOrderId,
      storeId: ownedActiveStore.id,
    },
    select: {
      id: true,
      storeId: true,
      status: true,
    },
  });

  if (!existingOrder) {
    return {
      success: false,
      code: 'ORDER_NOT_FOUND',
      error: 'Order not found in your currently active store.',
    };
  }

  const expectedNextStatus = ALLOWED_VENDOR_NEXT_STATUS[existingOrder.status];
  if (!expectedNextStatus || expectedNextStatus !== targetStatus) {
    return {
      success: false,
      code: 'INVALID_TRANSITION',
      error: expectedNextStatus
        ? `Invalid status transition from ${existingOrder.status} to ${targetStatus}. Next allowed status is ${expectedNextStatus}.`
        : `Order in status ${existingOrder.status} cannot be advanced further by the store.`,
    };
  }

  try {
    await prisma.$transaction([
      prisma.order.update({
        where: {
          id: existingOrder.id,
          storeId: ownedActiveStore.id,
          status: existingOrder.status,
        },
        data: {
          status: targetStatus,
        },
        select: { id: true },
      }),
      prisma.orderStatusHistory.create({
        data: {
          id: generateRecordId('osh'),
          orderId: existingOrder.id,
          status: targetStatus,
          changedByType: OrderActorType.VENDOR,
          changedById: vendorUser.id,
          note:
            VENDOR_STATUS_HISTORY_NOTE[targetStatus] ??
            `Order status updated to ${targetStatus}.`,
        },
        select: { id: true },
      }),
    ]);
  } catch (error: unknown) {
    if (isConcurrentRaceOrConstraintError(error)) {
      return {
        success: false,
        code: 'INVALID_TRANSITION',
        error: 'Order status was just updated. Please refresh to view the latest status.',
      };
    }
    throw error;
  }

  const refreshedOrders = await queryVendorOrdersForStores(prisma, [ownedActiveStore.id]);
  const updatedDto = refreshedOrders.find((o) => o.id === existingOrder.id);

  if (!updatedDto) {
    return {
      success: false,
      code: 'ORDER_NOT_FOUND',
      error: 'Updated order could not be reloaded.',
    };
  }

  return {
    success: true,
    order: updatedDto,
  };
}
