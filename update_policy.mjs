import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function updatePolicy() {
  try {
    await sql.unsafe(`
      DROP POLICY IF EXISTS "Permitir update anonimo" ON questions;
      CREATE POLICY "Permitir update anonimo" ON questions FOR UPDATE TO anon USING (true);
    `);
    console.log('✅ Update policy added!');
  } finally {
    process.exit(0);
  }
}
updatePolicy();
