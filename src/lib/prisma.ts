import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  console.log("DEBUG: DATABASE_URL=", process.env.DATABASE_URL);
  const conn = 'postgres://6d7163bc8b191fb2f82916879a62e2747d38e6bc319c7e9f82ac98bdfc220d96:sk_9TxZgYJ5CsF%2D2NKfG6WcT@pooled.db.prisma.io:5432/postgres?sslmode=require';
  const connectionString = process.env.DATABASE_URL || conn;
  console.log("DEBUG: Using connectionString=", connectionString);
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
