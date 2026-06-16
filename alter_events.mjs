import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
  try {
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS personality TEXT, ADD COLUMN IF NOT EXISTS voice_id TEXT DEFAULT 'onyx', ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt-BR'`;
    console.log('Columns added successfully');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
