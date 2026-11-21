export type DateRangePreset =
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'THIS_YEAR'
  | 'CUSTOM';

export type ChartGranularity = 'daily' | 'monthly' | 'quarterly';

export type AdminOrderStatus =
  | 'ORDER_PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type CancellationReasonKey =
  | 'CUSTOMER_CANCELLED'
  | 'STORE_REJECTED'
  | 'ITEM_UNAVAILABLE'
  | 'STORE_UNABLE_TO_FULFIL'
  | 'DELIVERY_ISSUE'
  | 'PAYMENT_ISSUE'
  | 'DUPLICATE_ORDER'
  | 'OTHER';

export type CancelledByActor = 'Customer' | 'Vendor' | 'Delivery' | 'System';

export type CancellationAttributionGroup = 'CUSTOMER' | 'VENDOR' | 'DELIVERY_SYSTEM';

export type AdminSubscriptionStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

export type SubscriptionBillingCycle = 'Monthly' | 'Annual';

export interface SubscriptionPaymentRecord {
  id: string;
  invoiceNumber: string;
  paidOn: string;
  periodCovered: string;
  planName: 'Monthly Plan' | 'Annual Plan';
  billingCycle: SubscriptionBillingCycle;
  amount: number;
  paymentMode: 'UPI AutoPay (Mock)' | 'NetBanking (Mock)' | 'Card (Mock)';
  status: 'PAID';
}

export interface AdminSubscriptionRecord {
  id: string;
  storeId: string;
  storeName: string;
  storeCategory: string;
  sector: string;
  vendorId: string;
  vendorName: string;
  vendorPhone: string;
  vendorEmail: string;
  onboardingDate: string; // ISO YYYY-MM-DD
  planName: 'Monthly Plan' | 'Annual Plan';
  billingCycle: SubscriptionBillingCycle;
  amount: number; // ₹100 or ₹1000
  startDate: string; // ISO YYYY-MM-DD
  expiryDate: string; // ISO YYYY-MM-DD
  status: AdminSubscriptionStatus;
  /** Positive for remaining days (Active / Expiring Soon), negative for days since expiry (Expired) */
  daysDelta: number;
  gstRegistered: boolean;
  totalRenewalsCount: number;
  paymentHistory: SubscriptionPaymentRecord[];
}

