# VyaparHub — Project Requirements & Development Guide

## 1. Project Overview

**Project Name:** VyaparHub  
**Project Type:** Final Year Engineering Project  
**Platform:** Responsive Web Application  
**Deployment Target:** Vercel

### Primary Goal

VyaparHub is a hyperlocal multi-vendor marketplace designed to connect customers with nearby local stores.

The platform allows:

- Customers to discover nearby stores, browse products, place orders, make payments, and track orders.
- Vendors to create stores, select products from a predefined master catalog, set prices and quantities, manage inventory, and process customer orders.
- Administrators to manage vendors, stores, customers, product catalogs, categories, orders, and subscriptions.

The initial objective is to build a reliable Final Year Project, not a production-scale commercial marketplace.

---

# 2. Core System

VyaparHub has three primary user roles:

1. Customer
2. Vendor
3. Admin

All three roles operate through the same Next.js web application but have different interfaces and permissions.

High-level architecture:

```text
                         VYAPARHUB
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
          CUSTOMER         VENDOR          ADMIN
              |              |              |
              +--------------+--------------+
                             |
                             v
                    NEXT.JS APPLICATION
                  UI + API + BUSINESS LOGIC
                             |
                             v
                     SERVICE LAYER
                             |
          +------------------+------------------+
          |                  |                  |
          v                  v                  v
      Supabase            Prisma          External APIs
   Auth/PostgreSQL         ORM           Maps / Payments
```

---

# 3. Technology Stack

The following technology stack should be used unless explicitly changed by the project owner.

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend

Use Next.js server-side functionality.

Use:

- Next.js Route Handlers / API routes
- Server-side TypeScript
- Server-side business logic

Do NOT introduce a separate backend framework such as:

- Express
- NestJS
- Spring Boot
- Django
- Flask

unless explicitly requested.

## Database

- PostgreSQL
- Supabase

## ORM

- Prisma

## Authentication

- Supabase Auth

## Product Image/File Storage

- Supabase Storage

## Maps and Location

- Leaflet
- OpenStreetMap

## Payment Gateway

- Razorpay

Razorpay should only be implemented after Cash on Delivery and the complete order workflow are working.

## Deployment

- Vercel

## Version Control

- Git
- GitHub

---

# 4. Development Philosophy

This is the developer's first complete full-stack web project.

Therefore:

- Keep the architecture simple.
- Prefer readable code over clever code.
- Avoid unnecessary abstraction.
- Avoid premature optimization.
- Avoid unnecessary dependencies.
- Avoid enterprise-level architecture unless necessary.
- Keep components reasonably small.
- Reuse components where appropriate.
- Use meaningful names.
- Maintain clear separation between UI, business logic, and database operations.
- Explain important architectural decisions.
- Build incrementally.
- Complete and test one phase before moving to the next.

Most importantly:

**Do NOT attempt to generate the entire application at once.**

Only work on the development phase explicitly requested by the developer.

---

# 5. User Roles

The system contains exactly three primary roles:

```text
CUSTOMER
VENDOR
ADMIN
```

Role-based authorization must eventually prevent users from accessing functionality belonging to other roles.

---

# 6. Customer Features

Customers should eventually be able to:

- Register
- Login
- Logout
- Manage profile
- Set/select location
- Browse nearby stores
- Browse categories
- Search products
- View stores
- View products available at a store
- View product information
- Add products to cart
- Increase product quantity
- Decrease product quantity
- Remove products from cart
- View cart total
- Checkout
- Enter/select delivery address
- Select payment method
- Use Cash on Delivery
- Pay online when Razorpay is implemented
- Place orders
- View previous orders
- View order details
- Track order status

---

# 7. Vendor Features

Vendors should eventually be able to:

- Register
- Login
- Logout
- Create a store
- Manage store information
- View vendor dashboard
- Search the master product catalog
- Browse catalog categories
- Select products from the master catalog
- Add selected products to their store
- Set selling price
- Set available quantity
- Update selling price
- Update stock
- Enable/disable product availability
- Remove products from their store
- View inventory
- Receive customer orders
- Accept orders
- Reject/cancel orders when permitted
- Update order status
- View subscription information

