export type CartAuthStatus =
  | 'authenticated_customer'
  | 'unauthenticated'
  | 'forbidden_role'
  | 'inactive_account'
  | 'missing_profile';

export type CartIssueCode =
  | 'STORE_CLOSED'
  | 'STORE_SUSPENDED'
  | 'STORE_REJECTED'
  | 'STORE_INELIGIBLE'
  | 'PRODUCT_UNAVAILABLE'
  | 'OUT_OF_STOCK'
  | 'INSUFFICIENT_STOCK'
  | 'MASTER_PRODUCT_INACTIVE';

export interface CustomerCartItemDto {
  cartItemId: string;
  storeProductId: string;
  masterProductId: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  image: string;
  unitPrice: number;
  mrp: number;
  quantity: number;
  lineSubtotal: number;
  stockQuantity: number;
  isAvailable: boolean;
  issueCode: CartIssueCode | null;
  issueMessage: string | null;
}

export interface CustomerCartStoreDto {
  id: string;
  name: string;
  category: string;
  address: string;
  area: string;
  city: string;
  timing?: string;
  deliveryTimeMin: string;
  deliveryRadiusKm: number;
  minOrderAmount: number;
  isOpen: boolean;
  isEligibleForCheckout: boolean;
  statusIssueCode: CartIssueCode | null;
  statusIssueMessage: string | null;
}

export interface CustomerCartDto {
  cartId: string | null;
  store: CustomerCartStoreDto | null;
  items: CustomerCartItemDto[];
  itemCount: number;
  lineCount: number;
  subtotal: number;
  hasBlockingIssues: boolean;
  blockingIssues: string[];
  canCheckout: boolean;
}

export type CustomerAddressTag = 'Home' | 'Work' | 'Other';

export interface CustomerAddressDto {
  id: string;
  label: 'HOME' | 'WORK' | 'OTHER';
  tag: CustomerAddressTag;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  formattedAddress: string;
  isDefault: boolean;
}

export interface CreateCustomerAddressInput {
  tag: CustomerAddressTag;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
}

export type CartMutationErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_ROLE'
  | 'ACCOUNT_INACTIVE'
  | 'STORE_CONFLICT'
  | 'OUT_OF_STOCK'
  | 'INSUFFICIENT_STOCK'
  | 'PRODUCT_INELIGIBLE'
  | 'STORE_INELIGIBLE'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR';

export interface ConflictStoreInfo {
  id: string;
  name: string;
}

export type CartActionResult =
  | {
      success: true;
      cart: CustomerCartDto;
    }
  | {
      success: false;
      code: CartMutationErrorCode;
      error: string;
      conflictStore?: ConflictStoreInfo;
      cart?: CustomerCartDto;
    };

export interface CustomerProfileDto {
  userId: string;
  customerProfileId: string;
  fullName: string;
  email: string;
  phone: string;
  createdAtIso: string;
  memberSinceLabel: string;
  orderCount: number;
}

export type ProfileUpdateActionResult =
  | {
      success: true;
      fullName: string;
    }
  | {
      success: false;
      error: string;
    };

export type AddressListActionResult =
  | {
      success: true;
      addresses: CustomerAddressDto[];
    }
  | {
      success: false;
      error: string;
    };

export type AddressActionResult =
  | {
      success: true;
      address: CustomerAddressDto;
      addresses: CustomerAddressDto[];
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string>;
    };

export type CheckoutValidationErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_ROLE'
  | 'EMPTY_CART'
  | 'STALE_OR_INVALID_CART'
  | 'PRICE_CHANGED'
  | 'ADDRESS_REQUIRED'
  | 'ADDRESS_UNAUTHORIZED'
  | 'INVALID_PAYMENT_METHOD';

export type CheckoutValidationResult =
  | {
      valid: true;
      readyForPhase9Order: true;
      paymentMethod: 'COD';
      cart: CustomerCartDto;
      selectedAddress: CustomerAddressDto;
      subtotal: number;
      totalAmount: number;
      validatedAtIso: string;
    }
  | {
      valid: false;
      code: CheckoutValidationErrorCode;
      error: string;
      issues?: string[];
      cart?: CustomerCartDto;
    };

export const DEFAULT_DELIVERY_LOCATION_LABEL = 'Local Delivery Zone';

export function deriveDeliveryLocationLabel(
  addresses: ReadonlyArray<Pick<CustomerAddressDto, 'area' | 'city' | 'isDefault'>>
): string {
  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  if (defaultAddr && defaultAddr.area.trim() && defaultAddr.city.trim()) {
    return `${defaultAddr.area.trim()}, ${defaultAddr.city.trim()}`;
  }
  return DEFAULT_DELIVERY_LOCATION_LABEL;
}

export type CustomerOrderStatusDto =
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type CustomerPaymentMethodDto = 'COD' | 'UPI' | 'CARD';

export type CustomerPaymentStatusDto = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface CustomerOrderItemDto {
  id: string;
  storeProductId: string;
  name: string;
  brand: string;
  unit: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CustomerOrderAddressSnapshotDto {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  formattedAddress: string;
}

export interface CustomerOrderSummaryDto {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  status: CustomerOrderStatusDto;
  paymentMethod: CustomerPaymentMethodDto;
  paymentStatus: CustomerPaymentStatusDto;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  placedAtIso: string;
  placedAtLabel: string;
  itemCount: number;
  itemsPreview: { name: string; quantity: number }[];
}

export interface CustomerOrderStatusHistoryDto {
  id: string;
  status: CustomerOrderStatusDto;
  changedByType: 'CUSTOMER' | 'VENDOR' | 'ADMIN' | 'SYSTEM' | 'DELIVERY';
  note: string | null;
  createdAtIso: string;
  createdAtLabel: string;
}

export interface CustomerOrderDetailDto extends CustomerOrderSummaryDto {
  storePhone: string | null;
  items: CustomerOrderItemDto[];
  deliveryAddress: CustomerOrderAddressSnapshotDto | null;
  statusHistory: CustomerOrderStatusHistoryDto[];
}

export type PlaceOrderErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_ROLE'
  | 'ACCOUNT_INACTIVE'
  | 'EMPTY_CART'
  | 'STALE_OR_INVALID_CART'
  | 'PRICE_CHANGED'
  | 'INSUFFICIENT_STOCK'
  | 'STORE_INELIGIBLE'
  | 'ADDRESS_REQUIRED'
  | 'ADDRESS_UNAUTHORIZED'
  | 'INVALID_PAYMENT_METHOD'
  | 'DUPLICATE_SUBMISSION'
  | 'ORDER_CREATION_FAILED';

export type PlaceOrderActionResult =
  | {
      success: true;
      orderId: string;
      orderNumber: string;
      totalAmount: number;
    }
  | {
      success: false;
      code: PlaceOrderErrorCode;
      error: string;
      issues?: string[];
      cart?: CustomerCartDto;
    };

export function createEmptyCustomerCartDto(): CustomerCartDto {
  return {
    cartId: null,
    store: null,
    items: [],
    itemCount: 0,
    lineCount: 0,
    subtotal: 0,
    hasBlockingIssues: false,
    blockingIssues: [],
    canCheckout: false,
  };
}
