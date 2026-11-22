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
