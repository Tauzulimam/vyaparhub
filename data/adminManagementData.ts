import {
  type AdminSubscriptionRecord,
  type AdminSubscriptionStatus,
  ANALYTICS_CATEGORIES,
  MOCK_ADMIN_ORDERS,
  MOCK_ADMIN_SUBSCRIPTIONS,
  REFERENCE_TODAY,
} from '@/data/adminAnalyticsData';
import { mockCategories, mockStores } from '@/data/mockData';
import {
  initialStoreProducts,
  masterCatalog,
  mockVendorStores,
} from '@/data/vendorData';

export type AdminVerificationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED';
export type AdminVendorAccountStatus = 'ACTIVE' | 'PENDING_REVIEW' | 'SUSPENDED';
export type AdminStoreMarketplaceStatus =
  | 'ACTIVE'
  | 'PENDING_VERIFICATION'
  | 'SUSPENDED'
  | 'REJECTED';

export interface AdminStoreRecord {
  storeId: string;
  storeName: string;
  category: string;
  sector: string;
  address: string;
  description: string;
  vendorId: string;
  vendorName: string;
  phone: string;
  email: string;
  onboardingDate: string;
  /** Vendor-controlled operational Open/Closed state (Read-only in Admin Console) */
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  operationalHoursLabel: string;
  deliveryRadiusKm: number;
  minOrderAmount: number;
  verificationStatus: AdminVerificationStatus;
  marketplaceStatus: AdminStoreMarketplaceStatus;
  statusNote?: string;
  gstRegistered: boolean;
  /** Present ONLY when gstRegistered is true. Never fabricated for non-GST stores. */
  gstin?: string;
  gstVerified: boolean;
  subscriptionId: string;
  subscriptionPlanName: 'Monthly Plan' | 'Annual Plan';
  subscriptionBillingCycle: 'Monthly' | 'Annual';
  subscriptionAmount: number;
  subscriptionStartDate: string;
  subscriptionExpiryDate: string;
  subscriptionStatus: AdminSubscriptionStatus;
  subscriptionDaysDelta: number;
  inventoryTotalProducts: number;
  inventoryInStockCount: number;
  inventoryLowOrOutCount: number;
  recentOrdersCount: number;
  recentDeliveredCount: number;
  recentCancelledCount: number;
  recentGmv: number;
  rating: number;
}

export interface AdminVendorRecord {
  vendorId: string;
  ownerName: string;
  phone: string;
  email: string;
  onboardingDate: string;
  primarySector: string;
  businessEntityType: 'Proprietorship' | 'Partnership' | 'Private Limited (LLP/Pvt)';
  kycVerificationSummary: string;
  verificationStatus: AdminVerificationStatus;
  accountStatus: AdminVendorAccountStatus;
  statusNote?: string;
  lastReviewedOn: string;
  storeIds: string[];
}

export interface AdminMasterProductRecord {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  mrp: number;
  image: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  storesListingCount: number;
  vendorPriceRangeLabel: string;
}

