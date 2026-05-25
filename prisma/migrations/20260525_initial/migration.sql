-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ElectionType" AS ENUM ('general', 'primary', 'special', 'runoff');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('draft', 'open', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending_review', 'approved', 'denied', 'changes_requested', 'superseded');

-- CreateEnum
CREATE TYPE "LanguageCode" AS ENUM ('en', 'es', 'pl', 'zh', 'ar', 'hi', 'ur', 'ko', 'vi', 'tl');

-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('submission_approved', 'submission_denied', 'changes_requested', 'note_added', 'profile_picture_updated', 'submission_resubmitted', 'system_config_updated', 'election_window_changed', 'candidate_account_suspended', 'candidate_account_reactivated', 'placeholder_updated');

-- CreateTable
CREATE TABLE "elections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cycle_year" INTEGER NOT NULL,
    "election_type" "ElectionType" NOT NULL DEFAULT 'general',
    "label" VARCHAR(200) NOT NULL,
    "active_window_start" TIMESTAMPTZ NOT NULL,
    "active_window_end" TIMESTAMPTZ NOT NULL,
    "status" "ElectionStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" VARCHAR(300) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_retention" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "mfa_secret" VARCHAR(64),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" VARCHAR(20) DEFAULT 'totp',
    "phone" VARCHAR(20),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "candidate_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "official_first_name" VARCHAR(100) NOT NULL,
    "official_last_name" VARCHAR(100) NOT NULL,
    "campaign_name" VARCHAR(300),
    "party" VARCHAR(100),
    "party_other" VARCHAR(100),
    "education" TEXT,
    "current_employment" TEXT,
    "age" INTEGER,
    "campaign_address" TEXT,
    "campaign_zip_code" VARCHAR(10),
    "campaign_phone_number" VARCHAR(20),
    "campaign_fax_number" VARCHAR(20),
    "campaign_website" VARCHAR(500),
    "general_information" TEXT,
    "profile_picture_url" VARCHAR(1000),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "election_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "language_code" "LanguageCode" NOT NULL DEFAULT 'en',
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending_review',
    "submission_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "reviewer_notes" TEXT,
    "contact_address" TEXT,
    "contact_zip_code" VARCHAR(10),
    "contact_phone" VARCHAR(20),
    "contact_fax" VARCHAR(20),
    "contact_email" VARCHAR(255),
    "contact_website" VARCHAR(500),
    "profile_picture_url" VARCHAR(1000),
    "candidate_statement" TEXT,
    "biographical_info" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID,
    "admin_id" UUID NOT NULL,
    "action" "AdminAction" NOT NULL,
    "previous_status" "SubmissionStatus",
    "new_status" "SubmissionStatus",
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "election_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "pdf_url" VARCHAR(1000) NOT NULL,
    "language_code" "LanguageCode" NOT NULL DEFAULT 'en',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "policy_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "description" TEXT,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "mfa_secret" VARCHAR(64),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" VARCHAR(20) DEFAULT 'totp',
    "role_id" UUID NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "elections_status_idx" ON "elections"("status");

-- CreateIndex
CREATE INDEX "elections_active_window_start_active_window_end_idx" ON "elections"("active_window_start", "active_window_end");

-- CreateIndex
CREATE UNIQUE INDEX "elections_cycle_year_election_type_key" ON "elections"("cycle_year", "election_type");

-- CreateIndex
CREATE UNIQUE INDEX "offices_label_key" ON "offices"("label");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_accounts_email_key" ON "candidate_accounts"("email");

-- CreateIndex
CREATE INDEX "candidate_accounts_email_idx" ON "candidate_accounts"("email");

-- CreateIndex
CREATE INDEX "candidate_accounts_is_suspended_idx" ON "candidate_accounts"("is_suspended");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_account_id_key" ON "candidates"("account_id");

-- CreateIndex
CREATE INDEX "submissions_candidate_id_idx" ON "submissions"("candidate_id");

-- CreateIndex
CREATE INDEX "submissions_election_id_idx" ON "submissions"("election_id");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "submissions_language_code_idx" ON "submissions"("language_code");

-- CreateIndex
CREATE INDEX "submissions_election_id_candidate_id_idx" ON "submissions"("election_id", "candidate_id");

-- CreateIndex
CREATE INDEX "submissions_election_id_office_id_idx" ON "submissions"("election_id", "office_id");

-- CreateIndex
CREATE INDEX "admin_logs_submission_id_idx" ON "admin_logs"("submission_id");

-- CreateIndex
CREATE INDEX "admin_logs_admin_id_idx" ON "admin_logs"("admin_id");

-- CreateIndex
CREATE INDEX "admin_logs_created_at_idx" ON "admin_logs"("created_at");

-- CreateIndex
CREATE INDEX "admin_logs_action_idx" ON "admin_logs"("action");

-- CreateIndex
CREATE INDEX "policy_questions_election_id_idx" ON "policy_questions"("election_id");

-- CreateIndex
CREATE INDEX "policy_questions_election_id_language_code_idx" ON "policy_questions"("election_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_name_key" ON "admin_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_accounts_email_key" ON "admin_accounts"("email");

-- CreateIndex
CREATE INDEX "admin_accounts_email_idx" ON "admin_accounts"("email");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "candidate_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "candidate_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "candidate_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_questions" ADD CONSTRAINT "policy_questions_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_accounts" ADD CONSTRAINT "admin_accounts_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
