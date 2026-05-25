// ──────────────────────────────────────────────
// VGuide — Database Seed
// Loads reference data: admin roles, system config,
// standard IL offices, default admin, initial election
// ──────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createHash } from "node:crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// SHA-256 hash for demo password (production uses bcrypt)
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("🌱 Seeding VGuide database...\n");

  // ── 1. Admin Roles ────────────────────────
  console.log("1. Admin roles...");
  const roles = await Promise.all([
    prisma.adminRole.upsert({
      where: { name: "super_admin" },
      update: {},
      create: {
        name: "super_admin",
        permissions: [
          "submissions:approve",
          "submissions:deny",
          "submissions:request_changes",
          "submissions:view_all",
          "candidates:manage",
          "candidates:suspend",
          "system:config",
          "system:elections",
          "logs:view",
          "admin:manage",
        ],
      },
    }),
    prisma.adminRole.upsert({
      where: { name: "reviewer" },
      update: {},
      create: {
        name: "reviewer",
        permissions: [
          "submissions:approve",
          "submissions:deny",
          "submissions:request_changes",
          "submissions:view_all",
          "candidates:view",
          "logs:view",
        ],
      },
    }),
    prisma.adminRole.upsert({
      where: { name: "viewer" },
      update: {},
      create: {
        name: "viewer",
        permissions: ["submissions:view_all", "candidates:view"],
      },
    }),
  ]);
  console.log(`   ✓ ${roles.length} roles created`);

  // ── 2. Default Admin Account ──────────────
  console.log("2. Default admin account...");
  const admin = await prisma.adminAccount.upsert({
    where: { email: "admin@elections.il.gov" },
    update: {},
    create: {
      email: "admin@elections.il.gov",
      passwordHash: hashPassword("admin123"),
      displayName: "System Administrator",
      roleId: roles[0].id, // super_admin
      isActive: true,
    },
  });
  console.log(`   ✓ Admin: ${admin.email} / admin123`);

  // ── 3. System Configuration ───────────────
  console.log("3. System configuration...");
  const configs = [
    {
      key: "system_availability_message",
      value: {
        en: "The Voters' Guide is currently closed for this election cycle. Please check back during the open submission window.",
        es: "La Guía del Votante está actualmente cerrada para este ciclo electoral. Por favor, vuelva a consultar durante el período de envío abierto.",
        pl: "Przewodnik Wyborcy jest obecnie zamknięty dla tego cyklu wyborczego. Proszę sprawdzić ponownie w okresie otwartego składania zgłoszeń.",
        zh: "选民指南目前在此选举周期中关闭。请在开放提交窗口期间再次查看。",
      },
      description: "Customizable placeholder shown when system is closed",
    },
    {
      key: "system_availability_override_enabled",
      value: false,
      description:
        "When true, overrides date-based window with custom message",
    },
    {
      key: "mfa_issuer_name",
      value: "IL Voters Guide",
      description: "Display name for TOTP authenticator app",
    },
    {
      key: "max_concurrent_languages",
      value: 2,
      description:
        "Maximum simultaneous approved submissions per candidate",
    },
    {
      key: "submission_window_buffer_days",
      value: 7,
      description:
        "Days before election close to auto-lock submissions",
    },
    {
      key: "contact_email",
      value: "contact@elections.il.gov",
      description: "Primary contact email",
    },
    {
      key: "contact_phone_springfield",
      value: "217-782-4141",
      description: "Springfield office main line",
    },
    {
      key: "contact_phone_chicago",
      value: "312-814-6440",
      description: "Chicago office main line",
    },
    {
      key: "contact_address_springfield",
      value: "2329 S. MacArthur Blvd, Springfield, IL 62704",
      description: "Springfield office",
    },
    {
      key: "contact_address_chicago",
      value:
        "100 W. Randolph St., Suite 14-100, Chicago, IL 60601",
      description: "Chicago office",
    },
    {
      key: "recaptcha_site_key",
      value: "",
      description: "CAPTCHA site key for candidate registration",
    },
    {
      key: "recaptcha_secret_key",
      value: "",
      description: "CAPTCHA secret key for server verification",
    },
    {
      key: "faq_content",
      value: {
        en: [
          {
            q: "Who is eligible to submit a candidate profile?",
            a: "Any candidate who has filed for an office in the State of Illinois may submit a profile for the Voters' Guide.",
          },
          {
            q: "How do I create an account?",
            a: "Click 'Register' on the candidate login page, complete the CAPTCHA verification, and fill out the registration form.",
          },
          {
            q: "Can I submit in multiple languages?",
            a: "Yes. You may submit up to two concurrent approved profiles in different languages. Submitting a new version in the same language automatically supersedes the previous one.",
          },
          {
            q: "When can I submit my profile?",
            a: "Submissions are accepted only during the active election window set by the State Board of Elections.",
          },
          {
            q: "How long does review take?",
            a: "The Board aims to review all submissions within 5-7 business days of receipt.",
          },
        ],
      },
      description:
        "FAQ JSON: array of {q, a} objects per language",
    },
  ];

  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: { value: JSON.parse(JSON.stringify(cfg.value)) },
      create: {
        key: cfg.key,
        value: JSON.parse(JSON.stringify(cfg.value)),
        description: cfg.description,
      },
    });
  }
  console.log(`   ✓ ${configs.length} config entries created`);

  // ── 4. Standard IL Offices ────────────────
  console.log("4. Standard Illinois offices...");
  const offices = [
    // Federal
    { label: "U.S. Senator", category: "federal", sortOrder: 1 },
    {
      label: "U.S. Representative",
      category: "federal",
      sortOrder: 2,
    },
    // Statewide Constitutional
    { label: "Governor", category: "statewide", sortOrder: 10 },
    {
      label: "Lieutenant Governor",
      category: "statewide",
      sortOrder: 11,
    },
    {
      label: "Attorney General",
      category: "statewide",
      sortOrder: 12,
    },
    {
      label: "Secretary of State",
      category: "statewide",
      sortOrder: 13,
    },
    { label: "Comptroller", category: "statewide", sortOrder: 14 },
    { label: "Treasurer", category: "statewide", sortOrder: 15 },
    // Legislative
    {
      label: "State Senator",
      category: "legislative",
      sortOrder: 20,
    },
    {
      label: "State Representative",
      category: "legislative",
      sortOrder: 21,
    },
    // Judicial
    {
      label: "Supreme Court",
      category: "judicial",
      sortOrder: 30,
    },
    {
      label: "Appellate Court",
      category: "judicial",
      sortOrder: 31,
    },
    {
      label: "Circuit Court",
      category: "judicial",
      sortOrder: 32,
    },
    // County / Local
    {
      label: "County Board Member",
      category: "county",
      sortOrder: 40,
    },
    {
      label: "County Sheriff",
      category: "county",
      sortOrder: 41,
    },
    {
      label: "County Clerk",
      category: "county",
      sortOrder: 42,
    },
    { label: "Mayor", category: "municipal", sortOrder: 50 },
    {
      label: "City Council Member",
      category: "municipal",
      sortOrder: 51,
    },
    { label: "Township Trustee", category: "township", sortOrder: 60 },
    // Retention
    {
      label: "Supreme Court Retention",
      category: "judicial_retention",
      sortOrder: 70,
      isRetention: true,
    },
    {
      label: "Appellate Court Retention",
      category: "judicial_retention",
      sortOrder: 71,
      isRetention: true,
    },
  ];

  const createdOffices: Array<{ id: string }> = [];
  for (const off of offices) {
    const o = await prisma.office.upsert({
      where: { label: off.label },
      update: {},
      create: off,
    });
    createdOffices.push(o);
  }
  console.log(`   ✓ ${createdOffices.length} offices created`);

  // ── 5. 2026 General Election ───────────────
  console.log("5. 2026 General Election...");
  const election = await prisma.election.upsert({
    where: {
      unique_cycle_type: {
        cycleYear: 2026,
        electionType: "general",
      },
    },
    update: {},
    create: {
      cycleYear: 2026,
      electionType: "general",
      label: "2026 General Election",
      status: "open",
      activeWindowStart: new Date("2025-12-01T00:00:00Z"),
      activeWindowEnd: new Date("2026-11-03T00:00:00Z"),
    },
  });
  console.log(`   ✓ ${election.label} (${election.status})`);

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
