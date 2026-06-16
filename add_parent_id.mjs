import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function migrate() {
  try {
    console.log('Adicionando coluna parent_id na tabela questions...');
    await sql.unsafe(`
      ALTER TABLE questions 
      ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES questions(id);
    `);
    console.log('✅ Coluna adicionada com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err);
  } finally {
    process.exit(0);
  }
}
migrate();
