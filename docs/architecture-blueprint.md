# Illinois State Board of Elections Voters' Guide — Architecture Blueprint

> **Repository:** `github.com/mgianasi/VGuide`
> **Target:** Full-stack, mobile-responsive, WCAG 2.1/2.2 AA compliant Next.js application
> **Hosting:** Vercel
> **Target Cycle:** 2026 General Election (+ future cycles)
> **Reference Portal:** https://votersguide.elections.il.gov/Default

---

# DELIVERABLE 1: DATABASE & DATA MODEL ARCHITECTURE

## 1.1 Entity-Relationship Overview

```
┌──────────────┐       ┌──────────────────┐       ┌───────────────────┐
│   elections   │──1:N──│   submissions     │──N:1──│   candidates      │
│               │       │                   │       │                   │
│               │       │                   │       │                   │
└──────────────┘       └────────┬──────────┘       └───────────────────┘
                                │ 1:N                                   ▲
                                │                                        │
                                ▼                                        │
                     ┌──────────────────┐       ┌───────────────────┐    │
                     │  admin_logs      │       │  candidate_accounts│───┘
                     │  (audit trail)   │       │  (auth+profile)   │
                     └──────────────────┘       └───────────────────┘

┌──────────────────────┐  ┌──────────────────────────┐
│   system_config      │  │   policy_questions        │
│   (global settings,  │  │   (decoupled PDF assets)  │
│    windows, placehold)│  │                          │
└──────────────────────┘  └──────────────────────────┘
```

## 1.2 Complete SQL Schema (PostgreSQL)

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";      -- case-insensitive text

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE election_type AS ENUM (
    'general', 'primary', 'special', 'runoff'
);

CREATE TYPE election_status AS ENUM (
    'draft', 'open', 'closed', 'archived'
);

CREATE TYPE submission_status AS ENUM (
    'pending_review',
    'approved',
    'denied',
    'changes_requested',
    'superseded'
);

CREATE TYPE language_code AS ENUM (
    'en',   -- English (default)
    'es',   -- Spanish
    'pl',   -- Polish
    'zh',   -- Chinese (Simplified)
    'ar',   -- Arabic
    'hi',   -- Hindi
    'ur',   -- Urdu
    'ko',   -- Korean
    'vi',   -- Vietnamese
    'tl'    -- Tagalog
);

CREATE TYPE admin_action AS ENUM (
    'submission_approved',
    'submission_denied',
    'changes_requested',
    'note_added',
    'profile_picture_updated',
    'submission_resubmitted',
    'system_config_updated',
    'election_window_changed',
    'candidate_account_suspended',
    'candidate_account_reactivated',
    'placeholder_updated'
);

-- ============================================================
-- TABLE 1: elections
-- ============================================================
CREATE TABLE elections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_year      INTEGER NOT NULL CHECK (cycle_year >= 2026),
    election_type   election_type NOT NULL DEFAULT 'general',
    label           VARCHAR(200) NOT NULL,  -- e.g. "2026 General Election"
    active_window_start TIMESTAMPTZ NOT NULL,
    active_window_end   TIMESTAMPTZ NOT NULL,
    status          election_status NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_window CHECK (active_window_start < active_window_end),
    CONSTRAINT unique_cycle_type UNIQUE (cycle_year, election_type)
);

CREATE INDEX idx_elections_status ON elections (status);
CREATE INDEX idx_elections_window ON elections (active_window_start, active_window_end);

-- ============================================================
-- TABLE 2: offices (normalized lookup for offices/districts)
-- ============================================================
CREATE TABLE offices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label           VARCHAR(300) NOT NULL,           -- e.g. "U.S. Senator"
    category        VARCHAR(100) NOT NULL,            -- e.g. "federal", "statewide", "judicial"
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_retention    BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE for retention elections
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_offices_label ON offices (label);

-- ============================================================
-- TABLE 3: candidate_accounts (auth + profile)
-- ============================================================
CREATE TABLE candidate_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    mfa_secret      VARCHAR(64),                      -- TOTP seed (encrypted at rest)
    mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_method      VARCHAR(20) DEFAULT 'totp',       -- 'totp' | 'sms' (future)
    phone           VARCHAR(20),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    captcha_token   VARCHAR(500),                     -- one-time verification record
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended    BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidate_accounts_email ON candidate_accounts (email);
CREATE INDEX idx_candidate_accounts_status ON candidate_accounts (is_suspended);

-- ============================================================
-- TABLE 4: candidates (profile info, 1:1 with accounts)
-- ============================================================
CREATE TABLE candidates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES candidate_accounts(id) ON DELETE CASCADE,
    official_first_name  VARCHAR(100) NOT NULL,
    official_last_name   VARCHAR(100) NOT NULL,
    campaign_name   VARCHAR(300),
    party           VARCHAR(100),
    party_other     VARCHAR(100),                     -- write-in party text
    education       TEXT,
    current_employment   TEXT,
    age             INTEGER,
    campaign_address     TEXT,
    campaign_zip_code    VARCHAR(10),
    campaign_phone_number VARCHAR(20),
    campaign_fax_number  VARCHAR(20),
    campaign_website     VARCHAR(500),
    general_information  TEXT,
    profile_picture_url  VARCHAR(1000),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_account UNIQUE (account_id)
);

-- ============================================================
-- TABLE 5: submissions (core business entity)
-- ============================================================
CREATE TABLE submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id     UUID NOT NULL REFERENCES elections(id) ON DELETE RESTRICT,
    candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    office_id       UUID NOT NULL REFERENCES offices(id) ON DELETE RESTRICT,
    language_code   language_code NOT NULL DEFAULT 'en',
    status          submission_status NOT NULL DEFAULT 'pending_review',
    submission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by     UUID REFERENCES candidate_accounts(id),   -- admin who last acted
    reviewed_at     TIMESTAMPTZ,
    reviewer_notes  TEXT,

    -- Contact matrix (per-submission override)
    contact_address      TEXT,
    contact_zip_code     VARCHAR(10),
    contact_phone        VARCHAR(20),
    contact_fax          VARCHAR(20),
    contact_email        VARCHAR(255),
    contact_website      VARCHAR(500),
    profile_picture_url  VARCHAR(1000),

    -- Candidate-provided content per language
    candidate_statement  TEXT,                        -- candidate's written statement in this language
    biographical_info    TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_election FOREIGN KEY (election_id) REFERENCES elections(id),
    CONSTRAINT fk_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id),
    CONSTRAINT fk_office FOREIGN KEY (office_id) REFERENCES offices(id)
);

CREATE INDEX idx_submissions_candidate ON submissions (candidate_id);
CREATE INDEX idx_submissions_election ON submissions (election_id);
CREATE INDEX idx_submissions_status ON submissions (status);
CREATE INDEX idx_submissions_language ON submissions (language_code);
CREATE INDEX idx_submissions_election_candidate ON submissions (election_id, candidate_id);
CREATE INDEX idx_submissions_election_office ON submissions (election_id, office_id);

