import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
  await sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS context TEXT, ADD COLUMN IF NOT EXISTS suggested_answer TEXT, ADD COLUMN IF NOT EXISTS transition TEXT;`;
  console.log('Done');
  process.exit(0);
}
run();
