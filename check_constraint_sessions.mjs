import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
  try {
    const res = await sql`
      SELECT pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'sessions' AND c.conname LIKE '%status%';
    `;
    console.log(res);
  } finally {
    process.exit(0);
  }
}
run();
