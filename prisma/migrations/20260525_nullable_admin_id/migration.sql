-- AlterTable: make admin_id nullable in admin_logs
ALTER TABLE "admin_logs" ALTER COLUMN "admin_id" DROP NOT NULL;
