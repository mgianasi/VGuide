const { Client } = require("pg");
const fs = require("fs");

async function main() {
  const buf = fs.readFileSync(".env.local", "latin1");
  const lines = buf.split("\n");
  const dbLine = lines.find((l) => l.startsWith("DATABASE_URL="));
  const dbUrl = dbLine.replace(/^DATABASE_URL="/, "").replace(/"$/, "");

  const client = new Client({ connectionString: dbUrl, connectionTimeoutMillis: 5000, query_timeout: 10000 });
  await client.connect();
  const sid = "25a57c6f-1e3e-4a02-a68a-d94b18c1a27c";

  // Delete log entries
  const del = await client.query("DELETE FROM admin_logs WHERE submission_id = $1", [sid]);
  console.log("Deleted", del.rowCount, "logs");

  // Clear reviewer
  await client.query("UPDATE submissions SET reviewed_by = NULL, reviewer_notes = NULL, reviewed_at = NULL WHERE id = $1", [sid]);
  console.log("Cleared reviewer");

  // Verify
  const r = await client.query("SELECT id, status FROM submissions WHERE id = $1", [sid]);
  console.log("Status:", r.rows[0].status);

  await client.end();
  console.log("Done");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});