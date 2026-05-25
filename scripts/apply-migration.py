import subprocess, sys

SQL = """ALTER TABLE submissions ALTER COLUMN profile_picture_url TYPE TEXT USING profile_picture_url::TEXT;
ALTER TABLE candidates ALTER COLUMN profile_picture_url TYPE TEXT USING profile_picture_url::TEXT;"""

MIGRATION_SQL = """INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, started_at, applied_steps_count)
SELECT gen_random_uuid()::text, 'f5c07e548991c95c702a82ea42328a41ee5e5d77595a5040d9636b29d20514a3', NOW(), '20260525_widen_profile_picture', 'Widen profile_picture_url to Text', NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name = '20260525_widen_profile_picture');"""

conn = "postgres://6d7163bc8b191fb2f82916879a62e2747d38e6bc319c7e9f82ac98bdfc220d96:sk_9TxZgYJ5CsF-2NKfG6WcT@pooled.db.prisma.io:5432/postgres?sslmode=require"

# Run each SQL statement separately
for label, sql in [("ALTER TABLE", SQL), ("MIGRATION RECORD", MIGRATION_SQL)]:
    cmd = f"cd /home/michael-gianasi/vguide && DATABASE_URL='{conn}' npx prisma db execute --stdin"
    proc = subprocess.run(cmd, shell=True, input=sql, capture_output=True, text=True, timeout=60)
    out = proc.stdout.strip()
    err = proc.stderr.strip()
    if proc.returncode != 0:
        print(f"{label}: FAILED (rc={proc.returncode})")
        print(f"  stderr: {err[:200]}")
        print(f"  stdout: {out[:200]}")
        sys.exit(1)
    else:
        print(f"{label}: OK")