export interface AdminCategoryRecord {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  description: string;
  iconEmoji: string;
  accentColor: string;
  image: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Valid Haryana (06) GSTIN registry ONLY for stores that have gstRegistered === true
 * in MOCK_ADMIN_SUBSCRIPTIONS. Non-GST stores never receive a GSTIN.
 */
const VERIFIED_STORE_GSTINS: Record<string, string> = {
  'store-1': '06ABCDE1234F1Z5', // Matches mockVendorStore in data/vendorData.ts
  'store-2': '06AABCF4821M1Z2',
  'store-3': '06AAACA7291K1Z8',
  'store-4': '06AABCC3910P1Z4',
  'store-6': '06AADCG8412R1Z9',
  'store-7': '06AAECP5190L1Z1',
  'store-8': '06AABCM9034D1Z6',
  'store-9': '06AABCB7741E1Z3',
  'store-11': '06AAFCG2198H1Z7',
  'store-12': '06AAACA7291K2Z7',
  'store-14': '06AABCC3910P2Z3',
  'store-15': '06ABCPV6612N1Z5',
  'store-18': '06AABCQ3389J1Z2',
  'store-19': '06AADCA8840B1Z4',
  'store-21': '06AAECP5190L2Z0',
  'store-23': '06AABCS6712Q1Z8',
  'store-24': '06ABCPM4490C1Z1',
  'store-25': '06AAECC9104F1Z6',
  'store-27': '06AABCF4821M2Z1',
  'store-28': '06AADCV7531G1Z9',
  'store-30': '06AABCD5520T1Z3',
};

const STORE_HOURS_BY_CATEGORY: Record<
  string,
  { openTime: string; closeTime: string; label: string; radiusKm: number; minOrder: number }
> = {
  'Daily Grocery & Staples': {
    openTime: '07:00',
    closeTime: '22:30',
    label: '7:00 AM – 10:30 PM',
    radiusKm: 5,
    minOrder: 100,
  },
  'Dairy & Fresh Sweets': {
    openTime: '06:00',
    closeTime: '21:30',
    label: '6:00 AM – 9:30 PM',
    radiusKm: 3,
    minOrder: 60,
  },
  'Bakery & Confectionery': {
    openTime: '08:00',
    closeTime: '21:30',
    label: '8:00 AM – 9:30 PM',
    radiusKm: 4,
    minOrder: 120,
  },
  'Pharmacy & Wellness': {
    openTime: '00:00',
    closeTime: '23:59',
    label: '24 Hours Open',
    radiusKm: 5,
    minOrder: 80,
  },
  'General Store & Home Needs': {
    openTime: '08:00',
    closeTime: '22:00',
    label: '8:00 AM – 10:00 PM',
    radiusKm: 5,
    minOrder: 150,
  },
  'Stationery & Books': {
    openTime: '09:00',
    closeTime: '20:30',
    label: '9:00 AM – 8:30 PM',
    radiusKm: 4,
    minOrder: 100,
  },
  'Electronics & Mobile': {
    openTime: '10:00',
    closeTime: '21:00',
    label: '10:00 AM – 9:00 PM',
    radiusKm: 5,
    minOrder: 200,
  },
  'Pet Supplies & Care': {
    openTime: '09:30',
    closeTime: '20:00',
    label: '9:30 AM – 8:00 PM',
    radiusKm: 5,
    minOrder: 180,
  },
};

function buildInitialAdminStores(): AdminStoreRecord[] {
  const recentOrdersCutoff = '2026-10-23'; // Last 30 days up to REFERENCE_TODAY (2026-11-21)
  const recentOrders = MOCK_ADMIN_ORDERS.filter((o) => o.date >= recentOrdersCutoff);

  return MOCK_ADMIN_SUBSCRIPTIONS.map((sub: AdminSubscriptionRecord, idx: number) => {
    const vendorPortalStore = mockVendorStores.find((vs) => vs.id === sub.storeId);
    const customerStore = mockStores.find((cs) => cs.id === sub.storeId);
    const catDefaults =
      STORE_HOURS_BY_CATEGORY[sub.storeCategory] ||
      STORE_HOURS_BY_CATEGORY['Daily Grocery & Staples'];

    // Determine verification and marketplace status consistently
    let verificationStatus: AdminVerificationStatus = 'VERIFIED';
    let marketplaceStatus: AdminStoreMarketplaceStatus = 'ACTIVE';
    let statusNote: string | undefined;

    if (sub.storeId === 'store-29' || sub.storeId === 'store-30' || sub.storeId === 'store-31') {
      verificationStatus = 'PENDING';
      marketplaceStatus = 'PENDING_VERIFICATION';
      statusNote =
        'Newly onboarded store awaiting physical signboard & shop license verification by city operations team.';
    } else if (sub.storeId === 'store-8' || sub.storeId === 'store-22') {
      verificationStatus = 'VERIFIED';
      marketplaceStatus = 'SUSPENDED';
      statusNote =
        'Marketplace visibility temporarily suspended due to expired store subscription (>9 days overdue) and pending compliance renewal.';
    }

    // Determine vendor-controlled Open/Closed status consistently with mockVendorStores & mockStores
    let isOpen = true;
    if (vendorPortalStore) {
      isOpen = vendorPortalStore.isOpen;
    } else if (customerStore) {
      isOpen = customerStore.isOpen;
    } else if (marketplaceStatus === 'SUSPENDED') {
      isOpen = false;
    } else {
      // Deterministic realistic open/closed distribution for remaining stores
      isOpen = idx % 5 !== 0;
    }

    // GST fields: strictly honor sub.gstRegistered; NEVER fabricate GSTIN for non-GST stores
    const gstRegistered = sub.gstRegistered;
    const gstin = gstRegistered ? VERIFIED_STORE_GSTINS[sub.storeId] : undefined;
    const gstVerified = Boolean(gstRegistered && gstin);

    // Inventory count: match initialStoreProducts for store-1 and vstore-2, realistic for others
    const storeSpecificProducts = initialStoreProducts.filter(
      (sp) => sp.storeId === sub.storeId
    );
    const inventoryTotalProducts =
      storeSpecificProducts.length > 0
        ? storeSpecificProducts.length
        : 12 + ((idx * 3) % 14);
    const inventoryLowOrOutCount =
      storeSpecificProducts.length > 0
        ? storeSpecificProducts.filter((sp) => sp.quantity <= 10).length
        : 1 + (idx % 4);
    const inventoryInStockCount = Math.max(
      0,
      inventoryTotalProducts - inventoryLowOrOutCount
    );

    // Recent 30-day order activity from MOCK_ADMIN_ORDERS
    const storeOrders = recentOrders.filter((o) => o.storeId === sub.storeId);
    const recentCancelledCount = storeOrders.filter(
      (o) => o.status === 'CANCELLED'
    ).length;
    const recentDeliveredCount =
      storeOrders.filter((o) => o.status === 'DELIVERED').length +
      18 +
      ((idx * 7) % 35);
    const recentOrdersCount = recentDeliveredCount + recentCancelledCount + (idx % 3);
    const recentGmv =
      storeOrders.reduce((s, o) => s + o.orderValue, 0) +
      recentDeliveredCount * (280 + ((idx * 23) % 190));

    return {
      storeId: sub.storeId,
      storeName: sub.storeName,
      category: sub.storeCategory,
      sector: sub.sector,
      address:
        vendorPortalStore?.address ||
        (customerStore ? `${customerStore.address}, Gurugram` : `Shop ${10 + idx}, ${sub.sector}, Gurugram`),
      description:
        vendorPortalStore?.description ||
        customerStore?.description ||
        `Hyperlocal ${sub.storeCategory.toLowerCase()} outlet serving verified neighborhood orders in ${sub.sector}.`,
      vendorId: sub.vendorId,
      vendorName: sub.vendorName,
      phone: vendorPortalStore?.phone || customerStore?.phone || sub.vendorPhone,
      email: vendorPortalStore?.email || sub.vendorEmail,
      onboardingDate: sub.onboardingDate,
      isOpen,
      openTime: vendorPortalStore?.openTime || catDefaults.openTime,
      closeTime: vendorPortalStore?.closeTime || catDefaults.closeTime,
      operationalHoursLabel: customerStore?.timing?.includes('AM')
        ? customerStore.timing
        : catDefaults.label,
      deliveryRadiusKm:
        vendorPortalStore?.deliveryRadiusKm || catDefaults.radiusKm,
      minOrderAmount:
        vendorPortalStore?.minOrderAmount || catDefaults.minOrder,
      verificationStatus,
      marketplaceStatus,
      statusNote,
      gstRegistered,
      gstin,
      gstVerified,
      subscriptionId: sub.id,
      subscriptionPlanName: sub.planName,
      subscriptionBillingCycle: sub.billingCycle,
      subscriptionAmount: sub.amount,
      subscriptionStartDate: sub.startDate,
      subscriptionExpiryDate: sub.expiryDate,
      subscriptionStatus: sub.status,
      subscriptionDaysDelta: sub.daysDelta,
      inventoryTotalProducts,
      inventoryInStockCount,
      inventoryLowOrOutCount,
      recentOrdersCount,
      recentDeliveredCount,
      recentCancelledCount,
      recentGmv,
      rating: customerStore?.rating || Number((4.4 + ((idx * 3) % 6) * 0.1).toFixed(1)),
    };
  });
}

export const INITIAL_ADMIN_STORES: AdminStoreRecord[] = buildInitialAdminStores();

const ENTITY_TYPES: AdminVendorRecord['businessEntityType'][] = [
  'Proprietorship',
  'Partnership',
  'Private Limited (LLP/Pvt)',
];

function buildInitialAdminVendors(stores: AdminStoreRecord[]): AdminVendorRecord[] {
  const byVendor = new Map<string, AdminStoreRecord[]>();
  for (const st of stores) {
    const list = byVendor.get(st.vendorId);
    if (list) {
      list.push(st);
    } else {
      byVendor.set(st.vendorId, [st]);
    }
  }

  const vendors: AdminVendorRecord[] = [];
  let idx = 0;

  for (const [vendorId, vendorStores] of byVendor.entries()) {
    const primary = vendorStores[0];
    const earliestDate = vendorStores
      .map((s) => s.onboardingDate)
      .sort()[0];

    let verificationStatus: AdminVerificationStatus = 'VERIFIED';
    let accountStatus: AdminVendorAccountStatus = 'ACTIVE';
    let statusNote: string | undefined;

    if (vendorId === 'ven-125' || vendorId === 'ven-126') {
      verificationStatus = 'PENDING';
      accountStatus = 'PENDING_REVIEW';
      statusNote =
        'Vendor identity & municipal trade license uploaded; awaiting final Admin Console verification approval.';
    } else if (vendorId === 'ven-108' || vendorId === 'ven-118') {
      verificationStatus = 'VERIFIED';
      accountStatus = 'SUSPENDED';
      statusNote =
        'Account restricted due to lapsed store subscription and pending settlement reconciliation.';
    }

    const hasGst = vendorStores.some((s) => s.gstRegistered);
    const kycVerificationSummary =
      verificationStatus === 'VERIFIED'
        ? hasGst
          ? 'Business PAN, Municipal Trade License & GST Registration Certificate Verified'
          : 'Owner Identity KYC & Municipal Shop Establishment Certificate Verified (GST Exempt)'
        : 'Shop Establishment Certificate & Business Identity submitted (Pending Review)';

    vendors.push({
      vendorId,
      ownerName: primary.vendorName,
      phone: primary.phone,
      email: primary.email,
      onboardingDate: earliestDate,
      primarySector: primary.sector,
      businessEntityType:
        vendorStores.length > 1
          ? 'Partnership'
          : ENTITY_TYPES[idx % ENTITY_TYPES.length],
      kycVerificationSummary,
      verificationStatus,
      accountStatus,
      statusNote,
      lastReviewedOn:
        verificationStatus === 'PENDING' ? REFERENCE_TODAY : '2026-11-15',
      storeIds: vendorStores.map((s) => s.storeId),
    });
    idx += 1;
  }

  return vendors;
}

export const INITIAL_ADMIN_VENDORS: AdminVendorRecord[] =
  buildInitialAdminVendors(INITIAL_ADMIN_STORES);

/**
 * Additional master catalog products from mockData.ts (mc-25..mc-28) so every customer
 * product and an initial pair of inactive/archived master catalog items are represented.
 */
const EXTRA_MASTER_PRODUCTS: {
  id: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  mrp: number;
  image: string;
  description: string;
  active: boolean;
}[] = [
  {
    id: 'mc-25',
    name: 'Freshly Baked Garlic Herb Toast',
    brand: 'City Bakery',
    category: 'Bakery & Confectionery',
    unit: '250 g box',
    mrp: 85,
    image: '/images/products/bakery-bread.svg',
    description: 'Crisp artisan rusk infused with roasted garlic and Italian herbs.',
    active: true,
  },
  {
    id: 'mc-26',
    name: 'Volini Joint & Muscle Pain Relief Gel',
    brand: 'Volini',
    category: 'Pharmacy & Wellness',
    unit: '30 g tube',
    mrp: 145,
    image: '/images/products/pharmacy-care.svg',
    description: 'Fast-acting formula with micro-particles for deep musculoskeletal relief.',
    active: true,
  },
  {
    id: 'mc-27',
    name: 'boAt Bassheads 100 Wired Earphones',
    brand: 'boAt',
    category: 'Electronics & Mobile',
    unit: '1 unit (Black)',
    mrp: 999,
    image: '/images/products/electronics-accessories.svg',
    description: 'Powerful 10mm dynamic drivers with in-line microphone and hawk design.',
    active: true,
  },
  {
    id: 'mc-28',
    name: 'Whiskas Adult Wet Cat Food Gravy Pouches',
    brand: 'Whiskas',
    category: 'Pet Supplies & Care',
    unit: 'Pack of 4 (85 g each)',
    mrp: 190,
    image: '/images/products/pet-nutrition.svg',
    description: 'Tuna in jelly succulent chunks for glossy coat and healthy eyesight.',
    active: true,
  },
  {
    id: 'mc-29',
    name: 'Amul Kool Kesar Flavoured Milk Bottle',
    brand: 'Amul',
    category: 'Dairy & Fresh Sweets',
    unit: '200 ml glass bottle',
    mrp: 30,
    image: '/images/products/dairy-milk.svg',
    description: 'Seasonal chilled saffron milk beverage (currently paused in master catalog).',
    active: false,
  },
  {
    id: 'mc-30',
    name: 'Syska 12W B22 Cool Daylight LED Bulb',
    brand: 'Syska',
    category: 'Electronics & Mobile',
    unit: '1 unit (B22 Base)',
    mrp: 160,
    image: '/images/products/electronics-accessories.svg',
    description: 'Energy-saving LED bulb pack; superseded by new 14W SKU.',
    active: false,
  },
];

function buildInitialMasterCatalog(): AdminMasterProductRecord[] {
  const combined = [
    ...masterCatalog.map((p) => ({ ...p })),
    ...EXTRA_MASTER_PRODUCTS,
  ];

  return combined.map((p, idx) => {
    const skuNum = 1001 + idx;
    const matchedStoreProducts = initialStoreProducts.filter(
      (sp) => sp.masterProductId === p.id
    );
    const storesListingCount = p.active
      ? Math.max(matchedStoreProducts.length, 2 + ((idx * 3) % 7))
      : matchedStoreProducts.length;

    const lowPrice = Math.max(15, Math.round(p.mrp * 0.88));
    const highPrice = Math.max(lowPrice + 2, Math.round(p.mrp * 0.96));

    return {
      id: p.id,
      sku: `VH-MC-${skuNum}`,
      name: p.name,
      brand: p.brand,
      category: p.category,
      unit: p.unit,
      mrp: p.mrp,
      image: p.image || '/images/placeholder-product.svg',
      description: p.description,
      active: p.active,
      createdAt: idx < 18 ? '2025-10-05' : '2026-04-12',
      updatedAt: idx % 3 === 0 ? '2026-11-18' : '2026-10-29',
      storesListingCount,
      vendorPriceRangeLabel:
        storesListingCount > 0
          ? `₹${lowPrice.toLocaleString('en-IN')} – ₹${highPrice.toLocaleString('en-IN')}`
          : 'Not currently listed',
    };
  });
}

export const INITIAL_ADMIN_MASTER_CATALOG: AdminMasterProductRecord[] =
  buildInitialMasterCatalog();

const CATEGORY_VISUAL_META: Record<
  string,
  { iconEmoji: string; accentColor: string }
> = {
  'Daily Grocery & Staples': { iconEmoji: '🌾', accentColor: '#166534' },
  'Dairy & Fresh Sweets': { iconEmoji: '🥛', accentColor: '#15803D' },
  'Bakery & Confectionery': { iconEmoji: '🥖', accentColor: '#B45309' },
  'Pharmacy & Wellness': { iconEmoji: '💊', accentColor: '#16A34A' },
  'General Store & Home Needs': { iconEmoji: '🧺', accentColor: '#D97706' },
  'Stationery & Books': { iconEmoji: '📚', accentColor: '#166534' },
  'Electronics & Mobile': { iconEmoji: '🔌', accentColor: '#B45309' },
  'Pet Supplies & Care': { iconEmoji: '🐾', accentColor: '#65A30D' },
};

function buildInitialCategories(): AdminCategoryRecord[] {
  return ANALYTICS_CATEGORIES.map((ac, idx) => {
    const matchedMock = mockCategories.find((c) => c.name === ac.name);
    const visual = CATEGORY_VISUAL_META[ac.name] || {
      iconEmoji: '📦',
      accentColor: '#166534',
    };
    return {
      id: matchedMock?.id || `cat-${idx + 1}`,
      name: ac.name,
      shortName: ac.shortName,
      slug:
        matchedMock?.slug ||
        ac.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description:
        matchedMock?.description ||
        `Standardized master catalog products and neighborhood stores for ${ac.name}.`,
      iconEmoji: visual.iconEmoji,
      accentColor: visual.accentColor,
      image: matchedMock?.image || '/images/placeholder-category.svg',
      active: true,
      createdAt: '2025-10-01',
      updatedAt: '2026-11-10',
    };
  });
}

export const INITIAL_ADMIN_CATEGORIES: AdminCategoryRecord[] =
  buildInitialCategories();
