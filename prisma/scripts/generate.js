const fs = require("fs");
const { execSync } = require("child_process");

// Load DATABASE_URL from .env.local
const text = fs.readFileSync(".env.local", "latin1");
const lines = text.split("\n");
const dbLine = lines.find((l) => l.startsWith("DATABASE_URL="));
const dbUrl = dbLine.replace(/^DATABASE_URL="/, "").replace(/"$/, "");

process.env.DATABASE_URL = dbUrl;

try {
  const output = execSync("npx prisma generate", { encoding: "utf8", cwd: __dirname, stdio: "inherit" });
  process.exit(0);
} catch (e) {
  process.exit(1);
}