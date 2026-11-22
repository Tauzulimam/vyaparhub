import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UnitType } from "../generated/prisma/client";

// Ensure environment variable is available without logging credentials
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Neither DIRECT_URL nor DATABASE_URL found in environment (.env.local)");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface CategorySeedData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  isActive: boolean;
}

interface ProductSeedData {
  categorySlug: string;
  name: string;
  brand?: string;
  unitValue: number;
  unitType: UnitType;
  mrp: number;
  imageUrl: string;
  description?: string;
  isActive: boolean;
}

/**
 * 1. Exactly 8 canonical categories
 */
const CANONICAL_CATEGORIES: CategorySeedData[] = [
  {
    name: "Daily Grocery & Staples",
    slug: "grocery-staples",
    description: "Flour, rice, pulses, cooking oils, spices and kitchen staples.",
    icon: "🌾",
    isActive: true,
  },
  {
    name: "Dairy & Fresh Sweets",
    slug: "dairy-sweets",
    description: "Farm-fresh milk, paneer, curd, butter, eggs and regional sweets.",
    icon: "🥛",
    isActive: true,
  },
  {
    name: "Bakery & Confectionery",
    slug: "bakery-confectionery",
    description: "Fresh artisan breads, cookies, cakes, toasts and savory puffs.",
    icon: "🥖",
    isActive: true,
  },
  {
    name: "Pharmacy & Wellness",
    slug: "pharmacy-wellness",
    description: "OTC medicines, first-aid, pain relief, vitamins and wellness.",
    icon: "💊",
    isActive: true,
  },
  {
    name: "General Store & Home Needs",
    slug: "general-store",
    description: "Cleaning supplies, personal care, batteries and household goods.",
    icon: "🧺",
    isActive: true,
  },
  {
    name: "Stationery & Books",
    slug: "stationery-books",
    description: "Notebooks, pens, art supplies, school & office essentials.",
    icon: "📚",
    isActive: true,
  },
  {
    name: "Electronics & Mobile",
    slug: "electronics-mobile",
    description: "Cables, chargers, earphones, adapters and tech accessories.",
    icon: "🔌",
    isActive: true,
  },
  {
    name: "Pet Supplies & Care",
    slug: "pet-supplies",
    description: "Dog food, cat treats, grooming, toys and pet health supplies.",
    icon: "🐾",
    isActive: true,
  },
];

/**
 * 2. Master product catalog: 32 demo products across all 8 categories (4 per category)
 */