Vendor order workflow:

```text
PENDING
   |
   v
ACCEPTED
   |
   v
PREPARING
   |
   v
READY
   |
   v
OUT FOR DELIVERY
   |
   v
DELIVERED
```

---

# 8. Admin Features

Administrators should eventually be able to:

- Login
- Logout
- View admin dashboard
- View customers
- Manage vendors
- Approve/reject vendor stores
- Manage stores
- Manage categories
- Manage the master product catalog
- Add master products
- Edit master products
- Upload/manage master product images
- Disable master products
- View orders
- Manage subscriptions
- View basic reports and statistics

Admin accounts must NOT be available through normal public registration.

---

# 9. Master Product Catalog

This is one of the most important features of VyaparHub.

Vendors should NOT normally create product information from scratch or photograph every product themselves.

Instead, VyaparHub maintains a:

**MASTER PRODUCT CATALOG**

The administrator controls this catalog.

Example master product:

```text
Product:
Amul Taaza Milk

Brand:
Amul

Category:
Dairy

Unit:
500 ml

MRP:
₹32

Image:
Pre-existing product image
```

Vendor workflow:

```text
Vendor Dashboard
       |
       v
Master Product Catalog
       |
       v
Search Product
       |
       v
Select Product
       |
       v
Enter Selling Price
       |
       v
Enter Available Quantity
       |
       v
Add Product to Store
```

Example:

```text
MASTER PRODUCT

Amul Taaza Milk
500 ml
MRP ₹32
Product Image

        |
        v

VENDOR INPUT

Selling Price: ₹30
Quantity: 25

        |
        v

STORE PRODUCT
```

Common product information belongs to the master catalog.

Vendor-specific information belongs to the store-product relationship.

---

# 10. Master Product vs Store Product

This distinction must be preserved throughout the project.

## MasterProduct

Represents a universal product in VyaparHub.

Conceptually contains:

```text
id
name
brand
category
description
unit
mrp
image
active
```

Example:

```text
Amul Taaza Milk
Amul
Dairy
500 ml
₹32 MRP
Product Image
```

## StoreProduct

Represents a master product sold by a particular vendor/store.

Conceptually contains:

```text
id
storeId
masterProductId
sellingPrice
quantity
available
```

Example:

```text
Store:
ABC Kirana

Product:
Amul Taaza Milk

Selling Price:
₹30

Quantity:
25

Available:
true
```

Another store may sell the same MasterProduct at a different price.

Example:

```text
ABC Kirana
Amul Taaza Milk
₹30
25 available


Fresh Mart
Amul Taaza Milk
₹31
12 available
```

Do NOT duplicate the entire master product record for every vendor.

---

# 11. Customer Marketplace Logic

Customers browse products offered by stores.

They do not directly purchase raw MasterProducts.

Example customer display:

```text
Amul Taaza Milk
500 ml

ABC Kirana

₹30

Available
```

This information conceptually comes from:

```text
MasterProduct
      +
StoreProduct
      +
Store
```

---

# 12. Cart Rule

For the initial version:

**One cart can contain products from only one store.**

Valid:

```text
ABC Kirana

Milk
Bread
Eggs
```

Invalid:

```text
Milk  -> ABC Kirana
Bread -> Fresh Mart
Eggs  -> City Store
```

If a customer tries to add a product from another store while the cart already contains products, the application should eventually ask whether the customer wants to clear/switch the current cart.

This rule simplifies:

- Order creation
- Vendor processing
- Inventory
- Delivery
- Payments
- Order totals

Multi-store checkout is outside the initial scope.

---

# 13. Order Lifecycle

The initial order lifecycle is:

```text
PENDING
   |
   v
ACCEPTED
   |
   v
PREPARING
   |
   v
READY
   |
   v
OUT_FOR_DELIVERY
   |
   v
DELIVERED
```

