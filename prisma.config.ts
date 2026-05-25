// ──────────────────────────────────────────────
// VGuide — Prisma Configuration
// ──────────────────────────────────────────────
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  outputFile: "./node_modules/.prisma/client",
});