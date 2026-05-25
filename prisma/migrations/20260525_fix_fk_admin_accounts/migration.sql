-- Fix foreign key constraints: `reviewed_by` in submissions and `admin_id` in admin_logs
-- were pointing to `candidate_accounts` but should point to `admin_accounts`.
-- Admin ID values in the JWT session come from `admin_accounts.id`, not `candidate_accounts.id`.

-- Drop existing wrong FK
ALTER TABLE "submissions"
  DROP CONSTRAINT "submissions_reviewed_by_fkey";

ALTER TABLE "admin_logs"
  DROP CONSTRAINT "admin_logs_admin_id_fkey";

-- Re-add with correct target table
ALTER TABLE "submissions"
  ADD CONSTRAINT "submissions_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "admin_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "admin_logs"
  ADD CONSTRAINT "admin_logs_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "admin_accounts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;