Orders may also have:

```text
CANCELLED
```

Customers should be able to see their current order status.

Vendors must only be able to manage orders belonging to their own store.

---

# 14. Inventory Rules

Each StoreProduct has a stock quantity.

Example:

```text
Current Stock = 20

Customer purchases = 3

New Stock = 17
```

Products with:

```text
quantity <= 0
```

must be treated as:

```text
OUT OF STOCK
```

Customers must not be able to purchase more units than are available.

Inventory validation and deduction must eventually happen safely on the server/database side.

Do not trust the client to determine inventory availability.

---

# 15. Location System

VyaparHub is a hyperlocal marketplace.

Stores should eventually contain:

```text
latitude
longitude
```

Customers should be able to provide/select their location.

The application should calculate distance between customers and stores.

Example:

```text
Customer Location

      |
      +---- ABC Kirana      0.4 km
      |
      +---- Fresh Mart      0.8 km
      |
      +---- City Bakery     1.4 km
```

An initial delivery/service radius may be approximately:

```text
5 km
```

The value should be configurable instead of being unnecessarily hard-coded throughout the application.

Use:

- Leaflet
- OpenStreetMap

Do not require a paid map service for the initial FYP.

---

# 16. Checkout

Checkout should eventually contain:

```text
Delivery Address

Order Summary

Subtotal

Delivery Charge

Total

Payment Method
```

The first supported payment method should be:

```text
Cash on Delivery
```

Online payment should be added only after COD works correctly.

---

# 17. Online Payment

Razorpay may be integrated after the complete Cash on Delivery order workflow works.

Conceptual flow:

```text
Customer
   |
   v
Checkout
   |
   v
Select Online Payment
   |
   v
Create Payment Order Server-Side
   |
   v
Razorpay Checkout
   |
   v
Customer Pays
   |
   v
Verify Payment Server-Side
   |
   v
Confirm VyaparHub Order
```

Important:

The application must NOT trust the browser/client alone to determine whether payment succeeded.

Payment confirmation must be securely verified server-side before the payment/order is marked as successfully paid.

---

# 18. Vendor Subscription

Initial subscription plans:

```text
Monthly
₹100

Annual
₹1000
```

Conceptual subscription information:

```text
vendorId
plan
startDate
expiryDate
status
```

Possible statuses:

```text
ACTIVE
EXPIRED
CANCELLED
TRIAL
```

Full automatic recurring subscription billing is NOT required for the initial Final Year Project.

---

# 19. Planned Database Entities

The exact Prisma schema will be designed during the database phase.

Likely entities include:

```text
User

Store

Category

MasterProduct

StoreProduct

Address

Cart

CartItem

Order

OrderItem

Payment

Subscription
```

Potential later entities:

```text
Review

Notification
```

Do NOT prematurely create unnecessary tables.

---

# 20. High-Level Data Relationships

Marketplace:

```text
USER
 |
 +------------------+
 |                  |
CUSTOMER           VENDOR
                     |
                     v
                   STORE
                     |
                     v
                STORE_PRODUCT
                     |
                     v
               MASTER_PRODUCT
                     |
                     v
                  CATEGORY
```

Order system:

```text
CUSTOMER
    |
    v
  ORDER
    |
    v
ORDER_ITEM
    |
    v
STORE_PRODUCT
```

---

# 21. Planned Customer Routes

Initial customer routes:

```text
/

/login

/register

/stores

/stores/[id]

/products

/products/[id]

/cart

/checkout

/orders

/orders/[id]

/profile
```

Routes may evolve if there is a valid architectural reason.

---

# 22. Planned Vendor Routes

```text
/vendor

/vendor/store

/vendor/catalog

/vendor/products

/vendor/inventory

/vendor/orders

/vendor/orders/[id]

/vendor/subscription
```

---

# 23. Planned Admin Routes

```text
/admin

/admin/vendors

/admin/stores

/admin/customers

/admin/catalog

/admin/categories

/admin/orders

/admin/subscriptions
```

---