const MASTER_PRODUCTS: ProductSeedData[] = [
  // --- Category 1: Daily Grocery & Staples (4 products) ---
  {
    categorySlug: "grocery-staples",
    name: "Aashirvaad Shudh Chakki Atta",
    brand: "Aashirvaad",
    unitValue: 5,
    unitType: UnitType.KG,
    mrp: 265.0,
    imageUrl: "/images/products/atta-grains.svg",
    description: "100% pure whole wheat flour processed with traditional stone chakki technique for soft rotis.",
    isActive: true,
  },
  {
    categorySlug: "grocery-staples",
    name: "Fortune Sunlite Refined Sunflower Oil",
    brand: "Fortune",
    unitValue: 1,
    unitType: UnitType.L,
    mrp: 155.0,
    imageUrl: "/images/products/cooking-oil-spices.svg",
    description: "Light, healthy cooking oil enriched with Vitamins A and D.",
    isActive: true,
  },
  {
    categorySlug: "grocery-staples",
    name: "Tata Salt Vacuum Evaporated Iodized",
    brand: "Tata Salt",
    unitValue: 1,
    unitType: UnitType.KG,
    mrp: 28.0,
    imageUrl: "/images/products/cooking-oil-spices.svg",
    description: "Desh ka namak - vacuum evaporated iodized salt essential for daily cooking.",
    isActive: true,
  },
  {
    categorySlug: "grocery-staples",
    name: "Daawat Rozana Gold Basmati Rice",
    brand: "Daawat",
    unitValue: 5,
    unitType: UnitType.KG,
    mrp: 440.0,
    imageUrl: "/images/products/atta-grains.svg",
    description: "Aromatic medium-grain basmati rice ideal for everyday pulao, khichdi, and steamed rice.",
    isActive: true,
  },

  // --- Category 2: Dairy & Fresh Sweets (4 products) ---
  {
    categorySlug: "dairy-sweets",
    name: "Amul Taaza Homogenised Toned Milk",
    brand: "Amul",
    unitValue: 500,
    unitType: UnitType.ML,
    mrp: 32.0,
    imageUrl: "/images/products/dairy-milk.svg",
    description: "Pasteurized homogenized toned milk with minimum 3.0% fat and 8.5% SNF.",
    isActive: true,
  },
  {
    categorySlug: "dairy-sweets",
    name: "Mother Dairy Fresh Malai Paneer",
    brand: "Mother Dairy",
    unitValue: 200,
    unitType: UnitType.G,
    mrp: 95.0,
    imageUrl: "/images/products/dairy-paneer-curd.svg",
    description: "Rich, soft and wholesome cottage cheese with smooth texture for curries and snacks.",
    isActive: true,
  },
  {
    categorySlug: "dairy-sweets",
    name: "Farm Fresh Protein Rich Brown Eggs",
    brand: "Farm Fresh",
    unitValue: 6,
    unitType: UnitType.PIECE,
    mrp: 65.0,
    imageUrl: "/images/products/farm-eggs.svg",
    description: "Farm-sourced protein-rich brown eggs with clean, graded shells.",
    isActive: true,
  },
  {
    categorySlug: "dairy-sweets",
    name: "Amul Masti Dahi Curd Pouch",
    brand: "Amul",
    unitValue: 400,
    unitType: UnitType.G,
    mrp: 35.0,
    imageUrl: "/images/products/dairy-paneer-curd.svg",
    description: "Thick, creamy, and mildly sour probiotic natural curd made from pasteurized milk.",
    isActive: true,
  },

  // --- Category 3: Bakery & Confectionery (4 products) ---
  {
    categorySlug: "bakery-confectionery",
    name: "Britannia 100% Whole Wheat Bread",
    brand: "Britannia",
    unitValue: 400,
    unitType: UnitType.G,
    mrp: 50.0,
    imageUrl: "/images/products/bakery-bread.svg",
    description: "Zero maida wholesome brown bread baked fresh daily with dietary fiber.",
    isActive: true,
  },
  {
    categorySlug: "bakery-confectionery",
    name: "Freshly Baked Garlic Herb Rusk Toast",
    brand: "City Bakery",
    unitValue: 250,
    unitType: UnitType.G,
    mrp: 85.0,
    imageUrl: "/images/products/bakery-bread.svg",
    description: "Twice-baked crunchy artisan rusk infused with roasted garlic and Mediterranean herbs.",
    isActive: true,
  },
  {
    categorySlug: "bakery-confectionery",
    name: "Cadbury Dairy Milk Silk Chocolate Bar",
    brand: "Cadbury",
    unitValue: 150,
    unitType: UnitType.G,
    mrp: 175.0,
    imageUrl: "/images/products/bakery-bread.svg",
    description: "Smooth, creamy, and indulgent milk chocolate that melts in your mouth.",
    isActive: true,
  },
  {
    categorySlug: "bakery-confectionery",
    name: "Parle-G Gold Glucose Biscuits",
    brand: "Parle",
    unitValue: 1,
    unitType: UnitType.PACK,
    mrp: 30.0,
    imageUrl: "/images/products/bakery-bread.svg",
    description: "Bigger, richer, and crunchier original glucose biscuits, India's favorite tea companion.",
    isActive: true,
  },

  // --- Category 4: Pharmacy & Wellness (4 products) ---
  {
    categorySlug: "pharmacy-wellness",
    name: "Dettol Antiseptic Liquid Disinfectant",
    brand: "Dettol",
    unitValue: 250,
    unitType: UnitType.ML,
    mrp: 120.0,
    imageUrl: "/images/products/pharmacy-care.svg",
    description: "Trusted antiseptic liquid protection against 100 illness-causing germs and infection.",
    isActive: true,
  },
  {
    categorySlug: "pharmacy-wellness",
    name: "Volini Joint & Muscle Pain Relief Gel",
    brand: "Volini",
    unitValue: 30,
    unitType: UnitType.G,
    mrp: 145.0,
    imageUrl: "/images/products/pharmacy-care.svg",
    description: "Fast-acting deep pain relief gel with micro-particles for sprains, backache, and joint aches.",
    isActive: true,
  },
  {
    categorySlug: "pharmacy-wellness",
    name: "Cipla ORS Electro-B Electrolyte Drink",
    brand: "Cipla",
    unitValue: 200,
    unitType: UnitType.ML,
    mrp: 35.0,
    imageUrl: "/images/products/pharmacy-care.svg",
    description: "Instant ready-to-drink WHO-standard oral rehydration salts electrolyte formula with apple flavor.",
    isActive: true,
  },
  {
    categorySlug: "pharmacy-wellness",
    name: "Dabur Chyawanprash 2X Immunity",
    brand: "Dabur",
    unitValue: 500,
    unitType: UnitType.G,
    mrp: 230.0,
    imageUrl: "/images/products/pharmacy-care.svg",
    description: "Ayurvedic formulation with over 40 herbs to support stamina, strength, and immune defense.",
    isActive: true,
  },

  // --- Category 5: General Store & Home Needs (4 products) ---
  {
    categorySlug: "general-store",
    name: "Surf Excel Easy Wash Detergent Powder",
    brand: "Surf Excel",
    unitValue: 1,
    unitType: UnitType.KG,
    mrp: 155.0,
    imageUrl: "/images/products/household-cleaning.svg",
    description: "Superfine washing powder designed to dissolve quickly and remove tough stubborn dirt stains.",
    isActive: true,
  },
  {
    categorySlug: "general-store",
    name: "Dettol Original Germ Protection Bathing Soap",
    brand: "Dettol",
    unitValue: 3,
    unitType: UnitType.PIECE,
    mrp: 145.0,
    imageUrl: "/images/products/household-cleaning.svg",
    description: "Value pack of 3 antibacterial bath soap bars with classic pine fragrance.",
    isActive: true,
  },
  {
    categorySlug: "general-store",
    name: "Vim Dishwash Gel Lemon",
    brand: "Vim",
    unitValue: 500,
    unitType: UnitType.ML,
    mrp: 115.0,
    imageUrl: "/images/products/household-cleaning.svg",
    description: "Concentrated grease-cutting dishwashing liquid infused with real lemon juice.",
    isActive: true,
  },
  {
    categorySlug: "general-store",
    name: "Duracell Chhota Power AAA Alkaline Batteries",
    brand: "Duracell",
    unitValue: 2,
    unitType: UnitType.PIECE,
    mrp: 70.0,
    imageUrl: "/images/products/household-cleaning.svg",
    description: "Reliable long-lasting alkaline batteries for TV remotes, toys, and household clocks.",
    isActive: true,
  },

  // --- Category 6: Stationery & Books (4 products) ---
  {
    categorySlug: "stationery-books",
    name: "Classmate Spiral Softcover Notebooks Pack",
    brand: "Classmate",
    unitValue: 3,
    unitType: UnitType.PIECE,
    mrp: 180.0,
    imageUrl: "/images/products/stationery-supplies.svg",
    description: "Pack of 3 single-line spiral bound long notebooks with chlorine-free smooth paper.",
    isActive: true,
  },
  {
    categorySlug: "stationery-books",
    name: "Hauser XO Super Smooth Ballpoint Pens",
    brand: "Hauser",
    unitValue: 5,
    unitType: UnitType.PIECE,
    mrp: 50.0,
    imageUrl: "/images/products/stationery-supplies.svg",
    description: "Set of 5 fluid-ink blue ball pens featuring matte non-slip ergonomic barrel grips.",
    isActive: true,
  },
  {
    categorySlug: "stationery-books",
    name: "Fevicol MR Squeezy General Purpose Glue",
    brand: "Fevicol",
    unitValue: 100,
    unitType: UnitType.G,
    mrp: 45.0,
    imageUrl: "/images/products/stationery-supplies.svg",
    description: "Non-staining synthetic white adhesive for paper, cardboard, thermocol, and school crafts.",
    isActive: true,
  },
  {
    categorySlug: "stationery-books",
    name: "Camlin Kokuyo 2B Mechanical Pencil Set",
    brand: "Camlin",
    unitValue: 1,
    unitType: UnitType.PACK,
    mrp: 60.0,
    imageUrl: "/images/products/stationery-supplies.svg",
    description: "0.7mm high-precision drafting pencil with cushion grip and 10 polymer lead refills.",
    isActive: true,
  },

  // --- Category 7: Electronics & Mobile (4 products) ---
  {
    categorySlug: "electronics-mobile",
    name: "boAt Bassheads 100 In-Ear Wired Earphones",
    brand: "boAt",
    unitValue: 1,
    unitType: UnitType.PIECE,
    mrp: 999.0,
    imageUrl: "/images/products/electronics-accessories.svg",
    description: "10mm dynamic bass drivers with in-line microphone and tangle-free hawk-inspired wire.",
    isActive: true,
  },
  {
    categorySlug: "electronics-mobile",
    name: "Portronics Konnect CL Type-C to Type-C Braided Cable",
    brand: "Portronics",
    unitValue: 1,
    unitType: UnitType.PIECE,
    mrp: 399.0,
    imageUrl: "/images/products/electronics-accessories.svg",
    description: "65W Power Delivery fast-charging 1.2m nylon braided sync and charging cable.",
    isActive: true,
  },
  {
    categorySlug: "electronics-mobile",
    name: "Mi 20W Fast Charger Adapter USB-A",
    brand: "Xiaomi",
    unitValue: 1,
    unitType: UnitType.PIECE,
    mrp: 599.0,
    imageUrl: "/images/products/electronics-accessories.svg",
    description: "Compact QC 3.0 compatible wall charging brick with surge protection for smartphones.",
    isActive: true,
  },
  {
    categorySlug: "electronics-mobile",
    name: "SanDisk Ultra Dual Drive Go Type-C USB 64GB",
    brand: "SanDisk",
    unitValue: 1,
    unitType: UnitType.PIECE,
    mrp: 799.0,
    imageUrl: "/images/products/electronics-accessories.svg",
    description: "High-speed 2-in-1 flash drive with reversible USB Type-C and traditional Type-A connectors.",
    isActive: true,
  },

  // --- Category 8: Pet Supplies & Care (4 products) ---
  {
    categorySlug: "pet-supplies",
    name: "Pedigree Adult Chicken & Vegetables Dry Dog Food",
    brand: "Pedigree",
    unitValue: 1.2,
    unitType: UnitType.KG,
    mrp: 375.0,
    imageUrl: "/images/products/pet-nutrition.svg",
    description: "Complete balanced canine nutrition with zinc, omega-6 fatty acids, and essential proteins.",
    isActive: true,
  },
  {
    categorySlug: "pet-supplies",
    name: "Whiskas Adult Wet Cat Food Gravy Pouches Pack",
    brand: "Whiskas",
    unitValue: 4,
    unitType: UnitType.PACK,
    mrp: 190.0,
    imageUrl: "/images/products/pet-nutrition.svg",
    description: "Pack of 4 (85g each) succulent salmon and tuna chunks in gravy for adult cats.",
    isActive: true,
  },
  {
    categorySlug: "pet-supplies",
    name: "Drools 100% Vegetarian Calcium Bone Dog Treats",
    brand: "Drools",
    unitValue: 1,
    unitType: UnitType.PACK,
    mrp: 180.0,
    imageUrl: "/images/products/pet-nutrition.svg",
    description: "Nutritious chew sticks enriched with calcium and phosphorus for strong teeth and gums.",
    isActive: true,
  },
  {
    categorySlug: "pet-supplies",
    name: "Himalaya Erina-EP Anti-Tick Pet Shampoo",
    brand: "Himalaya",
    unitValue: 200,
    unitType: UnitType.ML,
    mrp: 210.0,
    imageUrl: "/images/products/pet-nutrition.svg",
    description: "Ayurvedic ectoparasiticidal herbal shampoo to prevent fleas, ticks, and skin irritation.",
    isActive: true,
  },
];

