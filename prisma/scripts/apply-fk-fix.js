const fs = require("fs");
const { Client } = require("pg");

async function main() {
  const buf = fs.readFileSync(".env.local");
  const text = buf.toString("latin1");
  const lines = text.split("\n");
  const dbLine = lines.find((l) => l.startsWith("DATABASE_URL="));
  const dbUrl = dbLine.replace(/^DATABASE_URL="/, "").replace(/"$/, "");

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    // Drop old FKs pointing to candidate_accounts
    await client.query(
      "ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_reviewed_by_fkey"
    );
    await client.query(
      "ALTER TABLE admin_logs DROP CONSTRAINT IF EXISTS admin_logs_admin_id_fkey"
    );

    // Re-add with correct target: admin_accounts
    await client.query(
      "ALTER TABLE submissions ADD CONSTRAINT submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES admin_accounts(id) ON DELETE SET NULL ON UPDATE CASCADE"
    );
    await client.query(
      "ALTER TABLE admin_logs ADD CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE"
    );

    console.log("Migration applied successfully");
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});