export interface AdminOrderLineItem {
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface AdminOrderRecord {
  id: string;
  orderNumber: string;
  date: string; // ISO YYYY-MM-DD
  orderDateTime: string; // Readable date & time
  customerName: string;
  customerSector: string;
  storeId: string;
  storeName: string;
  storeCategory: string;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  orderValue: number;
  paymentMethod: 'COD' | 'UPI' | 'Card';
  status: AdminOrderStatus;
  items: AdminOrderLineItem[];
  // Cancellation-specific fields (present when status === 'CANCELLED')
  cancellationDateTime?: string;
  cancellationReasonKey?: CancellationReasonKey;
  cancellationReason?: string;
  cancelledBy?: CancelledByActor;
  stageWhenCancelled?: Exclude<AdminOrderStatus, 'DELIVERED' | 'CANCELLED'>;
  stageWhenCancelledLabel?: string;
  minutesBeforeCancellation?: number;
  cancellationNote?: string;
  settlementImpactNote?: string;
}

export interface CancellationReasonBreakdownItem {
  key: CancellationReasonKey;
  label: string;
  cancelledBy: CancelledByActor;
  attributionGroup: CancellationAttributionGroup;
  count: number;
  percentage: number;
  color: string;
}

export interface CancellationAnalyticsSummary {
  totalCancellations: number;
  cancellationRate: number; // % of totalOrders
  cancelledOrderValue: number;
  mostCommonReason: {
    key: CancellationReasonKey;
    label: string;
    count: number;
    percentage: number;
  } | null;
  customerCausedCount: number;
  customerCausedPercentage: number;
  vendorCausedCount: number;
  vendorCausedPercentage: number;
  deliverySystemCausedCount: number;
  deliverySystemCausedPercentage: number;
  reasonsBreakdown: CancellationReasonBreakdownItem[];
}

export interface DailyAnalyticsRecord {
  /** ISO date YYYY-MM-DD */
  date: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  inProgressOrders: {
    ORDER_PLACED: number;
    ACCEPTED: number;
    PREPARING: number;
    READY_FOR_PICKUP: number;
    OUT_FOR_DELIVERY: number;
  };
  /** Gross Merchandise Value (total customer order value across vendor stores) in INR */
  gmv: number;
  /** Delivered GMV (excluding cancelled orders) in INR */
  deliveredGmv: number;
  /** Platform service/commission fees collected by VyaparHub on marketplace orders in INR */
  platformFeeRevenue: number;
  /** Vendor subscription fees collected by VyaparHub on this date in INR */
  subscriptionRevenue: number;
  /** Total platform-side revenue = platformFeeRevenue + subscriptionRevenue */
  totalPlatformRevenue: number;
  /** Cumulative registered vendors as of this date */
  registeredVendors: number;
  /** Cumulative active stores as of this date */
  activeStores: number;
  /** New vendor registrations on this date */
  newVendors: number;
  /** New store activations on this date */
  newStores: number;
  /** Subscription snapshot as of this date */
  subscriptions: {
    active: number;
    expiringSoon: number;
    expired: number;
    monthlyPlanCount: number;
    annualPlanCount: number;
  };
  /** Category breakdown for this day's orders & GMV */
  categoryBreakdown: Record<
    string,
    {
      orders: number;
      gmv: number;
    }
  >;
  /** Cancellation breakdown for this day's cancelled orders (sums to cancelledOrders) */
  cancellationByReason: Record<CancellationReasonKey, number>;
  cancellationByGroup: {
    customer: number;
    vendor: number;
    deliverySystem: number;
  };
  cancelledOrderValue: number;
}

export interface AggregatedTimePoint {
  key: string;
  label: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  inProgressOrders: number;
  gmv: number;
  deliveredGmv: number;
  avgOrderValue: number;
  subscriptionRevenue: number;
  platformFeeRevenue: number;
  totalPlatformRevenue: number;
  registeredVendors: number;
  activeStores: number;
  newVendors: number;
  newStores: number;
  customerCancellations: number;
  vendorCancellations: number;
  deliverySystemCancellations: number;
  cancellationRate: number;
}

export interface OrderStatusDistributionItem {
  status: AdminOrderStatus;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface CategoryPerformanceItem {
  category: string;
  shortName: string;
  orders: number;
  gmv: number;
  sharePercentage: number;
}

export interface SubscriptionAnalyticsSummary {
  activeSubscriptions: number;
  expiringSubscriptions: number;
  expiredSubscriptions: number;
  subscriptionRevenue: number;
  monthlyPlanActive: number;
  annualPlanActive: number;
  monthlyPlanTotal: number;
  annualPlanTotal: number;
  monthlyPlanRevenue: number;
  annualPlanRevenue: number;
  renewalRate: number;
}

export interface KpiComparison {
  value: number;
  previousValue: number;
  changePercent: number | null;
  trend: 'up' | 'down' | 'neutral';
}

export interface AdminAnalyticsSnapshot {
  hasData: boolean;
  dateRangeLabel: string;
  fromDate: string;
  toDate: string;
  previousRangeLabel: string;
  granularity: ChartGranularity;
  dayCount: number;
  kpis: {
    gmv: KpiComparison;
    totalOrders: KpiComparison;
    deliveredOrders: KpiComparison;
    cancelledOrders: KpiComparison;
    platformRevenue: KpiComparison;
    activeVendors: KpiComparison;
    activeStores: KpiComparison;
    activeSubscriptions: KpiComparison;
  };
  timeSeries: AggregatedTimePoint[];
  orderStatusDistribution: OrderStatusDistributionItem[];
  categoryPerformance: CategoryPerformanceItem[];
  subscriptionAnalytics: SubscriptionAnalyticsSummary;
  cancellationAnalytics: CancellationAnalyticsSummary;
}

/**
 * Reference anchor date aligned with Phase 2 mock data (21 Nov 2026).
 * Data is generated deterministically from 2025-10-01 to 2026-11-21.
 */
export const REFERENCE_TODAY = '2026-11-21';
export const DATA_START_DATE = '2025-10-01';
export const DATA_END_DATE = '2026-11-21';

export const ANALYTICS_CATEGORIES: {
  name: string;
  shortName: string;
  weight: number;
  avgTicket: number;
}[] = [
  { name: 'Daily Grocery & Staples', shortName: 'Grocery & Staples', weight: 0.28, avgTicket: 420 },
  { name: 'Dairy & Fresh Sweets', shortName: 'Dairy', weight: 0.22, avgTicket: 240 },
  { name: 'Bakery & Confectionery', shortName: 'Bakery', weight: 0.14, avgTicket: 210 },
  { name: 'Pharmacy & Wellness', shortName: 'Pharmacy', weight: 0.12, avgTicket: 350 },
  { name: 'General Store & Home Needs', shortName: 'General Store', weight: 0.10, avgTicket: 380 },
  { name: 'Stationery & Books', shortName: 'Stationery', weight: 0.06, avgTicket: 260 },
  { name: 'Electronics & Mobile', shortName: 'Electronics', weight: 0.05, avgTicket: 690 },
  { name: 'Pet Supplies & Care', shortName: 'Pet Supplies', weight: 0.03, avgTicket: 510 },
];

export const ORDER_STATUS_META: Record<AdminOrderStatus, { label: string; color: string }> = {
  DELIVERED: { label: 'Delivered', color: '#166534' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#16A34A' },
  READY_FOR_PICKUP: { label: 'Ready for Pickup', color: '#65A30D' },
  PREPARING: { label: 'Preparing', color: '#D97706' },
  ACCEPTED: { label: 'Accepted', color: '#F59E0B' },
  ORDER_PLACED: { label: 'Order Placed', color: '#B45309' },
  CANCELLED: { label: 'Cancelled', color: '#DC2626' },
};

export const CANCELLATION_REASON_META: Record<
  CancellationReasonKey,
  {
    label: string;
    cancelledBy: CancelledByActor;
    attributionGroup: CancellationAttributionGroup;
    color: string;
    weight: number;
    defaultStage: Exclude<AdminOrderStatus, 'DELIVERED' | 'CANCELLED'>;
    noteTemplate: string;
  }
> = {
  ITEM_UNAVAILABLE: {
    label: 'Item / Stock Unavailable',
    cancelledBy: 'Vendor',
    attributionGroup: 'VENDOR',
    color: '#B45309',
    weight: 0.26,
    defaultStage: 'ACCEPTED',
    noteTemplate: 'Requested batch/brand sold out at counter before shelf inventory sync.',
  },
  CUSTOMER_CANCELLED: {
    label: 'Customer Cancelled',
    cancelledBy: 'Customer',
    attributionGroup: 'CUSTOMER',
    color: '#166534',
    weight: 0.22,
    defaultStage: 'ORDER_PLACED',
    noteTemplate: 'Customer cancelled order within 4 minutes of placement to modify basket items.',
  },
  STORE_REJECTED: {
    label: 'Store Rejected',
    cancelledBy: 'Vendor',
    attributionGroup: 'VENDOR',
    color: '#D97706',
    weight: 0.15,
    defaultStage: 'ORDER_PLACED',
    noteTemplate: 'Store rejected incoming order during peak evening rush hour.',
  },
  STORE_UNABLE_TO_FULFIL: {
    label: 'Store Unable to Fulfil',
    cancelledBy: 'Vendor',
    attributionGroup: 'VENDOR',
    color: '#F59E0B',
    weight: 0.11,
    defaultStage: 'PREPARING',
    noteTemplate: 'Quality check failed during packing (damaged packaging on last available unit).',
  },
  DELIVERY_ISSUE: {
    label: 'Delivery Issue',
    cancelledBy: 'Delivery',
    attributionGroup: 'DELIVERY_SYSTEM',
    color: '#DC2626',
    weight: 0.09,
    defaultStage: 'OUT_FOR_DELIVERY',
    noteTemplate: 'Customer unreachable at delivery gate after 3 phone attempts.',
  },
  DUPLICATE_ORDER: {
    label: 'Duplicate / Accidental Order',
    cancelledBy: 'Customer',
    attributionGroup: 'CUSTOMER',
    color: '#15803D',
    weight: 0.08,
    defaultStage: 'ORDER_PLACED',
    noteTemplate: 'Customer placed duplicate COD order within 2 minutes; kept primary order.',
  },
  PAYMENT_ISSUE: {
    label: 'Payment Issue',
    cancelledBy: 'System',
    attributionGroup: 'DELIVERY_SYSTEM',
    color: '#7C2D12',
    weight: 0.06,
    defaultStage: 'ORDER_PLACED',
    noteTemplate: 'UPI payment authorization timed out without bank confirmation.',
  },
  OTHER: {
    label: 'Other',
    cancelledBy: 'System',
    attributionGroup: 'DELIVERY_SYSTEM',
    color: '#647067',
    weight: 0.03,
    defaultStage: 'ACCEPTED',
    noteTemplate: 'Address outside store hyperlocal 5 km service zone boundary.',
  },
};

export const CANCELLATION_REASON_KEYS = Object.keys(
  CANCELLATION_REASON_META
) as CancellationReasonKey[];

/** Deterministic pseudo-random helper in [0, 1) for a numeric seed */
function seededUnit(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function parseDateUTC(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatReadableDate(iso: string): string {
  if (!iso) return '';
  const date = parseDateUTC(iso);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function addDaysISO(iso: string, delta: number): string {
  const d = parseDateUTC(iso);
  d.setUTCDate(d.getUTCDate() + delta);
  return formatDateUTC(d);
}

function diffDaysInclusive(fromIso: string, toIso: string): number {
  const a = parseDateUTC(fromIso).getTime();
  const b = parseDateUTC(toIso).getTime();
  if (b < a) return 0;
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

function diffDaysSigned(fromIso: string, toIso: string): number {
  const a = parseDateUTC(fromIso).getTime();
  const b = parseDateUTC(toIso).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// 1. MASTER STORE & VENDOR SUBSCRIPTION DIRECTORY
// ============================================================================

interface SeedStoreDefinition {
  storeId: string;
  storeName: string;
  storeCategory: string;
  sector: string;
  vendorId: string;
  vendorName: string;
  vendorPhone: string;
  vendorEmail: string;
  onboardingDate: string;
  billingCycle: SubscriptionBillingCycle;
  startDate: string;
  expiryDate: string;
  status: AdminSubscriptionStatus;
  gstRegistered: boolean;
  totalRenewalsCount: number;
}

const SEED_STORE_SUBSCRIPTIONS: SeedStoreDefinition[] = [
  {
    storeId: 'store-1',
    storeName: 'ABC Kirana & Daily Staples',
    storeCategory: 'Daily Grocery & Staples',
    sector: 'Sector 14, Main Market',
    vendorId: 'ven-101',
    vendorName: 'Rajesh Gupta',
    vendorPhone: '+91 98765 43210',
    vendorEmail: 'abckirana@example.com',
    onboardingDate: '2025-10-01',
    billingCycle: 'Monthly',
    startDate: '2026-11-12',
    expiryDate: '2026-12-12',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 14,
  },
  {
    storeId: 'vstore-2',
    storeName: 'ABC Dairy Corner',
    storeCategory: 'Dairy & Fresh Sweets',
    sector: 'Sector 17, Lake View Market',
    vendorId: 'ven-101',
    vendorName: 'Rajesh Gupta',
    vendorPhone: '+91 98765 43299',
    vendorEmail: 'abckirana@example.com',
    onboardingDate: '2025-10-01',
    billingCycle: 'Monthly',
    startDate: '2026-11-15',
    expiryDate: '2026-12-15',
    status: 'ACTIVE',
    gstRegistered: false,
    totalRenewalsCount: 13,
  },
  {
    storeId: 'store-2',
    storeName: 'Fresh Mart Supermarket',
    storeCategory: 'General Store & Home Needs',
    sector: 'Sector 14, Community Center',
    vendorId: 'ven-102',
    vendorName: 'Vikram Malhotra',
    vendorPhone: '+91 98111 22334',
    vendorEmail: 'freshmart.sec14@example.com',
    onboardingDate: '2025-10-01',
    billingCycle: 'Annual',
    startDate: '2026-04-10',
    expiryDate: '2027-04-10',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 2,
  },
  {
    storeId: 'store-3',
    storeName: 'Apollo Life Pharmacy & Chemist',
    storeCategory: 'Pharmacy & Wellness',
    sector: 'Sector 14, Commercial Complex',
    vendorId: 'ven-103',
    vendorName: 'Dr. Suresh Nair',
    vendorPhone: '+91 98222 33445',
    vendorEmail: 'apollolife.s14@example.com',
    onboardingDate: '2025-10-01',
    billingCycle: 'Annual',
    startDate: '2026-01-20',
    expiryDate: '2027-01-20',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 2,
  },
  {
    storeId: 'store-4',
    storeName: 'City Bakery & Confectionery',
    storeCategory: 'Bakery & Confectionery',
    sector: 'Sector 15, Central Avenue',
    vendorId: 'ven-104',
    vendorName: 'Harpreet Singh',
    vendorPhone: '+91 98333 44556',
    vendorEmail: 'citybakery15@example.com',
    onboardingDate: '2025-10-01',
    billingCycle: 'Monthly',
    startDate: '2026-10-25',
    expiryDate: '2026-11-25',
    status: 'EXPIRING_SOON',
    gstRegistered: true,
    totalRenewalsCount: 13,
  },
  {
    storeId: 'store-5',
    storeName: 'Sharma Stationery & Book Depot',
    storeCategory: 'Stationery & Books',
    sector: 'Sector 15 Market',
    vendorId: 'ven-105',
    vendorName: 'Mahesh Sharma',
    vendorPhone: '+91 98444 55667',
    vendorEmail: 'sharmabooks@example.com',
    onboardingDate: '2025-10-01',
    billingCycle: 'Monthly',
    startDate: '2026-11-05',
    expiryDate: '2026-12-05',
    status: 'ACTIVE',
    gstRegistered: false,
    totalRenewalsCount: 14,
  },
  {
    storeId: 'store-6',
    storeName: 'GadgetHub Electronics & Mobile',
    storeCategory: 'Electronics & Mobile',
    sector: 'Sector 16, Commercial Hub',
    vendorId: 'ven-106',
    vendorName: 'Nitin Bansal',
    vendorPhone: '+91 98555 66778',
    vendorEmail: 'gadgethub.ggn@example.com',
    onboardingDate: '2025-10-01',
    billingCycle: 'Annual',
    startDate: '2026-03-10',
    expiryDate: '2027-03-10',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 2,
  },
  {
    storeId: 'store-7',
    storeName: 'Paws & Claws Pet Care',
    storeCategory: 'Pet Supplies & Care',
    sector: 'Sector 17, Green Glen Market',
    vendorId: 'ven-107',
    vendorName: 'Ananya Sen',
    vendorPhone: '+91 98666 77889',
    vendorEmail: 'pawsandclaws@example.com',
    onboardingDate: '2025-10-01',
    billingCycle: 'Monthly',
    startDate: '2026-10-24',
    expiryDate: '2026-11-24',
    status: 'EXPIRING_SOON',
    gstRegistered: true,
    totalRenewalsCount: 12,
  },
  {
    storeId: 'store-8',
    storeName: 'Modern Departmental Store',
    storeCategory: 'General Store & Home Needs',
    sector: 'Highway Road, Grand Mall',
    vendorId: 'ven-108',
    vendorName: 'Deepak Khandelwal',
    vendorPhone: '+91 98777 88990',
    vendorEmail: 'moderndept@example.com',
    onboardingDate: '2025-10-01',
    billingCycle: 'Monthly',
    startDate: '2026-10-12',
    expiryDate: '2026-11-12',
    status: 'EXPIRED',
    gstRegistered: true,
    totalRenewalsCount: 11,
  },
  {
    storeId: 'store-9',
    storeName: 'Bikaner Sweets & Namkeen',
    storeCategory: 'Dairy & Fresh Sweets',
    sector: 'Sector 14, Old Delhi Road',
    vendorId: 'ven-109',
    vendorName: 'Gopal Agarwal',
    vendorPhone: '+91 98102 33412',
    vendorEmail: 'bikanersweets14@example.com',
    onboardingDate: '2025-10-01',
    billingCycle: 'Annual',
    startDate: '2026-06-20',
    expiryDate: '2027-06-20',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 2,
  },
  {
    storeId: 'store-10',
    storeName: 'Haryana Organic Dairy Farm',
    storeCategory: 'Dairy & Fresh Sweets',
    sector: 'Sector 12, Chowk Market',
    vendorId: 'ven-110',
    vendorName: 'Satish Yadav',
    vendorPhone: '+91 98188 77661',
    vendorEmail: 'haryanadairy@example.com',
    onboardingDate: '2025-10-01',
    billingCycle: 'Monthly',
    startDate: '2026-11-01',
    expiryDate: '2026-12-01',
    status: 'ACTIVE',
    gstRegistered: false,
    totalRenewalsCount: 13,
  },
  {
    storeId: 'store-11',
    storeName: 'Green Leaf Kirana & Provision',
    storeCategory: 'Daily Grocery & Staples',
    sector: 'Sector 15, Part 2',
    vendorId: 'ven-111',
    vendorName: 'Ramesh Chawla',
    vendorPhone: '+91 98911 55220',
    vendorEmail: 'greenleaf.kirana@example.com',
    onboardingDate: '2025-10-01',
    billingCycle: 'Monthly',
    startDate: '2026-11-18',
    expiryDate: '2026-12-18',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 14,
  },
  {
    storeId: 'store-12',
    storeName: 'MedPlus Health Chemist',
    storeCategory: 'Pharmacy & Wellness',
    sector: 'Sector 16, HUDA Market',
    vendorId: 'ven-103',
    vendorName: 'Dr. Suresh Nair',
    vendorPhone: '+91 98222 33490',
    vendorEmail: 'medplus.s16@example.com',
    onboardingDate: '2025-10-18',
    billingCycle: 'Annual',
    startDate: '2025-11-26',
    expiryDate: '2026-11-26',
    status: 'EXPIRING_SOON',
    gstRegistered: true,
    totalRenewalsCount: 1,
  },
  {
    storeId: 'store-13',
    storeName: 'Goyal Atta & Spice Mill',
    storeCategory: 'Daily Grocery & Staples',
    sector: 'Sector 14, Sadar Lane',
    vendorId: 'ven-112',
    vendorName: 'Pradeep Goyal',
    vendorPhone: '+91 98115 90871',
    vendorEmail: 'goyalmill@example.com',
    onboardingDate: '2025-11-05',
    billingCycle: 'Monthly',
    startDate: '2026-11-05',
    expiryDate: '2026-12-05',
    status: 'ACTIVE',
    gstRegistered: false,
    totalRenewalsCount: 12,
  },
  {
    storeId: 'store-14',
    storeName: 'Golden Crust Artisan Bakery',
    storeCategory: 'Bakery & Confectionery',
    sector: 'Sector 17, Plaza Arcade',
    vendorId: 'ven-104',
    vendorName: 'Harpreet Singh',
    vendorPhone: '+91 98333 44599',
    vendorEmail: 'goldencrust@example.com',
    onboardingDate: '2025-11-22',
    billingCycle: 'Monthly',
    startDate: '2026-11-12',
    expiryDate: '2026-12-12',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 12,
  },
  {
    storeId: 'store-15',
    storeName: 'Verma Medical & Surgical',
    storeCategory: 'Pharmacy & Wellness',
    sector: 'Sector 12, Civil Hospital Road',
    vendorId: 'ven-113',
    vendorName: 'Ashok Verma',
    vendorPhone: '+91 98712 44110',
    vendorEmail: 'vermamedical@example.com',
    onboardingDate: '2025-12-10',
    billingCycle: 'Annual',
    startDate: '2025-12-10',
    expiryDate: '2026-12-10',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 1,
  },
  {
    storeId: 'store-16',
    storeName: 'Sunrise Daily Needs & Mart',
    storeCategory: 'General Store & Home Needs',
    sector: 'Sector 15, Housing Board',
    vendorId: 'ven-114',
    vendorName: 'Kavita Deshmukh',
    vendorPhone: '+91 98990 12874',
    vendorEmail: 'sunrisemart15@example.com',
    onboardingDate: '2025-12-28',
    billingCycle: 'Monthly',
    startDate: '2026-10-18',
    expiryDate: '2026-11-18',
    status: 'EXPIRED',
    gstRegistered: false,
    totalRenewalsCount: 10,
  },
  {
    storeId: 'store-17',
    storeName: 'Campus Corner Books & Prints',
    storeCategory: 'Stationery & Books',
    sector: 'Sector 14, College Gate',
    vendorId: 'ven-105',
    vendorName: 'Mahesh Sharma',
    vendorPhone: '+91 98444 55699',
    vendorEmail: 'campuscorner@example.com',
    onboardingDate: '2026-01-14',
    billingCycle: 'Monthly',
    startDate: '2026-11-18',
    expiryDate: '2026-12-18',
    status: 'ACTIVE',
    gstRegistered: false,
    totalRenewalsCount: 10,
  },
  {
    storeId: 'store-18',
    storeName: 'QuickCharge Mobile World',
    storeCategory: 'Electronics & Mobile',
    sector: 'Sector 14, Metro Feeder Road',
    vendorId: 'ven-115',
    vendorName: 'Rohan Kapoor',
    vendorPhone: '+91 98109 65432',
    vendorEmail: 'quickcharge@example.com',
    onboardingDate: '2026-02-02',
    billingCycle: 'Monthly',
    startDate: '2026-10-27',
    expiryDate: '2026-11-27',
    status: 'EXPIRING_SOON',
    gstRegistered: true,
    totalRenewalsCount: 9,
  },
  {
    storeId: 'store-19',
    storeName: 'Annapurna Super Provision',
    storeCategory: 'Daily Grocery & Staples',
    sector: 'Sector 17, Block B Market',
    vendorId: 'ven-116',
    vendorName: 'Sanjay Tiwari',
    vendorPhone: '+91 98181 32145',
    vendorEmail: 'annapurnastore@example.com',
    onboardingDate: '2026-02-20',
    billingCycle: 'Annual',
    startDate: '2026-02-20',
    expiryDate: '2027-02-20',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 1,
  },
  {
    storeId: 'store-20',
    storeName: 'Kamdhenu Milk & Paneer Bhandar',
    storeCategory: 'Dairy & Fresh Sweets',
    sector: 'Sector 16, Main Booth 11',
    vendorId: 'ven-117',
    vendorName: 'Devendra Chauhan',
    vendorPhone: '+91 99104 88776',
    vendorEmail: 'kamdhenudairy@example.com',
    onboardingDate: '2026-03-11',
    billingCycle: 'Monthly',
    startDate: '2026-11-01',
    expiryDate: '2026-12-01',
    status: 'ACTIVE',
    gstRegistered: false,
    totalRenewalsCount: 9,
  },
  {
    storeId: 'store-21',
    storeName: 'Happy Tails Pet Nutrition',
    storeCategory: 'Pet Supplies & Care',
    sector: 'Sector 15, Park View Lane',
    vendorId: 'ven-107',
    vendorName: 'Ananya Sen',
    vendorPhone: '+91 98666 77895',
    vendorEmail: 'happytails@example.com',
    onboardingDate: '2026-03-29',
    billingCycle: 'Monthly',
    startDate: '2026-11-05',
    expiryDate: '2026-12-05',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 8,
  },
  {
    storeId: 'store-22',
    storeName: 'Bharat General & Home Store',
    storeCategory: 'General Store & Home Needs',
    sector: 'Sector 13, Patel Nagar',
    vendorId: 'ven-118',
    vendorName: 'Kuldeep Bhardwaj',
    vendorPhone: '+91 98119 43219',
    vendorEmail: 'bharatgeneral@example.com',
    onboardingDate: '2026-04-17',
    billingCycle: 'Monthly',
    startDate: '2026-10-05',
    expiryDate: '2026-11-05',
    status: 'EXPIRED',
    gstRegistered: false,
    totalRenewalsCount: 6,
  },
  {
    storeId: 'store-23',
    storeName: 'Sweet Cravings Patisserie',
    storeCategory: 'Bakery & Confectionery',
    sector: 'Sector 14, Galleria Strip',
    vendorId: 'ven-119',
    vendorName: 'Meera Krishnan',
    vendorPhone: '+91 98201 99881',
    vendorEmail: 'sweetcravings@example.com',
    onboardingDate: '2026-05-06',
    billingCycle: 'Annual',
    startDate: '2026-05-10',
    expiryDate: '2027-05-10',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 1,
  },
  {
    storeId: 'store-24',
    storeName: 'Mittal Dal & Rice Emporium',
    storeCategory: 'Daily Grocery & Staples',
    sector: 'Sector 12, Grain Market',
    vendorId: 'ven-120',
    vendorName: 'Saurabh Mittal',
    vendorPhone: '+91 98733 66554',
    vendorEmail: 'mittalgrains@example.com',
    onboardingDate: '2026-05-25',
    billingCycle: 'Monthly',
    startDate: '2026-11-12',
    expiryDate: '2026-12-12',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 6,
  },
  {
    storeId: 'store-25',
    storeName: 'CareWell Wellness Pharmacy',
    storeCategory: 'Pharmacy & Wellness',
    sector: 'Sector 17, Main Circle',
    vendorId: 'ven-121',
    vendorName: 'Pooja Luthra',
    vendorPhone: '+91 98107 55443',
    vendorEmail: 'carewell.rx@example.com',
    onboardingDate: '2026-06-14',
    billingCycle: 'Annual',
    startDate: '2026-06-20',
    expiryDate: '2027-06-20',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 1,
  },
  {
    storeId: 'store-26',
    storeName: 'Scholar Ink & Office Supplies',
    storeCategory: 'Stationery & Books',
    sector: 'Sector 16, Institutional Area',
    vendorId: 'ven-122',
    vendorName: 'Arvind Saxena',
    vendorPhone: '+91 98917 22119',
    vendorEmail: 'scholarink@example.com',
    onboardingDate: '2026-07-04',
    billingCycle: 'Monthly',
    startDate: '2026-11-01',
    expiryDate: '2026-12-01',
    status: 'ACTIVE',
    gstRegistered: false,
    totalRenewalsCount: 5,
  },
  {
    storeId: 'store-27',
    storeName: 'Fresh Harvest Kirana Corner',
    storeCategory: 'Daily Grocery & Staples',
    sector: 'Sector 15, Part 1',
    vendorId: 'ven-102',
    vendorName: 'Vikram Malhotra',
    vendorPhone: '+91 98111 22388',
    vendorEmail: 'freshharvest15@example.com',
    onboardingDate: '2026-07-24',
    billingCycle: 'Monthly',
    startDate: '2026-10-25',
    expiryDate: '2026-11-25',
    status: 'EXPIRING_SOON',
    gstRegistered: true,
    totalRenewalsCount: 4,
  },
  {
    storeId: 'store-28',
    storeName: 'VoltEdge Digital Accessories',
    storeCategory: 'Electronics & Mobile',
    sector: 'Sector 17, Cyber Arcade',
    vendorId: 'ven-123',
    vendorName: 'Farhan Siddiqui',
    vendorPhone: '+91 98185 99002',
    vendorEmail: 'voltedge.tech@example.com',
    onboardingDate: '2026-08-15',
    billingCycle: 'Monthly',
    startDate: '2026-11-18',
    expiryDate: '2026-12-18',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 4,
  },
  {
    storeId: 'store-29',
    storeName: 'Vrindavan Pure Ghee & Dairy',
    storeCategory: 'Dairy & Fresh Sweets',
    sector: 'Sector 14, Temple Lane',
    vendorId: 'ven-124',
    vendorName: 'Manoj Upadhyay',
    vendorPhone: '+91 98719 33221',
    vendorEmail: 'vrindavandairy@example.com',
    onboardingDate: '2026-09-05',
    billingCycle: 'Monthly',
    startDate: '2026-11-05',
    expiryDate: '2026-12-05',
    status: 'ACTIVE',
    gstRegistered: false,
    totalRenewalsCount: 3,
  },
  {
    storeId: 'store-30',
    storeName: 'Daily Basket Convenience Store',
    storeCategory: 'General Store & Home Needs',
    sector: 'Sector 16, Pocket C',
    vendorId: 'ven-125',
    vendorName: 'Neelam Choudhary',
    vendorPhone: '+91 98113 77441',
    vendorEmail: 'dailybasket16@example.com',
    onboardingDate: '2026-09-28',
    billingCycle: 'Annual',
    startDate: '2026-10-10',
    expiryDate: '2027-10-10',
    status: 'ACTIVE',
    gstRegistered: true,
    totalRenewalsCount: 1,
  },
  {
    storeId: 'store-31',
    storeName: 'Royal Bakers & Confectioners',
    storeCategory: 'Bakery & Confectionery',
    sector: 'Sector 12, Main Bazaar',
    vendorId: 'ven-126',
    vendorName: 'Tariq Ahmed',
    vendorPhone: '+91 98995 66112',
    vendorEmail: 'royalbakers12@example.com',
    onboardingDate: '2026-10-20',
    billingCycle: 'Monthly',
    startDate: '2026-11-18',
    expiryDate: '2026-12-18',
    status: 'ACTIVE',
    gstRegistered: false,
    totalRenewalsCount: 2,
  },
];

const PAYMENT_MODES: SubscriptionPaymentRecord['paymentMode'][] = [
  'UPI AutoPay (Mock)',
  'NetBanking (Mock)',
  'Card (Mock)',
];

function buildPaymentHistory(
  seed: SeedStoreDefinition,
  idx: number
): SubscriptionPaymentRecord[] {
  const amount = seed.billingCycle === 'Monthly' ? 100 : 1000;
  const planName = seed.billingCycle === 'Monthly' ? 'Monthly Plan' : 'Annual Plan';
  const count = Math.min(4, Math.max(1, seed.totalRenewalsCount));
  const records: SubscriptionPaymentRecord[] = [];

  for (let k = 0; k < count; k++) {
    const stepDays = seed.billingCycle === 'Monthly' ? -30 * k : -365 * k;
    const paidDate = addDaysISO(seed.startDate, stepDays);
    const periodEnd = addDaysISO(
      paidDate,
      seed.billingCycle === 'Monthly' ? 30 : 365
    );
    records.push({
      id: `sub-pay-${seed.storeId}-${k}`,
      invoiceNumber: `VH-SUB-${paidDate.slice(0, 4)}-${String(1100 + idx * 10 + k)}`,
      paidOn: paidDate,
      periodCovered: `${formatReadableDate(paidDate)} – ${formatReadableDate(periodEnd)}`,
      planName,
      billingCycle: seed.billingCycle,
      amount,
      paymentMode: PAYMENT_MODES[(idx + k) % PAYMENT_MODES.length],
      status: 'PAID',
    });
  }

  return records;
}

export const MOCK_ADMIN_SUBSCRIPTIONS: AdminSubscriptionRecord[] =
  SEED_STORE_SUBSCRIPTIONS.map((seed, idx) => {
    const daysDelta = diffDaysSigned(REFERENCE_TODAY, seed.expiryDate);
    const amount = seed.billingCycle === 'Monthly' ? 100 : 1000;
    const planName = seed.billingCycle === 'Monthly' ? 'Monthly Plan' : 'Annual Plan';
    return {
      ...seed,
      id: `sub-${seed.storeId}`,
      planName,
      amount,
      daysDelta,
      paymentHistory: buildPaymentHistory(seed, idx),
    };
  });

// ============================================================================
// 2. DETERMINISTIC DAILY DATASET + ORDER & CANCELLATION RECORDS
// ============================================================================

const SAMPLE_CUSTOMERS: { name: string; sector: string }[] = [
  { name: 'Aman Sharma', sector: 'Sector 14, Green Meadows' },
  { name: 'Priya Verma', sector: 'Sector 15, Palm Residency' },
  { name: 'Mohit Singh', sector: 'Sector 14 Market, Block C' },
  { name: 'Neha Kapoor', sector: 'Sector 14, Sunrise Heights' },
  { name: 'Sunita Rao', sector: 'Sector 14, Shanti Nagar' },
  { name: 'Karan Mehta', sector: 'Sector 14 Extension' },
  { name: 'Rohit Malhotra', sector: 'Sector 15, Orchid Apartments' },
  { name: 'Deepa Nair', sector: 'Sector 17, Lake View Colony' },
  { name: 'Ankit Bhardwaj', sector: 'Sector 16, HUDA Enclave' },
  { name: 'Divya Joshi', sector: 'Sector 15, Part 2' },
  { name: 'Siddharth Iyer', sector: 'Sector 17, MGF Villas' },
  { name: 'RituChhabra', sector: 'Sector 12, West Block' },
  { name: 'Mayank Agarwal', sector: 'Sector 14, Old DLF' },
  { name: 'Shalini Gupta', sector: 'Sector 16, Park Facing' },
];

const SAMPLE_PRODUCTS_BY_CATEGORY: Record<
  string,
  { name: string; unit: string; price: number }[]
> = {
  'Daily Grocery & Staples': [
    { name: 'Aashirvaad Shudh Chakki Atta', unit: '5 kg bag', price: 245 },
    { name: 'Fortune Sunlite Refined Sunflower Oil', unit: '1 L pouch', price: 135 },
    { name: 'Daawat Rozana Gold Basmati Rice', unit: '5 kg bag', price: 380 },
    { name: 'Tata Sampann Toor Dal', unit: '1 kg pack', price: 175 },
  ],
  'Dairy & Fresh Sweets': [
    { name: 'Amul Taaza Homogenised Toned Milk', unit: '500 ml pouch', price: 30 },
    { name: 'Mother Dairy Fresh Paneer', unit: '200 g pack', price: 90 },
    { name: 'Farm Fresh Brown Eggs', unit: '6 pcs pack', price: 55 },
    { name: 'Amul Salted Table Butter', unit: '100 g pack', price: 56 },
  ],
  'Bakery & Confectionery': [
    { name: 'Britannia 100% Whole Wheat Bread', unit: '400 g loaf', price: 48 },
    { name: 'Freshly Baked Garlic Herb Toast', unit: '250 g box', price: 75 },
    { name: 'Parle-G Family Gluco Pack', unit: '800 g pack', price: 85 },
  ],
  'Pharmacy & Wellness': [
    { name: 'Dettol Antiseptic Disinfectant', unit: '250 ml bottle', price: 110 },
    { name: 'Volini Joint & Muscle Pain Relief Gel', unit: '30 g tube', price: 135 },
    { name: 'Cipla ORS Electro-B Drink', unit: '200 ml pack', price: 32 },
  ],
  'General Store & Home Needs': [
    { name: 'Surf Excel Easy Wash Detergent', unit: '1 kg pack', price: 140 },
    { name: 'Dettol Original Bathing Soap', unit: 'Pack of 3', price: 130 },
    { name: 'Vim Lemon Dishwash Liquid Gel', unit: '500 ml bottle', price: 98 },
  ],
  'Stationery & Books': [
    { name: 'Classmate Spiral Notebooks Pack', unit: 'Pack of 3', price: 165 },
    { name: 'Hauser XO Smooth Ball Pens', unit: 'Pack of 5', price: 45 },
  ],
  'Electronics & Mobile': [
    { name: 'boAt Bassheads 100 Wired Earphones', unit: '1 unit', price: 399 },
    { name: 'Portronics Braided Fast Type-C Cable', unit: '1.2 m cable', price: 199 },
  ],
  'Pet Supplies & Care': [
    { name: 'Pedigree Adult Chicken & Veg Dog Food', unit: '1.2 kg pouch', price: 340 },
    { name: 'Whiskas Adult Wet Cat Food Pouches', unit: 'Pack of 4', price: 175 },
  ],
};

function pickCancellationReasonKey(seed: number): CancellationReasonKey {
  const u = seededUnit(seed);
  let cumulative = 0;
  for (const key of CANCELLATION_REASON_KEYS) {
    cumulative += CANCELLATION_REASON_META[key].weight;
    if (u <= cumulative) return key;
  }
  return 'ITEM_UNAVAILABLE';
}

const STAGES_FOR_REASON: Record<
  CancellationReasonKey,
  Exclude<AdminOrderStatus, 'DELIVERED' | 'CANCELLED'>[]
> = {
  CUSTOMER_CANCELLED: ['ORDER_PLACED', 'ACCEPTED'],
  DUPLICATE_ORDER: ['ORDER_PLACED'],
  STORE_REJECTED: ['ORDER_PLACED'],
  ITEM_UNAVAILABLE: ['ORDER_PLACED', 'ACCEPTED', 'PREPARING'],
  STORE_UNABLE_TO_FULFIL: ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'],
  DELIVERY_ISSUE: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'],
  PAYMENT_ISSUE: ['ORDER_PLACED'],
  OTHER: ['ORDER_PLACED', 'ACCEPTED'],
};

function formatTimeHHMM(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const mStr = String(minute).padStart(2, '0');
  return `${h12}:${mStr} ${period}`;
}

interface GeneratedDatasetResult {
  dailyRecords: DailyAnalyticsRecord[];
  allOrderRecords: AdminOrderRecord[];
}

function generateMockDatasetAndOrders(): GeneratedDatasetResult {
  const dailyRecords: DailyAnalyticsRecord[] = [];
  const allOrderRecords: AdminOrderRecord[] = [];
  const totalDays = diffDaysInclusive(DATA_START_DATE, DATA_END_DATE);

  let orderSeq = 4100;

  for (let i = 0; i < totalDays; i++) {
    const dateIso = addDaysISO(DATA_START_DATE, i);
    const dt = parseDateUTC(dateIso);
    const dayOfWeek = dt.getUTCDay();
    const dayOfMonth = dt.getUTCDate();
    const readableDay = formatReadableDate(dateIso);

    // Organic hyperlocal growth curve + weekend bump
    const growthFactor = 1 + (i / totalDays) * 0.95;
    const weekendBump =
      dayOfWeek === 0 || dayOfWeek === 6 ? 1.18 : dayOfWeek === 5 ? 1.08 : 1.0;
    const noise = 0.88 + seededUnit(i + 17) * 0.24;

    const baseOrders = 22;
    const totalOrders = Math.max(
      12,
      Math.round(baseOrders * growthFactor * weekendBump * noise)
    );

    // Cancellation rate around 5.5% - 9%
    const cancelRate = 0.055 + seededUnit(i + 101) * 0.035;
    const cancelledOrders = Math.max(1, Math.round(totalOrders * cancelRate));

    const isRecent = i >= totalDays - 3;
    const activeInFlightRatio = isRecent ? 0.24 : 0.11;
    const inFlightTotal = Math.max(
      2,
      Math.min(
        totalOrders - cancelledOrders - 5,
        Math.round(totalOrders * activeInFlightRatio)
      )
    );
    const deliveredOrders = Math.max(
      1,
      totalOrders - cancelledOrders - inFlightTotal
    );

    const placed = Math.max(0, Math.round(inFlightTotal * 0.2));
    const accepted = Math.max(0, Math.round(inFlightTotal * 0.18));
    const preparing = Math.max(0, Math.round(inFlightTotal * 0.24));
    const ready = Math.max(0, Math.round(inFlightTotal * 0.18));
    const outForDelivery = Math.max(
      0,
      inFlightTotal - (placed + accepted + preparing + ready)
    );

    // Category distribution for this day
    const categoryBreakdown: DailyAnalyticsRecord['categoryBreakdown'] = {};
    let dayGmv = 0;
    let allocatedOrders = 0;

    ANALYTICS_CATEGORIES.forEach((cat, cIdx) => {
      const catNoise = 0.9 + seededUnit(i * 13 + cIdx * 31) * 0.2;
      const isLast = cIdx === ANALYTICS_CATEGORIES.length - 1;
      const catOrders = isLast
        ? Math.max(1, totalOrders - allocatedOrders)
        : Math.max(1, Math.round(totalOrders * cat.weight * catNoise));
      if (!isLast) {
        allocatedOrders += catOrders;
      }
      const ticketVariance = 0.94 + seededUnit(i * 29 + cIdx * 7) * 0.12;
      const catGmv = Math.round(catOrders * cat.avgTicket * ticketVariance);
      categoryBreakdown[cat.name] = {
        orders: catOrders,
        gmv: catGmv,
      };
      dayGmv += catGmv;
    });

    const deliveredRatio = (totalOrders - cancelledOrders) / totalOrders;
    const deliveredGmv = Math.round(dayGmv * deliveredRatio);

    // Platform fee revenue: ~2% service fee on fulfilled sales + ₹5 per fulfilled order
    const platformFeeRevenue = Math.round(
      deliveredGmv * 0.02 + (totalOrders - cancelledOrders) * 5
    );

    // Derive cumulative stores, vendors, and subscription states from MOCK_ADMIN_SUBSCRIPTIONS
    const onboardedSubs = MOCK_ADMIN_SUBSCRIPTIONS.filter(
      (s) => s.onboardingDate <= dateIso
    );
    const prevDateIso = i > 0 ? addDaysISO(dateIso, -1) : '';
    const prevOnboardedSubs =
      i > 0
        ? MOCK_ADMIN_SUBSCRIPTIONS.filter((s) => s.onboardingDate <= prevDateIso)
        : [];

    const uniqueVendors = new Set(onboardedSubs.map((s) => s.vendorId)).size;
    const prevUniqueVendors =
      i > 0
        ? new Set(prevOnboardedSubs.map((s) => s.vendorId)).size
        : uniqueVendors;

    const cumulativeStores = onboardedSubs.length;
    const cumulativeVendors = uniqueVendors;
    const newStores = i === 0 ? 0 : cumulativeStores - prevOnboardedSubs.length;
    const newVendors = i === 0 ? 0 : cumulativeVendors - prevUniqueVendors;

    // Subscription status counts derived from MOCK_ADMIN_SUBSCRIPTIONS
    const activeSubsCount = onboardedSubs.filter(
      (s) => s.status === 'ACTIVE'
    ).length;
    const expiringSoonCount = onboardedSubs.filter(
      (s) => s.status === 'EXPIRING_SOON'
    ).length;
    const expiredCount = onboardedSubs.filter(
      (s) => s.status === 'EXPIRED'
    ).length;
    const monthlyPlanCount = onboardedSubs.filter(
      (s) => s.billingCycle === 'Monthly' && s.status !== 'EXPIRED'
    ).length;
    const annualPlanCount = onboardedSubs.filter(
      (s) => s.billingCycle === 'Annual' && s.status !== 'EXPIRED'
    ).length;

    let subscriptionRevenue = 0;
    if ([1, 5, 12, 18, 25].includes(dayOfMonth)) {
      const batchMonthly = Math.max(2, Math.round(monthlyPlanCount / 5));
      subscriptionRevenue += batchMonthly * 100;
    }
    if (dayOfMonth === 10 || dayOfMonth === 20) {
      subscriptionRevenue += 1000;
    }

    // Generate the exact `cancelledOrders` individual records for this date
    const cancellationByReason: Record<CancellationReasonKey, number> = {
      CUSTOMER_CANCELLED: 0,
      STORE_REJECTED: 0,
      ITEM_UNAVAILABLE: 0,
      STORE_UNABLE_TO_FULFIL: 0,
      DELIVERY_ISSUE: 0,
      PAYMENT_ISSUE: 0,
      DUPLICATE_ORDER: 0,
      OTHER: 0,
    };
    const cancellationByGroup = {
      customer: 0,
      vendor: 0,
      deliverySystem: 0,
    };
    let cancelledOrderValue = 0;

    const availableStores =
      onboardedSubs.length > 0 ? onboardedSubs : MOCK_ADMIN_SUBSCRIPTIONS;

    for (let c = 0; c < cancelledOrders; c++) {
      orderSeq += 1;
      const seed = i * 97 + c * 31 + 11;
      const reasonKey = pickCancellationReasonKey(seed);
      const reasonMeta = CANCELLATION_REASON_META[reasonKey];
      cancellationByReason[reasonKey] += 1;

      if (reasonMeta.attributionGroup === 'CUSTOMER') {
        cancellationByGroup.customer += 1;
      } else if (reasonMeta.attributionGroup === 'VENDOR') {
        cancellationByGroup.vendor += 1;
      } else {
        cancellationByGroup.deliverySystem += 1;
      }

      const storeRec =
        availableStores[(i * 7 + c * 3) % availableStores.length];
      const cust =
        SAMPLE_CUSTOMERS[(i * 5 + c * 11) % SAMPLE_CUSTOMERS.length];
      const catProducts =
        SAMPLE_PRODUCTS_BY_CATEGORY[storeRec.storeCategory] ||
        SAMPLE_PRODUCTS_BY_CATEGORY['Daily Grocery & Staples'];

      const prod1 = catProducts[(i + c) % catProducts.length];
      const prod2 = catProducts[(i + c + 1) % catProducts.length];
      const qty1 = 1 + ((i + c) % 2);
      const qty2 = (i + c) % 2 === 0 ? 1 : 0;

      const items: AdminOrderLineItem[] = [
        {
          name: prod1.name,
          unit: prod1.unit,
          quantity: qty1,
          unitPrice: prod1.price,
        },
      ];
      if (qty2 > 0 && prod2.name !== prod1.name) {
        items.push({
          name: prod2.name,
          unit: prod2.unit,
          quantity: qty2,
          unitPrice: prod2.price,
        });
      }

      const subtotal = items.reduce(
        (s, it) => s + it.unitPrice * it.quantity,
        0
      );
      const deliveryFee = 25;
      const platformFee = 5;
      const orderValue = subtotal + deliveryFee + platformFee;
      cancelledOrderValue += orderValue;

      const stagePool = STAGES_FOR_REASON[reasonKey];
      const stageWhenCancelled =
        stagePool[(i + c) % stagePool.length] || reasonMeta.defaultStage;

      const placedHour = 8 + ((i * 3 + c * 5) % 13); // 8 AM .. 8 PM
      const placedMin = (i * 11 + c * 17) % 50;
      const elapsedMins =
        stageWhenCancelled === 'ORDER_PLACED'
          ? 2 + ((i + c) % 5)
          : stageWhenCancelled === 'ACCEPTED'
            ? 6 + ((i + c) % 8)
            : stageWhenCancelled === 'PREPARING'
              ? 12 + ((i + c) % 10)
              : 18 + ((i + c) % 14);

      const cancelTotalMins = placedHour * 60 + placedMin + elapsedMins;
      const cancelHour = Math.min(23, Math.floor(cancelTotalMins / 60));
      const cancelMin = cancelTotalMins % 60;

      const paymentMethods: AdminOrderRecord['paymentMethod'][] = [
        'COD',
        'UPI',
        'Card',
      ];
      const paymentMethod =
        reasonKey === 'PAYMENT_ISSUE'
          ? 'UPI'
          : paymentMethods[(i + c) % paymentMethods.length];

      const settlementImpactNote =
        paymentMethod === 'COD'
          ? 'Cash on Delivery — No payment collected from customer; ₹0 settlement impact.'
          : reasonKey === 'PAYMENT_ISSUE'
            ? 'Online payment failed before capture — No charge deducted.'
            : 'Prepaid order — 100% customer refund initiated (mock); excluded from vendor settlement.';

      allOrderRecords.push({
        id: `adm-ord-${orderSeq}`,
        orderNumber: `VH-ORD-${orderSeq}`,
        date: dateIso,
        orderDateTime: `${readableDay}, ${formatTimeHHMM(placedHour, placedMin)}`,
        customerName: cust.name,
        customerSector: cust.sector,
        storeId: storeRec.storeId,
        storeName: storeRec.storeName,
        storeCategory: storeRec.storeCategory,
        subtotal,
        deliveryFee,
        platformFee,
        orderValue,
        paymentMethod,
        status: 'CANCELLED',
        items,
        cancellationDateTime: `${readableDay}, ${formatTimeHHMM(cancelHour, cancelMin)}`,
        cancellationReasonKey: reasonKey,
        cancellationReason: reasonMeta.label,
        cancelledBy: reasonMeta.cancelledBy,
        stageWhenCancelled,
        stageWhenCancelledLabel: ORDER_STATUS_META[stageWhenCancelled].label,
        minutesBeforeCancellation: elapsedMins,
        cancellationNote: reasonMeta.noteTemplate,
        settlementImpactNote,
      });
    }

    // For recent 60 days, also generate sample non-cancelled orders so /admin/orders
    // can be filtered across all order statuses (Delivered, Out for Delivery, Ready, Preparing, Accepted, Placed)
    if (i >= totalDays - 60) {
      const sampleStatuses: Exclude<AdminOrderStatus, 'CANCELLED'>[] =
        i >= totalDays - 5
          ? [
              'DELIVERED',
              'OUT_FOR_DELIVERY',
              'READY_FOR_PICKUP',
              'PREPARING',
              'ACCEPTED',
              'ORDER_PLACED',
            ]
          : ['DELIVERED', 'DELIVERED'];

      sampleStatuses.forEach((st, sIdx) => {
        orderSeq += 1;
        const storeRec =
          availableStores[(i * 3 + sIdx * 5) % availableStores.length];
        const cust =
          SAMPLE_CUSTOMERS[(i * 7 + sIdx * 3) % SAMPLE_CUSTOMERS.length];
        const catProducts =
          SAMPLE_PRODUCTS_BY_CATEGORY[storeRec.storeCategory] ||
          SAMPLE_PRODUCTS_BY_CATEGORY['Daily Grocery & Staples'];
        const prod = catProducts[(i + sIdx) % catProducts.length];
        const qty = 1 + ((i + sIdx) % 3);
        const subtotal = prod.price * qty;
        const deliveryFee = 25;
        const platformFee = 5;
        const placedHour = 9 + ((i + sIdx * 2) % 11);
        const placedMin = (i * 7 + sIdx * 13) % 55;

        allOrderRecords.push({
          id: `adm-ord-${orderSeq}`,
          orderNumber: `VH-ORD-${orderSeq}`,
          date: dateIso,
          orderDateTime: `${readableDay}, ${formatTimeHHMM(placedHour, placedMin)}`,
          customerName: cust.name,
          customerSector: cust.sector,
          storeId: storeRec.storeId,
          storeName: storeRec.storeName,
          storeCategory: storeRec.storeCategory,
          subtotal,
          deliveryFee,
          platformFee,
          orderValue: subtotal + deliveryFee + platformFee,
          paymentMethod: (i + sIdx) % 2 === 0 ? 'COD' : 'UPI',
          status: st,
          items: [
            {
              name: prod.name,
              unit: prod.unit,
              quantity: qty,
              unitPrice: prod.price,
            },
          ],
        });
      });
    }

    dailyRecords.push({
      date: dateIso,
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      inProgressOrders: {
        ORDER_PLACED: placed,
        ACCEPTED: accepted,
        PREPARING: preparing,
        READY_FOR_PICKUP: ready,
        OUT_FOR_DELIVERY: outForDelivery,
      },
      gmv: dayGmv,
      deliveredGmv,
      platformFeeRevenue,
      subscriptionRevenue,
      totalPlatformRevenue: platformFeeRevenue + subscriptionRevenue,
      registeredVendors: cumulativeVendors,
      activeStores: cumulativeStores,
      newVendors,
      newStores,
      subscriptions: {
        active: activeSubsCount,
        expiringSoon: expiringSoonCount,
        expired: expiredCount,
        monthlyPlanCount,
        annualPlanCount,
      },
      categoryBreakdown,
      cancellationByReason,
      cancellationByGroup,
      cancelledOrderValue,
    });
  }

  // Sort orders newest first
  allOrderRecords.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.orderNumber.localeCompare(a.orderNumber);
  });

  return { dailyRecords, allOrderRecords };
}

const GENERATED_ADMIN_DATA = generateMockDatasetAndOrders();

export const MOCK_DAILY_ANALYTICS: DailyAnalyticsRecord[] =
  GENERATED_ADMIN_DATA.dailyRecords;

export const MOCK_ADMIN_ORDERS: AdminOrderRecord[] =
  GENERATED_ADMIN_DATA.allOrderRecords;

/** Filter MOCK_ADMIN_ORDERS by the same preset/custom date range used on the analytics dashboard */
export function getAdminOrdersForRange(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string
): {
  orders: AdminOrderRecord[];
  fromDate: string;
  toDate: string;
  label: string;
} {
  const { fromDate, toDate, label } = resolveDateRange(
    preset,
    customFrom,
    customTo
  );
  if (fromDate > toDate) {
    return { orders: [], fromDate, toDate, label };
  }
  const orders = MOCK_ADMIN_ORDERS.filter(
    (o) => o.date >= fromDate && o.date <= toDate
  );
  return { orders, fromDate, toDate, label };
}

/** Resolve preset range into concrete fromDate and toDate (ISO YYYY-MM-DD) */
export function resolveDateRange(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string
): { fromDate: string; toDate: string; label: string } {
  switch (preset) {
    case 'THIS_MONTH':
      return {
        fromDate: '2026-11-01',
        toDate: REFERENCE_TODAY,
        label: 'This Month (1 Nov – 21 Nov 2026)',
      };
    case 'LAST_MONTH':
      return {
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
        label: 'Last Month (1 Oct – 31 Oct 2026)',
      };
    case 'THIS_QUARTER':
      return {
        fromDate: '2026-09-01',
        toDate: REFERENCE_TODAY,
        label: 'This Quarter (1 Sep – 21 Nov 2026)',
      };
    case 'THIS_YEAR':
      return {
        fromDate: '2026-01-01',
        toDate: REFERENCE_TODAY,
        label: 'This Year (1 Jan – 21 Nov 2026)',
      };
    case 'CUSTOM': {
      const from = customFrom || '2026-11-01';
      const to = customTo || REFERENCE_TODAY;
      return {
        fromDate: from,
        toDate: to,
        label: `${formatReadableDate(from)} – ${formatReadableDate(to)}`,
      };
    }
  }
}

/** Determine default chart granularity for a preset / date span */
export function getRecommendedGranularity(
  preset: DateRangePreset,
  fromDate: string,
  toDate: string
): ChartGranularity {
  if (preset === 'THIS_MONTH' || preset === 'LAST_MONTH') return 'daily';
  if (preset === 'THIS_QUARTER') return 'monthly';
  if (preset === 'THIS_YEAR') return 'quarterly';

  const days = diffDaysInclusive(fromDate, toDate);
  if (days <= 45) return 'daily';
  if (days <= 210) return 'monthly';
  return 'quarterly';
}

function makeComparison(current: number, previous: number): KpiComparison {
  if (previous <= 0) {
    return {
      value: current,
      previousValue: previous,
      changePercent: null,
      trend: 'neutral',
    };
  }
  const raw = ((current - previous) / previous) * 100;
  const rounded = Math.round(raw * 10) / 10;
  return {
    value: current,
    previousValue: previous,
    changePercent: rounded,
    trend: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'neutral',
  };
}

function aggregateByGranularity(
  records: DailyAnalyticsRecord[],
  granularity: ChartGranularity
): AggregatedTimePoint[] {
  if (records.length === 0) return [];

  const buckets = new Map<
    string,
    {
      label: string;
      records: DailyAnalyticsRecord[];
    }
  >();

  for (const r of records) {
    const dt = parseDateUTC(r.date);
    const year = dt.getUTCFullYear();
    const month = dt.getUTCMonth();
    let key = r.date;
    let label = dt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });

    if (granularity === 'monthly') {
      key = `${year}-${String(month + 1).padStart(2, '0')}`;
      label = dt.toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      });
    } else if (granularity === 'quarterly') {
      const q = Math.floor(month / 3) + 1;
      key = `${year}-Q${q}`;
      label = `Q${q} '${String(year).slice(2)}`;
    }

    const existing = buckets.get(key);
    if (existing) {
      existing.records.push(r);
    } else {
      buckets.set(key, { label, records: [r] });
    }
  }

  const points: AggregatedTimePoint[] = [];
  for (const [key, bucket] of buckets.entries()) {
    const list = bucket.records;
    const last = list[list.length - 1];
    const totalOrders = list.reduce((s, x) => s + x.totalOrders, 0);
    const deliveredOrders = list.reduce((s, x) => s + x.deliveredOrders, 0);
    const cancelledOrders = list.reduce((s, x) => s + x.cancelledOrders, 0);
    const inProgressOrders = Math.max(
      0,
      totalOrders - deliveredOrders - cancelledOrders
    );
    const gmv = list.reduce((s, x) => s + x.gmv, 0);
    const deliveredGmv = list.reduce((s, x) => s + x.deliveredGmv, 0);
    const subscriptionRevenue = list.reduce(
      (s, x) => s + x.subscriptionRevenue,
      0
    );
    const platformFeeRevenue = list.reduce(
      (s, x) => s + x.platformFeeRevenue,
      0
    );
    const totalPlatformRevenue = subscriptionRevenue + platformFeeRevenue;
    const newVendors = list.reduce((s, x) => s + x.newVendors, 0);
    const newStores = list.reduce((s, x) => s + x.newStores, 0);

    const customerCancellations = list.reduce(
      (s, x) => s + x.cancellationByGroup.customer,
      0
    );
    const vendorCancellations = list.reduce(
      (s, x) => s + x.cancellationByGroup.vendor,
      0
    );
    const deliverySystemCancellations = list.reduce(
      (s, x) => s + x.cancellationByGroup.deliverySystem,
      0
    );
    const cancellationRate =
      totalOrders > 0
        ? Math.round((cancelledOrders / totalOrders) * 1000) / 10
        : 0;

    points.push({
      key,
      label: bucket.label,
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      inProgressOrders,
      gmv,
      deliveredGmv,
      avgOrderValue: totalOrders > 0 ? Math.round(gmv / totalOrders) : 0,
      subscriptionRevenue,
      platformFeeRevenue,
      totalPlatformRevenue,
      registeredVendors: last.registeredVendors,
      activeStores: last.activeStores,
      newVendors,
      newStores,
      customerCancellations,
      vendorCancellations,
      deliverySystemCancellations,
      cancellationRate,
    });
  }

  return points;
}

/**
 * Compute a complete, internally consistent analytics snapshot for the given date filter.
 */
export function getAdminAnalyticsSnapshot(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string,
  granularityOverride?: ChartGranularity
): AdminAnalyticsSnapshot {
  const { fromDate, toDate, label } = resolveDateRange(
    preset,
    customFrom,
    customTo
  );
  const defaultGranularity = getRecommendedGranularity(
    preset,
    fromDate,
    toDate
  );
  const granularity = granularityOverride ?? defaultGranularity;
  const dayCount = diffDaysInclusive(fromDate, toDate);

  const currentRecords =
    fromDate <= toDate
      ? MOCK_DAILY_ANALYTICS.filter(
          (r) => r.date >= fromDate && r.date <= toDate
        )
      : [];

  const prevToDate = addDaysISO(fromDate, -1);
  const prevFromDate = addDaysISO(prevToDate, -(Math.max(1, dayCount) - 1));
  const previousRangeLabel = `${formatReadableDate(prevFromDate)} – ${formatReadableDate(prevToDate)}`;
  const prevRecords = MOCK_DAILY_ANALYTICS.filter(
    (r) => r.date >= prevFromDate && r.date <= prevToDate
  );

  if (currentRecords.length === 0) {
    const emptyKpi: KpiComparison = {
      value: 0,
      previousValue: 0,
      changePercent: null,
      trend: 'neutral',
    };
    return {
      hasData: false,
      dateRangeLabel: label,
      fromDate,
      toDate,
      previousRangeLabel,
      granularity,
      dayCount: 0,
      kpis: {
        gmv: emptyKpi,
        totalOrders: emptyKpi,
        deliveredOrders: emptyKpi,
        cancelledOrders: emptyKpi,
        platformRevenue: emptyKpi,
        activeVendors: emptyKpi,
        activeStores: emptyKpi,
        activeSubscriptions: emptyKpi,
      },
      timeSeries: [],
      orderStatusDistribution: [],
      categoryPerformance: [],
      subscriptionAnalytics: {
        activeSubscriptions: 0,
        expiringSubscriptions: 0,
        expiredSubscriptions: 0,
        subscriptionRevenue: 0,
        monthlyPlanActive: 0,
        annualPlanActive: 0,
        monthlyPlanTotal: 0,
        annualPlanTotal: 0,
        monthlyPlanRevenue: 0,
        annualPlanRevenue: 0,
        renewalRate: 0,
      },
      cancellationAnalytics: {
        totalCancellations: 0,
        cancellationRate: 0,
        cancelledOrderValue: 0,
        mostCommonReason: null,
        customerCausedCount: 0,
        customerCausedPercentage: 0,
        vendorCausedCount: 0,
        vendorCausedPercentage: 0,
        deliverySystemCausedCount: 0,
        deliverySystemCausedPercentage: 0,
        reasonsBreakdown: [],
      },
    };
  }

  const sum = (list: DailyAnalyticsRecord[]) => {
    const gmv = list.reduce((s, r) => s + r.gmv, 0);
    const totalOrders = list.reduce((s, r) => s + r.totalOrders, 0);
    const deliveredOrders = list.reduce((s, r) => s + r.deliveredOrders, 0);
    const cancelledOrders = list.reduce((s, r) => s + r.cancelledOrders, 0);
    const platformRevenue = list.reduce(
      (s, r) => s + r.totalPlatformRevenue,
      0
    );
    const last = list[list.length - 1];
    const activeVendors = last ? last.registeredVendors : 0;
    const activeStores = last ? last.activeStores : 0;
    const activeSubscriptions = last ? last.subscriptions.active : 0;
    return {
      gmv,
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      platformRevenue,
      activeVendors,
      activeStores,
      activeSubscriptions,
    };
  };

  const currTotals = sum(currentRecords);
  const prevTotals = sum(prevRecords);

  // Order status distribution across the selected period
  const statusCounts: Record<AdminOrderStatus, number> = {
    ORDER_PLACED: 0,
    ACCEPTED: 0,
    PREPARING: 0,
    READY_FOR_PICKUP: 0,
    OUT_FOR_DELIVERY: 0,
    DELIVERED: currTotals.deliveredOrders,
    CANCELLED: currTotals.cancelledOrders,
  };

  for (const r of currentRecords) {
    statusCounts.ORDER_PLACED += r.inProgressOrders.ORDER_PLACED;
    statusCounts.ACCEPTED += r.inProgressOrders.ACCEPTED;
    statusCounts.PREPARING += r.inProgressOrders.PREPARING;
    statusCounts.READY_FOR_PICKUP += r.inProgressOrders.READY_FOR_PICKUP;
    statusCounts.OUT_FOR_DELIVERY += r.inProgressOrders.OUT_FOR_DELIVERY;
  }

  const statusOrder: AdminOrderStatus[] = [
    'DELIVERED',
    'OUT_FOR_DELIVERY',
    'READY_FOR_PICKUP',
    'PREPARING',
    'ACCEPTED',
    'ORDER_PLACED',
    'CANCELLED',
  ];

  const orderStatusDistribution: OrderStatusDistributionItem[] = statusOrder.map(
    (status) => {
      const count = statusCounts[status];
      const percentage =
        currTotals.totalOrders > 0
          ? Math.round((count / currTotals.totalOrders) * 1000) / 10
          : 0;
      return {
        status,
        label: ORDER_STATUS_META[status].label,
        count,
        percentage,
        color: ORDER_STATUS_META[status].color,
      };
    }
  );

  // Category performance across the selected period
  const categoryTotals = new Map<
    string,
    { shortName: string; orders: number; gmv: number }
  >();
  for (const cat of ANALYTICS_CATEGORIES) {
    categoryTotals.set(cat.name, {
      shortName: cat.shortName,
      orders: 0,
      gmv: 0,
    });
  }
  for (const r of currentRecords) {
    for (const cat of ANALYTICS_CATEGORIES) {
      const entry = r.categoryBreakdown[cat.name];
      if (entry) {
        const prev = categoryTotals.get(cat.name)!;
        prev.orders += entry.orders;
        prev.gmv += entry.gmv;
      }
    }
  }

  const categoryPerformance: CategoryPerformanceItem[] = Array.from(
    categoryTotals.entries()
  )
    .map(([category, data]) => ({
      category,
      shortName: data.shortName,
      orders: data.orders,
      gmv: data.gmv,
      sharePercentage:
        currTotals.gmv > 0
          ? Math.round((data.gmv / currTotals.gmv) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.gmv - a.gmv);

  // Subscription analytics for the period (consistent with MOCK_ADMIN_SUBSCRIPTIONS)
  const latestRecord = currentRecords[currentRecords.length - 1];
  const totalSubRevenue = currentRecords.reduce(
    (s, r) => s + r.subscriptionRevenue,
    0
  );
  const annualCollectDays = currentRecords.filter((r) => {
    const day = parseDateUTC(r.date).getUTCDate();
    return day === 10 || day === 20;
  }).length;
  const annualPlanRevenue = Math.min(totalSubRevenue, annualCollectDays * 1000);
  const monthlyPlanRevenue = Math.max(0, totalSubRevenue - annualPlanRevenue);

  const onboardedAsOfEnd = MOCK_ADMIN_SUBSCRIPTIONS.filter(
    (s) => s.onboardingDate <= latestRecord.date
  );
  const monthlyPlanTotal = onboardedAsOfEnd.filter(
    (s) => s.billingCycle === 'Monthly'
  ).length;
  const annualPlanTotal = onboardedAsOfEnd.filter(
    (s) => s.billingCycle === 'Annual'
  ).length;

  const totalTrackedSubs =
    latestRecord.subscriptions.active +
    latestRecord.subscriptions.expiringSoon +
    latestRecord.subscriptions.expired;
  const nonExpiredSubs =
    latestRecord.subscriptions.active + latestRecord.subscriptions.expiringSoon;
  const renewalRate =
    totalTrackedSubs > 0
      ? Math.round((nonExpiredSubs / totalTrackedSubs) * 1000) / 10
      : 0;

  const subscriptionAnalytics: SubscriptionAnalyticsSummary = {
    activeSubscriptions: latestRecord.subscriptions.active,
    expiringSubscriptions: latestRecord.subscriptions.expiringSoon,
    expiredSubscriptions: latestRecord.subscriptions.expired,
    subscriptionRevenue: totalSubRevenue,
    monthlyPlanActive: latestRecord.subscriptions.monthlyPlanCount,
    annualPlanActive: latestRecord.subscriptions.annualPlanCount,
    monthlyPlanTotal,
    annualPlanTotal,
    monthlyPlanRevenue,
    annualPlanRevenue,
    renewalRate,
  };

  // Order Cancellation Analytics for the selected period (strictly matches currTotals.cancelledOrders)
  const reasonTotals: Record<CancellationReasonKey, number> = {
    CUSTOMER_CANCELLED: 0,
    STORE_REJECTED: 0,
    ITEM_UNAVAILABLE: 0,
    STORE_UNABLE_TO_FULFIL: 0,
    DELIVERY_ISSUE: 0,
    PAYMENT_ISSUE: 0,
    DUPLICATE_ORDER: 0,
    OTHER: 0,
  };
  let customerCausedCount = 0;
  let vendorCausedCount = 0;
  let deliverySystemCausedCount = 0;
  let cancelledOrderValue = 0;

  for (const r of currentRecords) {
    for (const key of CANCELLATION_REASON_KEYS) {
      reasonTotals[key] += r.cancellationByReason[key];
    }
    customerCausedCount += r.cancellationByGroup.customer;
    vendorCausedCount += r.cancellationByGroup.vendor;
    deliverySystemCausedCount += r.cancellationByGroup.deliverySystem;
    cancelledOrderValue += r.cancelledOrderValue;
  }

  const totalCancellations = currTotals.cancelledOrders;
  const cancellationRate =
    currTotals.totalOrders > 0
      ? Math.round((totalCancellations / currTotals.totalOrders) * 1000) / 10
      : 0;

  const reasonsBreakdown: CancellationReasonBreakdownItem[] =
    CANCELLATION_REASON_KEYS.map((key) => {
      const meta = CANCELLATION_REASON_META[key];
      const count = reasonTotals[key];
      const percentage =
        totalCancellations > 0
          ? Math.round((count / totalCancellations) * 1000) / 10
          : 0;
      return {
        key,
        label: meta.label,
        cancelledBy: meta.cancelledBy,
        attributionGroup: meta.attributionGroup,
        count,
        percentage,
        color: meta.color,
      };
    }).sort((a, b) => b.count - a.count);

  const topReason =
    reasonsBreakdown.length > 0 && reasonsBreakdown[0].count > 0
      ? {
          key: reasonsBreakdown[0].key,
          label: reasonsBreakdown[0].label,
          count: reasonsBreakdown[0].count,
          percentage: reasonsBreakdown[0].percentage,
        }
      : null;

  const cancellationAnalytics: CancellationAnalyticsSummary = {
    totalCancellations,
    cancellationRate,
    cancelledOrderValue,
    mostCommonReason: topReason,
    customerCausedCount,
    customerCausedPercentage:
      totalCancellations > 0
        ? Math.round((customerCausedCount / totalCancellations) * 1000) / 10
        : 0,
    vendorCausedCount,
    vendorCausedPercentage:
      totalCancellations > 0
        ? Math.round((vendorCausedCount / totalCancellations) * 1000) / 10
        : 0,
    deliverySystemCausedCount,
    deliverySystemCausedPercentage:
      totalCancellations > 0
        ? Math.round((deliverySystemCausedCount / totalCancellations) * 1000) /
          10
        : 0,
    reasonsBreakdown,
  };

  return {
    hasData: true,
    dateRangeLabel: label,
    fromDate,
    toDate,
    previousRangeLabel,
    granularity,
    dayCount: currentRecords.length,
    kpis: {
      gmv: makeComparison(currTotals.gmv, prevTotals.gmv),
      totalOrders: makeComparison(
        currTotals.totalOrders,
        prevTotals.totalOrders
      ),
      deliveredOrders: makeComparison(
        currTotals.deliveredOrders,
        prevTotals.deliveredOrders
      ),
      cancelledOrders: makeComparison(
        currTotals.cancelledOrders,
        prevTotals.cancelledOrders
      ),
      platformRevenue: makeComparison(
        currTotals.platformRevenue,
        prevTotals.platformRevenue
      ),
      activeVendors: makeComparison(
        currTotals.activeVendors,
        prevTotals.activeVendors
      ),
      activeStores: makeComparison(
        currTotals.activeStores,
        prevTotals.activeStores
      ),
      activeSubscriptions: makeComparison(
        currTotals.activeSubscriptions,
        prevTotals.activeSubscriptions
      ),
    },
    timeSeries: aggregateByGranularity(currentRecords, granularity),
    orderStatusDistribution,
    categoryPerformance,
    subscriptionAnalytics,
    cancellationAnalytics,
  };
}