/**
 * Main idempotent seed function
 */
export async function seed() {
  console.log("Starting VyaparHub foundation database seed...");

  // 1. Seed Categories using upsert on unique `slug`
  const categoryMap = new Map<string, string>();

  for (const cat of CANONICAL_CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        isActive: cat.isActive,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        isActive: cat.isActive,
      },
    });
    categoryMap.set(cat.slug, record.id);
  }
  console.log(`✓ Upserted ${CANONICAL_CATEGORIES.length} canonical categories`);

  // 2. Seed Master Products using find-first by (categoryId, name) idempotency strategy
  let createdCount = 0;
  let updatedCount = 0;

  for (const prod of MASTER_PRODUCTS) {
    const categoryId = categoryMap.get(prod.categorySlug);
    if (!categoryId) {
      throw new Error(`Category id not found for slug: ${prod.categorySlug}`);
    }

    const existing = await prisma.masterProduct.findFirst({
      where: {
        categoryId,
        name: prod.name,
      },
    });

    if (existing) {
      await prisma.masterProduct.update({
        where: { id: existing.id },
        data: {
          brand: prod.brand,
          unitValue: prod.unitValue,
          unitType: prod.unitType,
          mrp: prod.mrp,
          imageUrl: prod.imageUrl,
          description: prod.description,
          isActive: prod.isActive,
        },
      });
      updatedCount++;
    } else {
      await prisma.masterProduct.create({
        data: {
          categoryId,
          name: prod.name,
          brand: prod.brand,
          unitValue: prod.unitValue,
          unitType: prod.unitType,
          mrp: prod.mrp,
          imageUrl: prod.imageUrl,
          description: prod.description,
          isActive: prod.isActive,
        },
      });
      createdCount++;
    }
  }

  console.log(`✓ Processed ${MASTER_PRODUCTS.length} master products (Created: ${createdCount}, Updated: ${updatedCount})`);
  console.log("Foundation database seed completed successfully.");
}

// Self-invoking execution when run directly via CLI runner
if (process.argv[1]?.includes("seed")) {
  seed()
    .catch((err) => {
      console.error("Seed execution failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
