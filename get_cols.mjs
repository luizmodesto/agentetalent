import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function getCols(table) {
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${table};`;
  console.log(`Table ${table}:`, cols.map(c => c.column_name).join(', '));
}

async function run() {
  await getCols('sessions');
  process.exit(0);
}
run();