# 24. Suggested Project Structure

Use a clean Next.js App Router structure.

Conceptually:

```text
vyaparhub/

├── app/
│   ├── page.tsx
│   ├── login/
│   ├── register/
│   ├── stores/
│   ├── products/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── vendor/
│   └── admin/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── product/
│   ├── store/
│   ├── cart/
│   └── dashboard/
│
├── lib/
│
├── types/
│
├── utils/
│
├── data/
│
├── public/
│   └── images/
│
├── prisma/
│
├── PROJECT_REQUIREMENTS.md
├── README.md
└── package.json
```

The exact structure may be refined as implementation progresses.

Avoid excessive folder nesting and unnecessary abstraction.

---

# 25. UI Requirements

The application should look like a modern marketplace.

General design characteristics:

- Clean
- Modern
- Professional
- Simple navigation
- Mobile-friendly
- Fast-feeling interface
- Accessible forms
- Consistent spacing
- Consistent typography
- Consistent reusable components
- Clear visual hierarchy

Do NOT blindly copy the exact interface of Blinkit, Amazon, Flipkart, Swiggy, or another existing company.

VyaparHub should maintain its own visual identity.

---

# 26. Responsive Design

The website must support:

```text
Desktop
Tablet
Mobile
```

Mobile responsiveness is mandatory.

Customer shopping pages should be especially mobile-friendly.

---

# 27. Development Phases

The project MUST be developed incrementally.

Do NOT automatically implement later phases.

---

## Phase 1 — Project Foundation

Objective:

Create a clean and stable development foundation.

Build/configure:

- Next.js
- React
- TypeScript
- Tailwind CSS
- ESLint
- Project folder structure
- Git
- GitHub
- Requirements documentation
- Basic application shell

DO NOT add:

- Supabase
- Prisma
- Database
- Authentication
- Razorpay
- Maps

during this phase.

---

## Phase 2 — Static UI/UX Prototype

Objective:

Build the complete visual application using mock data.

NO real database should be used.

### Customer UI

Build:

- Navbar
- Homepage
- Location selector UI
- Search bar
- Categories
- Nearby stores
- Store listing
- Store page
- Product cards
- Product details
- Product search
- Cart
- Checkout
- Order list
- Order details
- Order tracking UI
- Login UI
- Registration UI
- Profile UI

### Vendor UI

Build:

- Vendor dashboard
- Store management UI
- Master catalog UI
- Catalog search
- Product selection
- Add-to-store form/modal
- Selling price input
- Quantity input
- Vendor product management
- Inventory
- Orders
- Order details
- Order status controls
- Subscription page

### Admin UI

Build:

- Admin dashboard
- Vendor management
- Store management
- Customer management
- Master product catalog
- Add master product form
- Edit master product form
- Categories
- Orders
- Subscriptions

Use MOCK DATA only.

Do NOT connect Supabase during Phase 2.

---

## Phase 3 — Database

Objective:

Introduce persistent application data.

Add:

- Supabase
- PostgreSQL
- Prisma

Design and implement the database schema.

Create only necessary entities.

Replace mock data gradually.

Do not replace every mock feature simultaneously.

---

## Phase 4 — Authentication & Authorization

Implement:

- Supabase Auth
- Customer registration/login
- Vendor registration/login
- Admin login
- Logout
- Session management
- Role-based access control
- Protected routes

Expected behavior:

```text
CUSTOMER
   |
   v
Customer Interface


VENDOR
   |
   v
/vendor


ADMIN
   |
   v
/admin
```

A customer must not be able to access vendor/admin functionality.

A vendor must not be able to access admin functionality.

---

## Phase 5 — Vendor & Store System

Implement real vendor/store functionality.

Workflow:

```text
Vendor Registers
        |
        v
Vendor Logs In
        |
        v
Creates Store
        |
        v
Store Pending Approval
        |
        v
Admin Reviews Store
        |
        v
Store Approved
        |
        v
Store Active
```

Vendor should be able to manage appropriate store information.

---

