import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function fixConstraint() {
  try {
    console.log('Removendo a restrição de status (check constraint) da tabela questions...');
    await sql.unsafe(`
      ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_status_check;
    `);
    console.log('✅ Restrição removida com sucesso!');
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    process.exit(0);
  }
}

fixConstraint();
