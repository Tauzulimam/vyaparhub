import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma CLI does not load Next.js env files automatically.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Direct connection is used by the CLI (migrations, introspection).
    url: env("DIRECT_URL"),
  },
});