## Phase 6 — Master Product Catalog

Implement the real catalog system.

Workflow:

```text
ADMIN
   |
   v
Creates Master Product
   |
   v
Master Catalog
   |
   v
VENDOR
   |
   v
Searches Catalog
   |
   v
Selects Product
   |
   v
Enters Price + Quantity
   |
   v
StoreProduct Created
```

This is a major VyaparHub feature and should receive special attention.

---

## Phase 7 — Customer Marketplace

Replace customer mock marketplace data with real database data.

Customers should see real:

- Stores
- Categories
- Master product information
- Store-specific products
- Store-specific prices
- Stock availability

Customer product information should be built from:

```text
MasterProduct
      +
StoreProduct
      +
Store
```

---

## Phase 8 — Cart & Checkout

Implement:

- Add to cart
- Remove from cart
- Increase quantity
- Decrease quantity
- Stock checks
- One-store-per-cart rule
- Subtotal
- Delivery charge
- Total
- Delivery address
- Checkout

Cash on Delivery should be the initial payment option.

---

## Phase 9 — Orders & Inventory

Implement the complete order workflow.

```text
CUSTOMER

Places Order
     |
     v

PENDING
     |
     v

VENDOR

Accepts Order
     |
     v

ACCEPTED
     |
     v
PREPARING
     |
     v
READY
     |
     v
OUT FOR DELIVERY
     |
     v
DELIVERED
```

Inventory should be validated and updated correctly.

Example:

```text
Stock before order:
20

Customer orders:
3

Stock after successful order:
17
```

Prevent customers from ordering quantities greater than available stock.

---

## Phase 10 — Hyperlocal Location

Implement:

- Store coordinates
- Customer location
- Distance calculation
- Nearby-store filtering
- Service radius
- Leaflet
- OpenStreetMap

Example:

```text
Customer

   |
   +---- ABC Kirana      0.4 km
   |
   +---- Fresh Mart      0.8 km
   |
   +---- City Bakery     1.5 km
```

Nearby stores should eventually be ordered or filtered based on distance.

---

## Phase 11 — Payment & Subscription

### Step 1

Ensure Cash on Delivery works completely.

### Step 2

Add Razorpay.

Implement:

- Payment order creation
- Razorpay checkout
- Server-side payment verification
- Payment records
- Payment status

### Step 3

Implement vendor subscription functionality.

Initial plans:

```text
₹100/month

₹1000/year
```

Automatic recurring billing is not required for the initial FYP.

---

## Phase 12 — Testing & Deployment

Perform:

- Functional testing
- Authentication testing
- Authorization testing
- Vendor isolation testing
- Inventory testing
- Order testing
- Payment testing
- Error handling review
- Security review
- Responsive testing
- Mobile testing
- Production build testing
- GitHub finalization
- Vercel deployment

Test the deployed website from:

- Laptop
- Mobile phone
- Different browser
- Different network when possible

---

# 28. Features Outside Initial Scope

Do NOT implement the following unless explicitly requested:

- Native Android application
- Native iOS application
- Customer mobile application
- Vendor mobile application
- Delivery-partner mobile application
- AI recommendation engine
- AI chatbot
- Live GPS delivery tracking
- Advanced logistics optimization
- Microservices
- Kafka
- Kubernetes
- Complex Redis infrastructure
- Machine-learning models
- Automatic recurring subscription billing
- Multi-store cart/order splitting

These may be listed as future scope.

---

# 29. Security Requirements

When backend functionality is introduced:

- Never expose secret keys in client-side code.
- Store secrets in environment variables.
- Never commit secrets.
- Do not commit `.env` files containing secrets.
- Validate server-side input.
- Enforce authorization server-side.
- Do not rely only on hidden UI elements for security.
- Vendors must only modify their own stores.
- Vendors must only modify their own StoreProducts.
- Vendors must only process orders belonging to their stores.
- Customers must only access appropriate private customer information.
- Admin operations must require admin authorization.
- Verify online payments server-side.
- Validate stock server-side