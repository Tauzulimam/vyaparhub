import type { Address, OrderItem } from '@/types';

/** Universal product owned by the admin-controlled Master Product Catalog. */
export interface MasterProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  unit: string;
  mrp: number;
  image: string;
  active: boolean;
}

/** A master product sold by the vendor's store (vendor-specific data only). */
export interface StoreProduct {
  id: string;
  storeId: string;
  masterProductId: string;
  sellingPrice: number;
  quantity: number;
  available: boolean;
}

export type StockState = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type GstStatus = 'REGISTERED' | 'NOT_REGISTERED';

export interface VendorStoreInfo {
  id: string;
  name: string;
  ownerName: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  openTime: string;
  closeTime: string;
  deliveryRadiusKm: number;
  minOrderAmount: number;
  acceptingOrders: boolean;
  isOpen: boolean;
  codEnabled: boolean;
  gstStatus: GstStatus;
  /** Only present when gstStatus is REGISTERED. */
  gstin?: string;
  /** Verified GSTINs are read-only; changes need support re-verification (future). */
  gstVerified: boolean;
  /** Real DB fields from Store and Category */
  verificationStatus?: string;
  marketplaceStatus?: string;
  addressLine1?: string;
  addressLine2?: string;
  area?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  categoryId?: string;
}

export interface VendorProfileDto {
  id: string;
  userId: string;
  ownerName: string;
  registeredMobile: string;
  businessEmail: string;
  verificationStatus: string;
  verifiedAt: string | null;
}

export interface CategoryOptionDto {
  id: string;
  name: string;
  slug: string;
}

export interface CreateStoreInput {
  name: string;
  categoryId: string;
  description?: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  openingTime: string;
  closingTime: string;
  deliveryRadiusKm: number;
  minimumOrderAmount: number;
  gstStatus: GstStatus;
  gstin?: string;
}

export interface UpdateStoreDetailsInput {
  description?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  area?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  openingTime?: string;
  closingTime?: string;
  deliveryRadiusKm?: number;
  minimumOrderAmount?: number;
}

export type VendorOrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY' // "Ready for Pickup" — last vendor-controlled status
  // Below: delivery-partner workflow (future). Vendors can only view these.
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface VendorOrder {
  id: string;
  storeId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  placedAt: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: VendorOrderStatus;
  deliveryAddress: Address;
  note?: string;
  paymentMethod: 'COD' | 'MOCK_UPI' | 'MOCK_CARD';
  paymentStatus: 'PENDING' | 'PAID';
}

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'TRIAL';

export interface SubscriptionPlan {
  id: 'monthly' | 'annual';
  name: string;
  price: number;
  period: string;
  savingsNote?: string;
  features: string[];
}

export interface VendorSubscription {
  planId: SubscriptionPlan['id'];
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string;
  daysRemaining: number;
}

export type DocumentStatus = 'PAID' | 'SETTLED' | 'PENDING';

/** VyaparHub subscription/service invoice paid by the vendor. */
export interface VendorInvoice {
  id: string;
  invoiceNumber: string;
  billingPeriod: string;
  financialYear: string;
  date: string;
  description: string;
  planName: string;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: DocumentStatus;
}

/** Vendor sales & settlement statement for order activity. */
export interface VendorSettlementStatement {
  id: string;
  statementNumber: string;
  storeId: string;
  billingPeriod: string;
  financialYear: string;
  date: string;
  ordersCount: number;
  grossOrderSales: number;
  platformServiceFees: number;
  refundsAndCancellations: number;
  netSettlementAmount: number;
  status: DocumentStatus;
}

