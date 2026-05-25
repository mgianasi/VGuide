const { Client } = require("pg");
const fs = require("fs");

async function main() {
  // Read connection string from .env.local
  const buf = fs.readFileSync(".env.local", "latin1");
  const lines = buf.split("\n");
  const dbLine = lines.find((l) => l.startsWith("DATABASE_URL="));
  const dbUrl = dbLine.replace(/^DATABASE_URL="/, "").replace(/"$/, "");

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const submissionId = "25a57c6f-1e3e-4a02-a68a-d94b18c1a27c";

  try {
    // Delete all admin_logs for this submission (they crash old vercel code)
    const delResult = await client.query(
      `DELETE FROM admin_logs WHERE submission_id = $1`,
      [submissionId]
    );
    console.log(`Deleted ${delResult.rowCount} log entries`);

    // Clear reviewed_by so old code doesn't crash on null reviewer
    await client.query(
      `UPDATE submissions SET reviewed_by = NULL, reviewer_notes = NULL, reviewed_at = NULL WHERE id = $1`,
      [submissionId]
    );
    console.log("Cleared reviewer fields");

    // Verify
    const sub = await client.query(
      `SELECT id, status, reviewed_by FROM submissions WHERE id = $1`,
      [submissionId]
    );
    console.log(`Submission: status=${sub.rows[0].status}, reviewed_by=${sub.rows[0].reviewed_by}`);

    console.log("Done — submission ready for Vercel old code");
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