-- ============================================================
-- TABLE 6: admin_logs (immutable audit trail)
-- ============================================================
CREATE TABLE admin_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID REFERENCES submissions(id) ON DELETE SET NULL,
    admin_id        UUID NOT NULL REFERENCES candidate_accounts(id),  -- admin account
    action          admin_action NOT NULL,
    previous_status submission_status,                -- snapshot before action
    new_status      submission_status,                -- snapshot after action
    notes           TEXT,
    metadata        JSONB DEFAULT '{}',               -- extensible event payload
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_submission ON admin_logs (submission_id);
CREATE INDEX idx_admin_logs_admin ON admin_logs (admin_id);
CREATE INDEX idx_admin_logs_created ON admin_logs (created_at DESC);
CREATE INDEX idx_admin_logs_action ON admin_logs (action);

-- ============================================================
-- TABLE 7: policy_questions (decoupled from candidate data)
-- ============================================================
CREATE TABLE policy_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id     UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    pdf_url         VARCHAR(1000) NOT NULL,           -- hosted PDF asset
    language_code   language_code NOT NULL DEFAULT 'en',
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_questions_election ON policy_questions (election_id);
CREATE INDEX idx_policy_questions_lang ON policy_questions (election_id, language_code);

-- ============================================================
-- TABLE 8: system_config (key-value for global settings)
-- ============================================================
CREATE TABLE system_config (
    key             VARCHAR(100) PRIMARY KEY,
    value           JSONB NOT NULL DEFAULT '{}',
    description     TEXT,
    updated_by      UUID REFERENCES candidate_accounts(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default configuration
INSERT INTO system_config (key, value, description) VALUES
    ('system_availability_message', '{"en": "The Voters'' Guide is currently closed for this election cycle. Please check back during the open submission window.", "es": "..."}', 'Customizable placeholder shown when system is closed'),
    ('system_availability_override_enabled', 'false', 'When true, overrides date-based window with custom message'),
    ('recaptcha_site_key', '""', 'CAPTCHA site key for candidate registration'),
    ('recaptcha_secret_key', '""', 'CAPTCHA secret key for server verification'),
    ('mfa_issuer_name', '"IL Voters Guide"', 'Display name for TOTP authenticator app'),
    ('max_concurrent_languages', '2', 'Maximum simultaneous approved submissions per candidate'),
    ('submission_window_buffer_days', '7', 'Days before election close to auto-lock submissions'),
    ('contact_email', '"elections@ilsos.gov"', 'Primary contact email'),
    ('contact_phone_springfield', '"217-782-4141"', 'Springfield office main line'),
    ('contact_phone_chicago', '"312-814-6440"', 'Chicago office main line'),
    ('contact_address_springfield', '"2329 S. MacArthur Blvd, Springfield, IL 62704"', 'Springfield office'),
    ('contact_address_chicago', '"100 W. Randolph St., Suite 14-100, Chicago, IL 60601"', 'Chicago office'),
    ('faq_content', '{"en": "[]"}', 'FAQ JSON: array of {q, a} objects per language');

-- ============================================================
-- TABLE 9: admin_roles (permissions tree)
-- ============================================================
CREATE TABLE admin_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) UNIQUE NOT NULL,      -- e.g. 'super_admin', 'reviewer', 'viewer'
    permissions     JSONB NOT NULL DEFAULT '[]',      -- e.g. ["submissions:approve", "system:config", "candidates:view"]
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed roles
INSERT INTO admin_roles (name, permissions) VALUES
    ('super_admin', '["submissions:approve", "submissions:deny", "submissions:request_changes", "submissions:view_all", "candidates:manage", "candidates:suspend", "system:config", "system:elections", "logs:view", "admin:manage"]'),
    ('reviewer',    '["submissions:approve", "submissions:deny", "submissions:request_changes", "submissions:view_all", "candidates:view", "logs:view"]'),
    ('viewer',      '["submissions:view_all", "candidates:view"]');

-- ============================================================
-- TABLE 10: admin_accounts (staff-level auth, separate from candidates)
-- ============================================================
CREATE TABLE admin_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    mfa_secret      VARCHAR(64),
    mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_method      VARCHAR(20) DEFAULT 'totp',
    role_id         UUID NOT NULL REFERENCES admin_roles(id),
    display_name    VARCHAR(200) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_admin_accounts_email ON admin_accounts (email);

-- ============================================================
-- CONSTRAINT: Dual-language concurrency rule (business logic)
-- ============================================================
-- A candidate may have at most 2 "approved" submissions simultaneously,
-- and those 2 must be in different language codes. This is enforced by
-- a BEFORE INSERT/UPDATE trigger and application-level check.
--
-- See Section 5.1 for full trigger definition.

-- ============================================================
-- CONSTRAINT: Same-language supersede rule (business logic)
-- ============================================================
-- When a new submission is approved for a candidate+office+election+language
-- that already has an approved submission, the previous one auto-transitions
-- to "superseded". See Section 5.2 for full trigger definition.

-- ============================================================
-- VERSIONING & MIGRATIONS
-- ============================================================
CREATE TABLE schema_migrations (
    version         INTEGER PRIMARY KEY,
    name            VARCHAR(300) NOT NULL,
    applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum        VARCHAR(64)
);
```

## 1.3 Finite State Machine: Submission Lifecycle

```
                    ┌────────────────────────┐
                    │     PENDING REVIEW     │
                    │  (initial state upon   │
                    │   candidate submission) │
                    └───────────┬────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                   │
              ▼                 ▼                   ▼
    ┌────────────────┐ ┌──────────────┐ ┌───────────────────┐
    │   APPROVED     │ │   DENIED     │ │ CHANGES REQUESTED │
    │  (published)   │ │ (rejected    │ │ (revision needed) │
    │                │ │  w/ reason)  │ └────────┬──────────┘
    └───────┬────────┘ └──────────────┘          │
            │                                     │
            │  (candidate resubmits                │
            │   same office+election+lang)         │ (candidate edits
            │                                     │  & resubmits)
            ▼                                     │
    ┌────────────────┐                             │
    │  SUPERSEDED    │◄────────────────────────────┘
    │ (archived;     │
    │  replaced by   │
    │  newer version)│
    └────────────────┘
```

### State Transition Table

| Current State        | Trigger/Event                        | Valid Next State | Notes |
|----------------------|--------------------------------------|------------------|-------|
| `pending_review`     | Admin clicks "Approve"               | `approved`       | Admin must provide optional notes |
| `pending_review`     | Admin clicks "Deny"                  | `denied`         | Reason required |
| `pending_review`     | Admin clicks "Request Changes"       | `changes_requested` | Required notes explaining what to fix |
| `approved`           | Candidate resubmits (same lang)     | `superseded` (old) / `pending_review` (new) | Old auto-superseded; new enters review |
| `changes_requested`  | Candidate edits & resubmits          | `pending_review` | Re-enters queue |
| `changes_requested`  | Admin evaluates                      | `approved` / `denied` | Bypasses pending; admin can act directly |
| `denied`             | (no transition)                      | terminal state   | Candidate can start fresh submission |
| `superseded`         | (no transition)                      | terminal state   | Immutable record only |

## 1.4 Trigger Functions (Business Logic Enforcement)

### 5.1 Dual-Language Concurrency Trigger

```sql
CREATE OR REPLACE FUNCTION check_approved_language_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_approved INTEGER;
BEGIN
    IF NEW.status = 'approved' THEN
        SELECT COUNT(*) INTO current_approved
        FROM submissions
        WHERE candidate_id = NEW.candidate_id
          AND election_id = NEW.election_id
          AND status = 'approved'
          AND id != NEW.id;

        IF current_approved >= 2 THEN
            RAISE EXCEPTION 'Candidate already has 2 approved submissions in this election. A new approval requires superseding an existing one.';
        END IF;

        IF current_approved = 1 THEN
            IF EXISTS (
                SELECT 1 FROM submissions
                WHERE candidate_id = NEW.candidate_id
                  AND election_id = NEW.election_id
                  AND status = 'approved'
                  AND language_code = NEW.language_code
                  AND id != NEW.id
            ) THEN
                RAISE EXCEPTION 'Candidate already has an approved submission in language code % for this election. Use the same-language supersede workflow.', NEW.language_code;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_approved_language_limit
    BEFORE UPDATE OF status ON submissions
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved')
    EXECUTE FUNCTION check_approved_language_limit();
```

### 5.2 Same-Language Supersede Trigger

```sql
CREATE OR REPLACE FUNCTION auto_supersede_previous_same_language()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new submission is approved for a candidate+office+election+lang
    -- that already has an approved submission, supersede the old one
    IF NEW.status = 'approved' THEN
        UPDATE submissions
        SET status = 'superseded',
            updated_at = NOW()
        WHERE candidate_id = NEW.candidate_id
          AND election_id = NEW.election_id
          AND office_id = NEW.office_id
          AND language_code = NEW.language_code
          AND status = 'approved'
          AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_supersede_same_language
    AFTER UPDATE OF status ON submissions
    FOR EACH ROW
    WHEN (NEW.status = 'approved')
    EXECUTE FUNCTION auto_supersede_previous_same_language();
```

### 5.3 Admin Audit Log Trigger

```sql
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_id UUID;
    v_action admin_action;
BEGIN
    -- Must be called from application layer setting session variable
    v_admin_id := current_setting('app.current_admin_id', TRUE)::UUID;
    IF v_admin_id IS NULL THEN
        v_admin_id := NEW.reviewed_by;
    END IF;

    IF OLD.status = 'pending_review' AND NEW.status = 'approved' THEN
        v_action := 'submission_approved';
    ELSIF OLD.status = 'pending_review' AND NEW.status = 'denied' THEN
        v_action := 'submission_denied';
    ELSIF OLD.status = 'pending_review' AND NEW.status = 'changes_requested' THEN
        v_action := 'changes_requested';
    ELSE
        v_action := 'note_added';
    END IF;

    INSERT INTO admin_logs (
        submission_id, admin_id, action,
        previous_status, new_status, notes
    ) VALUES (
        NEW.id, COALESCE(v_admin_id, NEW.reviewed_by), v_action,
        OLD.status, NEW.status, NEW.reviewer_notes
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_admin_action
    AFTER UPDATE OF status ON submissions
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_admin_action();
```

### 5.4 Availability Gate Check Function

```sql
CREATE OR REPLACE FUNCTION check_system_availability()
RETURNS BOOLEAN AS $$
DECLARE
    override_enabled BOOLEAN;
    current_window_start TIMESTAMPTZ;
    current_window_end TIMESTAMPTZ;
BEGIN
    -- Check if override is active
    SELECT (value->>'override_enabled')::BOOLEAN INTO override_enabled
    FROM system_config WHERE key = 'system_availability_override';

    IF override_enabled THEN
        RETURN FALSE;  -- System is closed; show placeholder
    END IF;

    -- Check if there's an active election window
    SELECT active_window_start, active_window_end
    INTO current_window_start, current_window_end
    FROM elections
    WHERE status = 'open'
      AND active_window_start <= NOW()
      AND active_window_end >= NOW()
    ORDER BY active_window_start DESC
    LIMIT 1;

    IF current_window_start IS NOT NULL THEN
        RETURN TRUE;  -- System is open
    END IF;

    RETURN FALSE;  -- No active window
END;
$$ LANGUAGE plpgsql;
```

---

# DELIVERABLE 2: TECHNICAL ARCHITECTURE RECOMMENDATION

## 2.1 Recommended Stack

| Layer              | Technology Choice                | Rationale |
|--------------------|----------------------------------|-----------|
| **Framework**      | Next.js 14+ (App Router)         | Vercel-native, SSR/ISR, API routes, i18n |
| **Language**       | TypeScript 5+                    | Type safety across full stack |
| **Database**       | PostgreSQL (via Supabase)        | Vercel-compatible, row-level security, real-time |
| **ORM**            | Prisma 5+                        | Type-safe schema, migrations, Vercel Edge compatible |
| **Auth**           | NextAuth.js v5 (Auth.js)         | Built-in MFA support, adapter pattern |
| **MFA**            | TOTP (speakeasy) + Twilio Verify | TOTP fallback + SMS if phone provided |
| **CAPTCHA**        | Cloudflare Turnstile             | Privacy-first, no data collection, free tier |
| **File Storage**   | Vercel Blob Storage              | S3-compatible, single-platform, no extra egress costs |
| **CSS**            | Tailwind CSS 3.4                 | Utility-first, design token system, WCAG contrast |
| **WCAG Auditing**  | axe-core + @axe-core/react       | Automated accessibility testing in CI |
| **State Machine**  | XState 5 (optional)              | Formal FSM for submission lifecycle (or app-level) |
| **Testing**        | Vitest + Playwright              | Unit + E2E with accessibility assertions |
| **CI/CD**          | GitHub Actions + Vercel          | Preview deploys per branch, production on main |
| **Monitoring**     | Sentry                           | Error tracking, performance monitoring |

## 2.2 Authentication & Authorization Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PUBLIC ZONE                              │
│  ┌──────────┐   ┌──────────────┐   ┌───────────────────────┐    │
│  │ Browse   │   │ Search       │   │ View Policy PDFs      │    │
│  │ Voters   │   │ Candidates   │   │ (no auth required)    │    │
│  │ Guide    │   │ by office    │   │                       │    │
│  └──────────┘   └──────────────┘   └───────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    CANDIDATE ZONE (MFA Required)                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐   │
│  │ Registration │───▶│ Email Verify     │───▶│ MFA Setup    │   │
│  │ w/ CAPTCHA   │    │                  │    │ (TOTP/SMS)   │   │
│  └──────────────┘    └──────────────────┘    └──────┬───────┘   │
│                                                      │           │
│  ┌──────────────┐    ┌──────────────────┐           │           │
│  │ Dashboard    │◀───│ Login + MFA      │◀──────────┘           │
│  │ (submissions)│    │                  │                        │
│  └──────┬───────┘    └──────────────────┘                        │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐                                                │
│  │ New          │                                                │
│  │ Submission   │                                                │
│  │ Form         │                                                │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       ADMIN ZONE (Elevated MFA)                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Review Queue │───▶│ Approve/Deny │───▶│ Audit Log Viewer │   │
│  │ (by status)  │    │ /Request     │    │ (immutable)      │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │ Manage         │  │ Manage System  │  │ Election Windows  │   │
│  │ Candidates     │  │ Config/Placehld│  │ (open/close)     │   │
│  └────────────────┘  └────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Trees

```
CANDIDATE Permissions (auto-assigned on registration)
├── submissions:create
├── submissions:view_own
├── submissions:edit_own (only when status = pending_review or changes_requested)
├── submissions:delete_own_draft (only when status = pending_review)
└── profile:edit

ADMIN Permissions (role-gated via admin_roles table)

super_admin:
├── submissions:approve
├── submissions:deny
├── submissions:request_changes
├── submissions:view_all
├── candidates:manage
├── candidates:suspend
├── system:config
├── system:elections
├── logs:view
└── admin:manage

reviewer:
├── submissions:approve
├── submissions:deny
├── submissions:request_changes
├── submissions:view_all
├── candidates:view
└── logs:view

viewer:
├── submissions:view_all
└── candidates:view
```

## 2.3 Storage Strategy

| Data Type             | Storage Engine        | Format/Encoding     | Notes |
|-----------------------|-----------------------|---------------------|-------|
| Structured data       | Supabase PostgreSQL   | Relational tables   | RLS policies per user role |
| Candidate statements  | PostgreSQL TEXT       | UTF-8 with lang tag | Stored columnar in submissions table |
| PDF Assets (policy)   | Vercel Blob Storage   | Binary, CDN-cached  | Signed URLs for controlled access |
| Profile Pictures      | Vercel Blob Storage   | WebP (auto-convert) | Max 2MB, 500x500; transformed on upload |
| Auth Sessions         | NextAuth.js (JWT or DB)| JSON Web Token      | Stored in httpOnly secure cookies |
| Audit Logs            | PostgreSQL (admin_logs)| Normalized rows     | Append-only via trigger enforcement |
| Session State         | Upstash Redis (opt.)  | Key-value           | Rate limiting + temporary locks |
| Uploaded Subtitles/CSV| Vercel Blob Storage   | UTF-8, CSV          | Bulk candidate import pipeline |

## 2.4 Multi-Language Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   i18n Routing (Next.js)                  │
│                                                           │
│  /en/voters-guide → English version                      │
│  /es/voters-guide → Spanish version                       │
│  /zh/voters-guide → Chinese version                       │
│                                                           │
│  next-intl / react-intl for message translation files     │
│  Language toggler persists to cookie + URL param          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│             Per-Submission Language Tagging               │
│                                                           │
│  Each submission row has: language_code → 'en' | 'es'    │
│  Candidate content (statement, bio) stored per-language  │
│  Filtering: WHERE language_code = current_ui_lang        │
│  Fallback chain: current_ui → en → first available       │
└─────────────────────────────────────────────────────────┘
```

---

# DELIVERABLE 3: FRONTEND LAYOUT & BRAND GUIDELINES

## 3.1 Illinois State Branding Design Tokens

```json
{
  "$schema": "https://design-tokens.example.com/schema-v2.json",
  "name": "il-elections-voters-guide",
  "version": "1.0.0",
  "description": "Design tokens derived from elections.il.gov visual identity",
  "tokens": {
    "color": {
      "primary": {
        "50":  { "value": "#eef2ff", "description": "Lightest blue tint" },
        "100": { "value": "#e0e7ff", "description": "Very light blue" },
        "200": { "value": "#c7d2fe", "description": "Light blue" },
        "300": { "value": "#a5b4fc", "description": "Medium-light blue" },
        "400": { "value": "#818cf8", "description": "Medium blue" },
        "500": { "value": "#6366f1", "description": "Primary brand blue" },
        "600": { "value": "#4f46e5", "description": "Active state blue" },
        "700": { "value": "#4338ca", "description": "Hover state blue" },
        "800": { "value": "#3730a3", "description": "Deep blue, visited links" },
        "900": { "value": "#312e81", "description": "Darkest blue, headings" }
      },
      "secondary": {
        "50":  { "value": "#f0fdf4", "description": "Lightest green tint" },
        "100": { "value": "#dcfce7", "description": "Very light green" },
        "500": { "value": "#22c55e", "description": "Approved / success state" },
        "600": { "value": "#16a34a", "description": "Active success" },
        "700": { "value": "#15803d", "description": "Dark success" }
      },
      "accent": {
        "gold":     { "value": "#D4A843", "description": "Illinois state gold / accent" },
        "gold_light": { "value": "#F5E6B8", "description": "Light gold background" },
        "gold_dark":  { "value": "#B8860B", "description": "Dark gold, decorative borders" },
        "red":      { "value": "#DC2626", "description": "Denied / error state" },
        "red_light":  { "value": "#FEE2E2", "description": "Error background" },
        "orange":   { "value": "#F59E0B", "description": "Warning / changes requested" },
        "orange_light": { "value": "#FEF3C7", "description": "Warning background" }
      },
      "neutral": {
        "white":    { "value": "#FFFFFF", "description": "Page background" },
        "50":       { "value": "#F9FAFB", "description": "Subtle background" },
        "100":      { "value": "#F3F4F6", "description": "Card background" },
        "200":      { "value": "#E5E7EB", "description": "Border / divider" },
        "300":      { "value": "#D1D5DB", "description": "Disabled border" },
        "400":      { "value": "#9CA3AF", "description": "Disabled text" },
        "500":      { "value": "#6B7280", "description": "Secondary text" },
        "600":      { "value": "#4B5563", "description": "Body text" },
        "700":      { "value": "#374151", "description": "Strong body" },
        "800":      { "value": "#1F2937", "description": "Heading text" },
        "900":      { "value": "#111827", "description": "Darkest text" },
        "black":    { "value": "#000000", "description": "True black (limited use)" }
      },
      "state": {
        "il_blue":    { "value": "#002868", "description": "Official Illinois state blue (flag)" },
        "il_gold":    { "value": "#D4A843", "description": "Official Illinois state gold" },
        "il_seal_bg": { "value": "#F5F5F0", "description": "State seal background tint" }
      },
      "wcag": {
        "contrast_aa_large":    { "value": "3:1",  "description": "Minimum for large text (18px+ bold or 24px+)" },
        "contrast_aa_normal":   { "value": "4.5:1","description": "Minimum for normal text" },
        "contrast_aaa":         { "value": "7:1",  "description": "Enhanced for all text" },
        "focus_ring":           { "value": "#2563EB","description": "Focus indicator ring color (3px offset)" },
        "focus_ring_width":     { "value": "3px", "description": "Focus ring width" }
      }
    },
    "typography": {
      "fontFamily": {
        "heading": {
          "value": "'Public Sans', 'Segoe UI', system-ui, -apple-system, sans-serif",
          "description": "Clean government-style sans-serif for headings"
        },
        "body": {
          "value": "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
          "description": "Highly readable body font"
        },
        "mono": {
          "value": "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
          "description": "Code and data display"
        }
      },
      "fontSize": {
        "xs":     { "value": "0.75rem",   "lineHeight": "1rem",    "description": "Caption / legal text" },
        "sm":     { "value": "0.875rem",  "lineHeight": "1.25rem", "description": "Small body / metadata" },
        "base":   { "value": "1rem",      "lineHeight": "1.5rem",  "description": "Body text" },
        "lg":     { "value": "1.125rem",  "lineHeight": "1.75rem", "description": "Large body" },
        "xl":     { "value": "1.25rem",   "lineHeight": "1.75rem", "description": "Sub-heading" },
        "2xl":    { "value": "1.5rem",    "lineHeight": "2rem",    "description": "Section heading" },
        "3xl":    { "value": "1.875rem",  "lineHeight": "2.25rem", "description": "Page heading" },
        "4xl":    { "value": "2.25rem",   "lineHeight": "2.5rem",  "description": "Hero heading" },
        "5xl":    { "value": "3rem",      "lineHeight": "1",       "description": "Large hero" }
      },
      "fontWeight": {
        "normal":  { "value": "400" },
        "medium":  { "value": "500" },
        "semibold":{ "value": "600" },
        "bold":    { "value": "700" }
      }
    },
    "spacing": {
      "0":   { "value": "0px" },
      "1":   { "value": "0.25rem" },
      "2":   { "value": "0.5rem" },
      "3":   { "value": "0.75rem" },
      "4":   { "value": "1rem" },
      "5":   { "value": "1.25rem" },
      "6":   { "value": "1.5rem" },
      "8":   { "value": "2rem" },
      "10":  { "value": "2.5rem" },
      "12":  { "value": "3rem" },
      "16":  { "value": "4rem" },
      "20":  { "value": "5rem" },
      "24":  { "value": "6rem" }
    },
    "borderRadius": {
      "none":   { "value": "0px" },
      "sm":     { "value": "0.125rem" },
      "md":     { "value": "0.375rem" },
      "lg":     { "value": "0.5rem" },
      "xl":     { "value": "0.75rem" },
      "full":   { "value": "9999px" }
    },
    "shadow": {
      "sm":     { "value": "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
      "md":     { "value": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" },
      "lg":     { "value": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" },
      "xl":     { "value": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }
    },
    "breakpoint": {
      "sm":   { "value": "640px",  "description": "Mobile landscape" },
      "md":   { "value": "768px",  "description": "Tablet" },
      "lg":   { "value": "1024px", "description": "Desktop small" },
      "xl":   { "value": "1280px", "description": "Desktop wide" },
      "2xl":  { "value": "1536px", "description": "Desktop ultra-wide" }
    },
    "zIndex": {
      "dropdown": { "value": "10" },
      "sticky":   { "value": "20" },
      "modal":    { "value": "30" },
      "toast":    { "value": "40" },
      "tooltip":  { "value": "50" }
    },
    "animation": {
      "duration": {
        "fast":   { "value": "150ms" },
        "normal": { "value": "200ms" },
        "slow":   { "value": "300ms" }
      },
      "easing": {
        "ease_out": { "value": "cubic-bezier(0.16, 1, 0.3, 1)" },
        "ease_in_out": { "value": "cubic-bezier(0.65, 0, 0.35, 1)" }
      }
    }
  }
}
```

## 3.2 Page Layout Scaffolds

### 3.2.1 Public View — Voters' Guide Home (`/en/voters-guide`)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                        │
│ ┌─────┐                                                    │
│ │Seal │  Illinois State Board of Elections                    │
│ └─────┘  [EN | ES | ZH ▼]  [Login]                          │
├─────────────────────────────────────────────────────────────┤
│ NAV: Voters' Guide | FAQs | Contact Us | Election Authorities│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───── ELECTION CYCLE SELECTOR ───────────────────────┐    │
│  │  [2026 General Election ▼]  [2024 General] [2022]   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌───── SEARCH & FILTER ────────────────────────────────┐    │
│  │  🔍 [Search by candidate name or office...]           │    │
│  │  Office: [All Offices ▼]  Party: [All ▼]             │    │
│  │  Language: [English ▼]   ▼ Show only approved        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌───── CANDIDATE RESULTS ─────────────────────────────┐    │
│  │                                                       │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │ [Photo]  John A. Smith                       │   │    │
│  │  │          U.S. Senator                        │   │    │
│  │  │          Democratic Party                    │   │    │
│  │  │          [English] [Español]                 │   │    │
│  │  │          View Full Profile →                 │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  │                                                       │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │ [Photo]  Jane M. Doe                         │   │    │
│  │  │          U.S. Senator                        │   │    │
│  │  │          Republican Party                    │   │    │
│  │  │          [English Only]                      │   │    │
│  │  │          View Full Profile →                 │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌───── POLICY QUESTIONS ───────────────────────────────┐    │
│  │  📄 Public Policy Questions: [View PDFs →]           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ FOOTER                                                        │
│ IL State Board of Elections |  2026 State of Illinois       │
│ Contact: Springfield | Chicago  |  Privacy Policy            │
└─────────────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- Desktop (≥1024px): 3-column candidate grid, full sidebar
- Tablet (768-1023px): 2-column grid, collapsed sidebar to top
- Mobile (<768px): Single column, hamburger nav, stacked filters

### 3.2.2 Candidate Dashboard (`/en/candidate/dashboard`)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: IL State Board of Elections | [Dashboard] [Profile]│
│         Welcome, John Smith  [Logout]                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────── ACTION HUB ──────────────────────────────┐   │
│  │  [➕ Start New Submission]                             │   │
│  │                                                         │   │
│  │  Active Election Cycle: 2026 General Election          │   │
│  │  Open until: November 5, 2026                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────── MY SUBMISSIONS ──────────────────────────┐   │
│  │  ┌─────┬──────────┬────────┬───────┬────────┬─────┐  │   │
│  │  │ ID  │ Office   │ Lang  │ Date  │ Status │ Act │  │   │
│  │  ├─────┼──────────┼────────┼───────┼────────┼─────┤  │   │
│  │  │ 001 │ US Sen   │ EN    │ 5/1   │ ✅ Apr │ Edit│  │   │
│  │  │ 002 │ US Sen   │ ES    │ 5/3   │ ⏳ Pnd │ View│  │   │
│  │  │ 003 │ Gov      │ EN    │ 4/28  │ 🔄 Sup │ View│  │   │
│  │  └─────┴──────────┴────────┴───────┴────────┴─────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────── CONTACT INFO ────────────────────────────┐   │
│  │  Need help? Call Springfield: 217-782-4141             │   │
│  │  or Chicago: 312-814-6440                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ FOOTER                                                        │
└─────────────────────────────────────────────────────────────┘
```

### 3.2.3 Admin Panel (`/en/admin/queue`)

```
┌─────────────────────────────────────────────────────────────┐
│ ADMIN PANEL                                      [👤 Admin]│
│ Review Queue | Candidates | Config | Logs | Elections      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────── QUEUE FILTERS ──────────────────────────┐   │
│  │  Status: [Pending Review ▼]  Election: [2026 Gen ▼]  │   │
│  │  Office: [All ▼]  Language: [All ▼]                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────── SUBMISSION QUEUE ───────────────────────┐   │
│  │  ┌─────┬────────┬──────────┬──────┬───────┬────────┐ │   │
│  │  │ ID  │ Cand. │ Office   │ Lang │ Date  │ Actions │ │   │
│  │  ├─────┼────────┼──────────┼──────┼───────┼────────┤ │   │
│  │  │ 004 │ JSmith │ US Sen   │ EN   │ 5/10  │[View]  │ │   │
│  │  │ 005 │ JDoe   │ Gov      │ ES   │ 5/10  │[View]  │ │   │
│  │  └─────┴────────┴──────────┴──────┴───────┴────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────── SUBMISSION DETAIL ──────────────────────┐   │
│  │  Candidate: Jane M. Doe                              │   │
│  │  Office: U.S. Senator                                │   │
│  │  Language: English                                   │   │
│  │  Submitted: May 10, 2026                             │   │
│  │                                                       │   │
│  │  Statement: [text preview...]                        │   │
│  │  Bio: [text preview...]                              │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ ✅ Approve  │ ❌ Deny  │ 📝 Request Changes  │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │                                                       │   │
│  │  Notes: [___________________________________]        │   │
│  │  [Submit Action]                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────── AUDIT LOG ──────────────────────────────┐   │
│  │  ┌─────┬──────────┬──────────┬──────────┬──────────┐ │   │
│  │  │Date │ Admin    │ Action   │ Prev→New │ Notes    │ │   │
│  │  ├─────┼──────────┼──────────┼──────────┼──────────┤ │   │
│  │  │5/10 │ A.Admin  │ Approved │ P→A      │ Looks... │ │   │
│  │  │5/9  │ A.Admin  │ Denied   │ P→D      │ Incomp.. │ │   │
│  │  └─────┴──────────┴──────────┴──────────┴──────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ FOOTER                                                        │
└─────────────────────────────────────────────────────────────┘
```

### 3.2.4 System Unavailable Placeholder Page

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                    ⚠️  System Unavailable                     │
│                                                               │
│  The Voters' Guide submission system is currently closed.    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [CUSTOMIZABLE MESSAGE from system_config            │    │
│  │   "system_availability_message"]                    │    │
│  │                                                      │    │
│  │  "The Voters' Guide is currently closed for this    │    │
│  │   election cycle. Please check back during the      │    │
│  │   open submission window."                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Contact: Springfield 217-782-4141                          │
│           Chicago 312-814-6440                              │
│                                                               │
│  [View Public Voters' Guide (Read-Only)]                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 3.3 WCAG Compliance Checklist

| Requirement                | Implementation Strategy |
|----------------------------|------------------------|
| **1.1.1 Non-text Content** | All images have descriptive alt text. Icons use aria-hidden + sr-only labels |
| **1.4.3 Contrast (AA)**   | All tokens pass 4.5:1 (normal) / 3:1 (large) ratios. Automated CI check with axe-core |
| **1.4.4 Resize Text**     | All viewports support 200% zoom without loss of content or functionality |
| **1.4.10 Reflow**         | No horizontal scroll at 320px width. Content stacks vertically |
| **1.4.12 Text Spacing**   | No loss of content when line-height > 1.5, spacing > 2× default |
| **2.1.1 Keyboard**        | Every interactive element reachable and operable via Tab/Enter/Space/Escape |
| **2.4.3 Focus Order**     | Logical tab order matching visual layout. Skip-to-content link at top |
| **2.4.7 Focus Visible**   | 3px blue focus ring on all interactive elements (`focus_ring` token) |
| **2.5.3 Label in Name**   | Visible label text matches accessible name for voice control |
| **3.3.2 Labels**          | Every input has an associated <label> or aria-label |
| **4.1.2 Name, Role, Value** | All custom components expose proper ARIA roles and states |
| **4.1.3 Status Messages** | Role="status" or aria-live="polite" for dynamic content changes |

---

# DELIVERABLE 4: DEVOPS & GIT WORKFLOW PROVISIONING

## 4.1 Local Project Initialization

```bash
# Step 1: Create Next.js project with TypeScript + Tailwind
cd ~/projects  # or wherever you keep your code
npx create-next-app@latest vguide \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm

cd vguide

# Step 2: Install core dependencies
npm install next-intl@latest @prisma/client @auth/core next-auth@beta

# Step 3: Install dev dependencies
npm install -D prisma @types/node vitest @testing-library/react \
  @testing-library/jest-dom axe-core @axe-core/react \
  eslint-plugin-jsx-a11y prettier prettier-plugin-tailwindcss

# Step 4: Initialize Prisma with PostgreSQL
npx prisma init --datasource-provider postgresql

# Step 5: Initialize Git
git init
git add .
git commit -m "chore: initial scaffold - Next.js 14 + TypeScript + Tailwind + Prisma"

# Step 6: Set up the design tokens directory
mkdir -p tokens
# Copy the JSON design tokens from Deliverable 3 to tokens/il-elections-tokens.json
```

## 4.2 Remote Repository Binding

```bash
# Prerequisites: GitHub CLI authenticated
gh auth status  # Verify you're logged in

# Create the remote repository
gh repo create mgianasi/VGuide \
  --public \
  --description "Illinois State Board of Elections Voters' Guide - Multi-election, bilingual, WCAG-compliant" \
  --remote origin \
  --push

# Verify remote is set
git remote -v
# Expected:
# origin  https://github.com/mgianasi/VGuide.git (fetch)
# origin  https://github.com/mgianasi/VGuide.git (push)

# Alternative via HTTPS (if gh not available):
# git remote add origin https://github.com/mgianasi/VGuide.git
# git push -u origin main
```

## 4.3 Branching Framework

```bash
# Create development branch
git checkout -b develop
git push -u origin develop

# Create feature branches from develop
git checkout develop
git checkout -b feature/database-schema
git push -u origin feature/database-schema

# After work is done:
# git add . && git commit -m "feat: add PostgreSQL schema with triggers"
# git checkout develop && git merge feature/database-schema
# git push origin develop

# Release branches (when staging)
git checkout develop
git checkout -b release/v1.0.0-beta
git push -u origin release/v1.0.0-beta

# Hotfix branches (from main)
git checkout main
git checkout -b hotfix/auth-redirect-bug
git push -u origin hotfix/auth-redirect-bug
```

**Branch Strategy:**
```
main         ───●────────────────●──────────────── (production)
                  \              /
develop           ●──●──●──●──●──●──●──●────────── (integration)
                     \    /  \    /
feature/*            ●─●─●    ●─●─●──────────────── (feature branches)
                          \
release/v*              ●──●────────────────────── (release candidates)
                              \
hotfix/*                       ●──●──────────────── (emergency fixes)
```

## 4.4 Vercel Deployment Configuration

### vercel.json

```json
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.blob.vercel-storage.com https://elections.il.gov blob:; connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; font-src 'self' data:"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, max-age=0" }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=86400" }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/",
      "destination": "/en/voters-guide",
      "permanent": true
    }
  ],
  "rewrites": [
    {
      "source": "/robots.txt",
      "destination": "/api/robots"
    }
  ]
}
```

## 4.5 GitHub Actions CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx next lint
      - run: npx prettier --check .
      - run: npx eslint . --ext .ts,.tsx

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: vguide_test
          POSTGRES_USER: vguide
          POSTGRES_PASSWORD: vguide_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma db push
        env:
          DATABASE_URL: postgresql://vguide:vguide_test@localhost:5432/vguide_test
      - run: npx vitest run --coverage
        env:
          DATABASE_URL: postgresql://vguide:vguide_test@localhost:5432/vguide_test

  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --reporter=html
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  deploy-preview:
    if: github.event_name == 'pull_request'
    needs: [lint-and-typecheck, test, a11y]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel (Preview)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          github-comment: true
          vercel-args: '--prebuilt'
```

## 4.6 Environment Variables Template

```bash
# .env.local (local development)
DATABASE_URL="postgresql://vguide:vguide_local@localhost:5432/vguide_dev"
DIRECT_URL="postgresql://vguide:vguide_local@localhost:5432/vguide_dev"

# Auth
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Supabase (optional, if using Supabase PostgreSQL)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="your-blob-token"

# Cloudflare Turnstile (CAPTCHA)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-site-key"
TURNSTILE_SECRET_KEY="your-secret-key"

# Twilio (SMS MFA, optional)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_VERIFY_SERVICE_SID="your-verify-sid"
```

## 4.7 Quick-Start Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link --project vguide --yes

# Set environment variables in production
vercel env add DATABASE_URL production
vercel env add AUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel env add NEXT_PUBLIC_TURNSTILE_SITE_KEY production
vercel env add TURNSTILE_SECRET_KEY production
vercel env add BLOB_READ_WRITE_TOKEN production

# Deploy to production
vercel --prod

# Deploy preview (from feature branch)
vercel
```

---

# DELIVERABLE 5: BUSINESS LOGIC VERIFICATION

## 5.1 Dual-Language Concurrency Rule ✓

**Requirement:** A candidate can have at most TWO simultaneous "Approved" status submissions only if they are in different languages.

**Implementation:**
- **Trigger** `trg_check_approved_language_limit` (see Section 1.4, 5.1): BEFORE UPDATE on submissions, when status → 'approved', counts current approved submissions for that candidate+election. If ≥ 2, raises exception. If = 1 AND same language, raises exception.
- **Application layer** also validates before calling the UPDATE, providing a user-friendly error message.

**Covered states:**
- 0 approved → allowed (any language)
- 1 approved (en) → allowed only if new language ≠ en
- 1 approved (en) + 1 approved (es) → blocked for any new approval
- Same language re-submit → triggers supersede workflow instead (see 5.2)

## 5.2 Same-Language Supersede Rule ✓

**Requirement:** A subsequent submission in the same language automatically changes the previous approved one to "Superseded".

**Implementation:**
- **Trigger** `trg_auto_supersede_same_language` (see Section 1.4, 5.2): AFTER UPDATE when status → 'approved', checks for existing approved submission matching candidate_id + election_id + office_id + language_code. If found, sets its status to 'superseded'.
- **Gap analysis:** The trigger fires AFTER the new approval, ensuring the new one exists. The old one is soft-deleted (status = 'superseded') preserving its data for audit.

**Edge cases covered:**
- Candidate has 1 approved (en). Submits new (en). Old → superseded, new → approved (if pending_review).
- Candidate has 1 approved (en), 1 superseded (en). Submits third (en). Old approved → superseded, new → approved.
- Candidate has 2 approved (different languages). Cannot approve a third of any language (blocked by 5.1 above).

## 5.3 Admin Audit Log ✓

**Requirement:** All admin actions must be logged with immutable audit trail.

**Implementation:**
- **Trigger** `trg_log_admin_action` (see Section 1.4, 5.3): AFTER UPDATE of submissions.status, inserts into admin_logs with:
  - submission_id, admin_id (from session variable or reviewed_by)
  - Action enum (submission_approved, submission_denied, changes_requested, note_added)
  - previous_status and new_status snapshots
  - reviewer_notes
  - created_at timestamp
- **admin_logs table** (see Section 1.2, Table 6) is INSERT-only; no UPDATE/DELETE policies granted in application.
- **Separate triggers** for config changes, candidate account actions via similar patterns.

**Covered events:**
- ✅ Submission approved
- ✅ Submission denied
- ✅ Changes requested
- ✅ System config updated (separate trigger on system_config)
- ✅ Candidate account suspended/reactivated (separate trigger)
- ✅ Election window changed

## 5.4 Availability Gate ✓

**Requirement:** System availability must be gated by a date/time window. When closed, renders a customizable placeholder page.

**Implementation:**
- **Function** `check_system_availability()` (see Section 1.4, 5.4): Checks two conditions:
  1. `system_availability_override` config → if true, system is closed.
  2. Active election window → finds any election with status='open' AND active_window_start ≤ NOW() ≤ active_window_end.
- **Application middleware** runs this check on every candidate/admin route. If closed:
  - Shows customizable placeholder from `system_config.system_availability_message` (JSONB with per-language messages)
  - Public read-only voters' guide remains accessible
- **Admin panel** can update `system_availability_message` via system_config CRUD
- **Admin override** toggle forces system closed regardless of dates

## 5.5 Architecture Separation: Policy Questions ✓

**Requirement:** Public Policy Questions must be strictly decoupled from candidate search structures.

**Implementation:**
- **Separate table** `policy_questions` (Section 1.2, Table 7) with its own schema, endpoints, and storage.
- **Separate API routes:** `/api/policy-questions` (not under `/api/submissions` or `/api/candidates`)
- **Separate UI section:** "Public Policy Questions" card on the voters' guide page, distinctly separated from candidate search results.
- **PDF asset management:** Policy PDFs stored in Vercel Blob Storage, served as downloadable links, not inline content.

## 5.6 UTF-8 + ISO Language Codes ✓

**Requirement:** All textual candidate submissions use UTF-8 encoding with explicit ISO language codes.

**Implementation:**
- PostgreSQL defaults to UTF-8 encoding for all TEXT/VARCHAR columns
- Each submission row includes `language_code` (ENUM-based, ISO 639-1 codes)
- Frontend i18n routing (`/en/`, `/es/`) using next-intl
- Per-language candidate statement and biographical_info columns in submissions
- Language toggle on public view filters submissions by target language
- Fallback chain: UI language → English → first available

## 5.7 Access Control & MFA ✓

**Requirement:** Candidates and Admins require distinct permission trees. Registration requires CAPTCHA. Authentication requires MFA.

**Implementation:**
- **Two separate account tables:** `candidate_accounts` (registration flow) and `admin_accounts` (provisioned internally)
- **CAPTCHA:** Cloudflare Turnstile widget on registration form; server-side verification against Turnstile API
- **MFA:** TOTP (speakeasy library, authenticator app) with fallback to SMS (Twilio Verify)
  - On first login after setup, prompts for TOTP code
  - MFA secret stored encrypted in database
  - Recovery codes (10 one-time-use codes) generated during MFA setup
- **Permission trees** defined in `admin_roles` table with JSONB permissions array; enforced at API middleware layer

---

# APPLICATION STRUCTURE MAP

```
vguide/
├── .github/
│   └── workflows/
│       └── ci.yml                          # CI pipeline
├── .vercel/                                 # Vercel project config
├── prisma/
│   ├── schema.prisma                        # Prisma schema (mirrors SQL above)
│   └── migrations/                          # Auto-generated migrations
├── public/
│   ├── fonts/
│   ├── images/
│   │   ├── il-seal.png                      # Illinois state seal
│   │   ├── il-flag.png
│   │   └── og-image.png                     # Open Graph preview
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── [locale]/                        # i18n locale segment
│   │   │   ├── layout.tsx                   # Root layout with header/footer
│   │   │   ├── page.tsx                     # Redirect to /voters-guide
│   │   │   ├── voters-guide/
│   │   │   │   ├── page.tsx                 # Public voters' guide home
│   │   │   │   ├── faqs/
│   │   │   │   │   └── page.tsx             # FAQ page
│   │   │   │   ├── contact/
│   │   │   │   │   └── page.tsx             # Contact Us page
│   │   │   │   └── candidate/
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx         # Candidate detail view
│   │   │   ├── candidate/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx             # Candidate login
│   │   │   │   ├── register/
│   │   │   │   │   └── page.tsx             # Candidate registration
│   │   │   │   └── dashboard/
│   │   │   │       ├── page.tsx             # Dashboard home
│   │   │   │       └── submission/
│   │   │   │           ├── new/
│   │   │   │           │   └── page.tsx     # New submission form
│   │   │   │           └── [id]/
│   │   │   │               └── page.tsx     # Edit submission
│   │   │   ├── admin/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx             # Admin login
│   │   │   │   ├── queue/
│   │   │   │   │   └── page.tsx             # Review queue
│   │   │   │   ├── candidates/
│   │   │   │   │   └── page.tsx             # Manage candidates
│   │   │   │   ├── config/
│   │   │   │   │   └── page.tsx             # System configuration
│   │   │   │   ├── logs/
│   │   │   │   │   └── page.tsx             # Audit log viewer
│   │   │   │   └── elections/
│   │   │   │       └── page.tsx             # Manage election windows
│   │   │   └── system-unavailable/
│   │   │       └── page.tsx                 # Placeholder page
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/
│   │       │   │   └── route.ts             # NextAuth.js API handler
│   │       │   ├── register/
│   │       │   │   └── route.ts             # Candidate registration
│   │       │   └── verify-mfa/
│   │       │       └── route.ts             # MFA verification
│   │       ├── submissions/
│   │       │   ├── route.ts                 # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts             # GET, PATCH, DELETE
│   │       │       └── approve/
│   │       │           └── route.ts         # POST (admin approve)
│   │       ├── candidates/
│   │       │   └── route.ts                 # Public search endpoint
│   │       ├── elections/
│   │       │   └── route.ts                 # List active elections
│   │       ├── policy-questions/
│   │       │   └── route.ts                 # List policy PDFs
│   │       ├── admin/
│   │       │   ├── queue/
│   │       │   │   └── route.ts             # Queue management
│   │       │   ├── config/
│   │       │   │   └── route.ts             # System config CRUD
│   │       │   └── logs/
│   │       │       └── route.ts             # Audit log queries
│   │       └── availability/
│   │           └── route.ts                 # Check system availability
│   ├── components/
│   │   ├── ui/                              # Reusable UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx                    # Status badges (Approved/Denied/etc.)
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── SkipNav.tsx                  # Skip-to-content link
│   │   │   └── FocusTrap.tsx                # Modal focus management
│   │   ├── layout/
│   │   │   ├── Header.tsx                   # State seal + nav
│   │   │   ├── Footer.tsx                   # Contact + legal
│   │   │   ├── LanguageToggle.tsx            # EN / ES / ZH switcher
│   │   │   ├── Navigation.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── SystemBanner.tsx             # Availability banner
│   │   ├── public/
│   │   │   ├── ElectionSelector.tsx          # Cycle picker
│   │   │   ├── SearchBar.tsx
│   │   │   ├── CandidateCard.tsx
│   │   │   ├── CandidateDetail.tsx
│   │   │   ├── LanguageToggleCard.tsx        # Per-candidate lang toggle
│   │   │   ├── PolicyQuestionsList.tsx
│   │   │   ├── FAQAccordion.tsx
│   │   │   └── ContactInfo.tsx
│   │   ├── candidate/
│   │   │   ├── SubmissionForm.tsx
│   │   │   ├── SubmissionHistoryTable.tsx
│   │   │   ├── DashboardStats.tsx
│   │   │   └── MfaSetup.tsx
│   │   └── admin/
│   │       ├── QueueTable.tsx
│   │       ├── SubmissionReview.tsx
│   │       ├── AuditLogTable.tsx
│   │       ├── ConfigEditor.tsx
│   │       └── ElectionManager.tsx
│   ├── hooks/
│   │   ├── useAvailability.ts               # System gate check
│   │   ├── useCandidates.ts                 # Public search
│   │   ├── useSubmissions.ts                # Candidate submissions
│   │   ├── useAdmin.ts                      # Admin operations
│   │   ├── useDebounce.ts
│   │   └── useMediaQuery.ts                 # Responsive breakpoints
│   ├── lib/
│   │   ├── prisma.ts                        # Prisma client singleton
│   │   ├── auth.ts                          # NextAuth config
│   │   ├── i18n.ts                          # next-intl config
│   │   ├── mfa.ts                           # TOTP utilities (speakeasy)
│   │   ├── captcha.ts                       # Turnstile verification
│   │   ├── availability.ts                  # Gate check middleware
│   │   ├── blob.ts                          # Vercel Blob helpers
│   │   └── audit.ts                         # Audit log helpers
│   ├── middleware.ts                        # i18n routing + availability gate
│   ├── styles/
│   │   ├── globals.css                      # Tailwind directives + custom tokens
│   │   └── design-tokens.css                # CSS custom properties from JSON
│   └── types/
│       ├── index.ts                         # Shared TypeScript types
│       ├── prisma.ts                        # Generated Prisma types
│       └── next-auth.d.ts                   # Auth type augmentation
├── tokens/
│   └── il-elections-tokens.json             # Design tokens (Deliverable 3)
├── tests/
│   ├── unit/
│   │   ├── submissions.test.ts              # Business logic unit tests
│   │   ├── availability.test.ts
│   │   └── mfa.test.ts
│   ├── integration/
│   │   ├── submissions-api.test.ts
│   │   ├── auth-flow.test.ts
│   │   └── admin-queue.test.ts
│   └── e2e/
│       ├── public-voters-guide.spec.ts
│       ├── candidate-flow.spec.ts
│       └── admin-panel.spec.ts
├── .env.local                                # Local env vars (gitignored)
├── .env.example                              # Template env vars
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── next.config.ts
├── package.json
├── postcss.config.js
├── tailwind.config.ts                        # Tailwind with design tokens
├── tsconfig.json
├── vercel.json                               # Vercel deployment config
└── vitest.config.ts
```

---

## NEXT STEPS

1. **Create GitHub repo** and push initial scaffold
2. **Set up Prisma schema** from the SQL in Deliverable 1
3. **Configure NextAuth.js** with MFA flow
4. **Build public voters' guide** with search and filtering
5. **Build candidate dashboard** with submission workflow
6. **Build admin panel** with queue management and audit logs
7. **Implement availability gate** middleware
8. **Deploy to Vercel** and configure domain
9. **WCAG audit** with axe-core + manual review
10. **Load test** with simulated candidate submissions

---

*Blueprint generated for mgianasi/VGuide · Illinois State Board of Elections Voters' Guide*