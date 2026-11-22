-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'VENDOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MarketplaceStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('G', 'KG', 'ML', 'L', 'PIECE', 'PACK', 'DOZEN');

-- CreateEnum
CREATE TYPE "AddressLabel" AS ENUM ('HOME', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'UPI', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('ITEM_STOCK_UNAVAILABLE', 'CUSTOMER_CANCELLED', 'STORE_REJECTED', 'STORE_UNABLE_TO_FULFIL', 'DELIVERY_ISSUE', 'DUPLICATE_ACCIDENTAL_ORDER', 'PAYMENT_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderActorType" AS ENUM ('CUSTOMER', 'VENDOR', 'ADMIN', 'SYSTEM', 'DELIVERY');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GstStatus" AS ENUM ('REGISTERED', 'NOT_REGISTERED');

-- CreateTable
CREATE TABLE "users" (
    "authUserId" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "registeredMobile" TEXT NOT NULL,
    "businessEmail" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vendor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "area" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "openingTime" TEXT,
    "closingTime" TEXT,
    "deliveryRadiusKm" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "minimumOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "marketplaceStatus" "MarketplaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_business_details" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "gstStatus" "GstStatus" NOT NULL,
    "gstin" TEXT,
    "legalBusinessName" TEXT,
    "gstVerified" BOOLEAN NOT NULL DEFAULT false,
    "gstVerifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "store_business_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_products" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "unitValue" DECIMAL(10,3) NOT NULL,
    "unitType" "UnitType" NOT NULL,
    "mrp" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "master_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_products" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "masterProductId" TEXT NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "store_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "label" "AddressLabel" NOT NULL DEFAULT 'HOME',
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "landmark" TEXT,
    "area" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "storeProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storeNameSnapshot" TEXT NOT NULL,
    "storePhoneSnapshot" TEXT,
    "addressId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "cancellationReason" "CancellationReason",
    "cancellationNote" TEXT,
    "cancelledByType" "OrderActorType",
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "placedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "masterProductId" TEXT NOT NULL,
    "storeProductId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "brandSnapshot" TEXT,
    "unitSnapshot" TEXT NOT NULL,
    "imageUrlSnapshot" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_addresses" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "landmark" TEXT,
    "area" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_histories" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "changedByType" "OrderActorType" NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "startDate" TIMESTAMPTZ(3) NOT NULL,
    "endDate" TIMESTAMPTZ(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_periods" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "startDate" TIMESTAMPTZ(3) NOT NULL,
    "endDate" TIMESTAMPTZ(3) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "subscriptionPeriodId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL,
    "paidAt" TIMESTAMPTZ(3),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "documentUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_authUserId_key" ON "users"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_accountStatus_idx" ON "users"("role", "accountStatus");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_userId_key" ON "customer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_profiles_userId_key" ON "vendor_profiles"("userId");

-- CreateIndex
CREATE INDEX "vendor_profiles_verificationStatus_idx" ON "vendor_profiles"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");

-- CreateIndex
CREATE INDEX "stores_vendorProfileId_idx" ON "stores"("vendorProfileId");

-- CreateIndex
CREATE INDEX "stores_categoryId_idx" ON "stores"("categoryId");

-- CreateIndex
CREATE INDEX "stores_city_area_idx" ON "stores"("city", "area");

-- CreateIndex
CREATE INDEX "stores_postalCode_idx" ON "stores"("postalCode");

-- CreateIndex
CREATE INDEX "stores_verificationStatus_marketplaceStatus_isOpen_idx" ON "stores"("verificationStatus", "marketplaceStatus", "isOpen");

-- CreateIndex
CREATE UNIQUE INDEX "store_business_details_storeId_key" ON "store_business_details"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "store_business_details_gstin_key" ON "store_business_details"("gstin");

-- CreateIndex
CREATE INDEX "master_products_categoryId_isActive_idx" ON "master_products"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "master_products_name_idx" ON "master_products"("name");

-- CreateIndex
CREATE INDEX "master_products_brand_idx" ON "master_products"("brand");

-- CreateIndex
CREATE INDEX "store_products_masterProductId_idx" ON "store_products"("masterProductId");

-- CreateIndex
CREATE INDEX "store_products_storeId_isAvailable_idx" ON "store_products"("storeId", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "store_products_storeId_masterProductId_key" ON "store_products"("storeId", "masterProductId");

-- CreateIndex
CREATE INDEX "addresses_customerProfileId_isDefault_idx" ON "addresses"("customerProfileId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "carts_customerProfileId_key" ON "carts"("customerProfileId");

-- CreateIndex
CREATE INDEX "carts_storeId_idx" ON "carts"("storeId");

-- CreateIndex
CREATE INDEX "cart_items_storeProductId_idx" ON "cart_items"("storeProductId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_storeProductId_key" ON "cart_items"("cartId", "storeProductId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_customerProfileId_placedAt_idx" ON "orders"("customerProfileId", "placedAt");

-- CreateIndex
CREATE INDEX "orders_storeId_status_placedAt_idx" ON "orders"("storeId", "status", "placedAt");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_paymentStatus_idx" ON "orders"("paymentStatus");

-- CreateIndex
CREATE INDEX "orders_cancellationReason_cancelledByType_cancelledAt_idx" ON "orders"("cancellationReason", "cancelledByType", "cancelledAt");

-- CreateIndex
CREATE INDEX "orders_addressId_idx" ON "orders"("addressId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_masterProductId_idx" ON "order_items"("masterProductId");

-- CreateIndex
CREATE INDEX "order_items_storeProductId_idx" ON "order_items"("storeProductId");

-- CreateIndex
CREATE UNIQUE INDEX "order_addresses_orderId_key" ON "order_addresses"("orderId");

-- CreateIndex
CREATE INDEX "order_status_histories_orderId_createdAt_idx" ON "order_status_histories"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_storeId_key" ON "subscriptions"("storeId");

-- CreateIndex
CREATE INDEX "subscriptions_status_endDate_idx" ON "subscriptions"("status", "endDate");

-- CreateIndex
CREATE INDEX "subscription_periods_subscriptionId_startDate_idx" ON "subscription_periods"("subscriptionId", "startDate");

-- CreateIndex
CREATE INDEX "subscription_periods_paymentStatus_idx" ON "subscription_periods"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_periods_id_subscriptionId_key" ON "subscription_periods"("id", "subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_invoiceNumber_key" ON "subscription_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscriptionId_issuedAt_idx" ON "subscription_invoices"("subscriptionId", "issuedAt");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscriptionPeriodId_idx" ON "subscription_invoices"("subscriptionPeriodId");

-- CreateIndex
CREATE INDEX "subscription_invoices_paymentStatus_issuedAt_idx" ON "subscription_invoices"("paymentStatus", "issuedAt");

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_business_details" ADD CONSTRAINT "store_business_details_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_products" ADD CONSTRAINT "master_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "master_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "master_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_histories" ADD CONSTRAINT "order_status_histories_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_periods" ADD CONSTRAINT "subscription_periods_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscriptionPeriodId_subscriptionId_fkey" FOREIGN KEY ("subscriptionPeriodId", "subscriptionId") REFERENCES "subscription_periods"("id", "subscriptionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- Phase 3D.2 custom PostgreSQL integrity & security SQL (approved)
-- =============================================================================

-- =============================================================================
-- VyaparHub Phase 3D.2 -- PROPOSED PostgreSQL integrity & security SQL
-- STATUS: DRAFT FOR REVIEW. NOT APPLIED. NOT part of prisma/migrations.
-- Intended use: after approval, append to the first migration SQL generated with
--   prisma migrate diff --from-empty --to-schema --script
-- Table names = @@map names; column names = Prisma field names (no column @map),
-- so camelCase columns must be double-quoted.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ROW LEVEL SECURITY (all 18 tables, no policies => deny-all for anon/authenticated)
--    Prisma connects as the owner role, which bypasses RLS. Do NOT use FORCE ROW
--    LEVEL SECURITY (it would subject the owner connection to RLS).
-- -----------------------------------------------------------------------------
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_business_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_addresses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_periods   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices  ENABLE ROW LEVEL SECURITY;


-- Prisma's _prisma_migrations metadata table is intentionally left untouched.


-- -----------------------------------------------------------------------------
-- 2. CATALOG / INVENTORY
-- -----------------------------------------------------------------------------
-- -----------------------------------------------------------------------------
ALTER TABLE master_products
  ADD CONSTRAINT master_products_mrp_positive_chk        CHECK ("mrp" > 0),
  ADD CONSTRAINT master_products_unit_value_positive_chk CHECK ("unitValue" > 0);

ALTER TABLE store_products
  ADD CONSTRAINT store_products_selling_price_positive_chk CHECK ("sellingPrice" > 0),
  ADD CONSTRAINT store_products_stock_non_negative_chk     CHECK ("stockQuantity" >= 0);
-- sellingPrice <= master_products.mrp is cross-table: app/service layer only.


-- -----------------------------------------------------------------------------
-- 3. CART / ORDERS
-- -----------------------------------------------------------------------------
ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_quantity_min_chk CHECK ("quantity" >= 1);

ALTER TABLE order_items
  ADD CONSTRAINT order_items_quantity_min_chk       CHECK ("quantity" >= 1),
  ADD CONSTRAINT order_items_unit_price_non_neg_chk CHECK ("unitPrice" >= 0),
  ADD CONSTRAINT order_items_line_total_chk         CHECK ("lineTotal" = "unitPrice" * "quantity");

ALTER TABLE orders
  ADD CONSTRAINT orders_subtotal_non_neg_chk        CHECK ("subtotal" >= 0),
  ADD CONSTRAINT orders_delivery_fee_non_neg_chk    CHECK ("deliveryFee" >= 0),
  ADD CONSTRAINT orders_discount_non_neg_chk        CHECK ("discountAmount" >= 0),
  ADD CONSTRAINT orders_total_non_neg_chk           CHECK ("totalAmount" >= 0),
  ADD CONSTRAINT orders_total_amount_formula_chk    CHECK ("totalAmount" = "subtotal" + "deliveryFee" - "discountAmount");


-- -----------------------------------------------------------------------------
-- 4. STORES
-- -----------------------------------------------------------------------------
ALTER TABLE stores
  ADD CONSTRAINT stores_min_order_amount_non_neg_chk CHECK ("minimumOrderAmount" >= 0),
  ADD CONSTRAINT stores_delivery_radius_non_neg_chk  CHECK ("deliveryRadiusKm" >= 0),
  ADD CONSTRAINT stores_latitude_range_chk           CHECK ("latitude"  IS NULL OR "latitude"  BETWEEN -90  AND 90),
  ADD CONSTRAINT stores_longitude_range_chk          CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT stores_coordinate_pair_chk          CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
  -- HH:mm only (00:00-23:59). No overnight logic here: closing < opening is allowed.
  ADD CONSTRAINT stores_opening_time_format_chk      CHECK ("openingTime" IS NULL OR "openingTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT stores_closing_time_format_chk      CHECK ("closingTime" IS NULL OR "closingTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');


-- -----------------------------------------------------------------------------
-- 5. COORDINATES (addresses, order_addresses)
-- -----------------------------------------------------------------------------
ALTER TABLE addresses
  ADD CONSTRAINT addresses_latitude_range_chk  CHECK ("latitude"  IS NULL OR "latitude"  BETWEEN -90  AND 90),
  ADD CONSTRAINT addresses_longitude_range_chk CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT addresses_coordinate_pair_chk CHECK (("latitude" IS NULL) = ("longitude" IS NULL));

ALTER TABLE order_addresses
  ADD CONSTRAINT order_addresses_latitude_range_chk  CHECK ("latitude"  IS NULL OR "latitude"  BETWEEN -90  AND 90),
  ADD CONSTRAINT order_addresses_longitude_range_chk CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT order_addresses_coordinate_pair_chk CHECK (("latitude" IS NULL) = ("longitude" IS NULL));


-- -----------------------------------------------------------------------------
-- 6. SUBSCRIPTIONS / BILLING
-- -----------------------------------------------------------------------------
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_amount_positive_chk CHECK ("amount" > 0),
  ADD CONSTRAINT subscriptions_date_order_chk      CHECK ("endDate" > "startDate");

ALTER TABLE subscription_periods
  ADD CONSTRAINT subscription_periods_amount_positive_chk CHECK ("amount" > 0),
  ADD CONSTRAINT subscription_periods_date_order_chk      CHECK ("endDate" > "startDate");

ALTER TABLE subscription_invoices
  ADD CONSTRAINT subscription_invoices_amount_positive_chk CHECK ("amount" > 0),
  -- PAID must have paidAt; PENDING/FAILED must not; REFUNDED may keep its original paidAt.
  ADD CONSTRAINT subscription_invoices_paid_at_status_chk  CHECK (
       ("paymentStatus" = 'PAID'     AND "paidAt" IS NOT NULL)
    OR  "paymentStatus" = 'REFUNDED'
    OR ("paymentStatus" IN ('PENDING', 'FAILED') AND "paidAt" IS NULL)
  );


-- -----------------------------------------------------------------------------
-- 7. DEFAULT ADDRESS: at most one default per customer
--    App must unset the old default BEFORE setting the new one (two statements,
--    one transaction); a single UPDATE flipping both rows can transiently conflict.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX addresses_one_default_per_customer_uidx
  ON addresses ("customerProfileId")
  WHERE "isDefault" = true;


-- -----------------------------------------------------------------------------
-- 8. GST INTEGRITY (presence only; GSTIN format validated in the application)
-- -----------------------------------------------------------------------------
ALTER TABLE store_business_details
  ADD CONSTRAINT store_business_details_gstin_presence_chk CHECK (
       ("gstStatus" = 'REGISTERED'     AND "gstin" IS NOT NULL)
    OR ("gstStatus" = 'NOT_REGISTERED' AND "gstin" IS NULL)
  );


-- -----------------------------------------------------------------------------
-- 9. CANCELLATION CONSISTENCY (orders)
-- -----------------------------------------------------------------------------
-- 9a. cancelledAt is set exactly when the order is CANCELLED.
ALTER TABLE orders
  ADD CONSTRAINT orders_cancelled_at_status_chk CHECK (
    ("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL)
  );

-- 9b. Non-cancelled orders carry no cancellation metadata.
ALTER TABLE orders
  ADD CONSTRAINT orders_no_cancel_metadata_unless_cancelled_chk CHECK (
    "status" = 'CANCELLED'
    OR ("cancellationReason" IS NULL AND "cancellationNote" IS NULL
        AND "cancelledByType" IS NULL AND "cancelledById" IS NULL)
  );

-- 9c. An actor id only makes sense together with an actor type.
ALTER TABLE orders
  ADD CONSTRAINT orders_cancelled_by_id_needs_type_chk CHECK (
    "cancelledById" IS NULL OR "cancelledByType" IS NOT NULL
  );

-- -----------------------------------------------------------------------------
-- Intentionally NOT included (application layer): sellingPrice <= MRP, role/profile
-- pairing, store/product status at checkout, stock deduction/restock atomicity,
-- email lowercase + E.164 phone, GSTIN format, overnight store hours, order status
-- transition rules, invoice/period date alignment, mandatory cancellation
-- reason/actor, paymentStatus/CANCELLED coupling, paidAt >= issuedAt.
-- FORCE ROW LEVEL SECURITY is deliberately not used.
-- -----------------------------------------------------------------------------
