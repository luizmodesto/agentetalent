import postgres from 'postgres';

// URL de conexão usando a senha fornecida
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function fixRLS() {
  try {
    console.log('Executando SQL para liberar leitura...');
    await sql`CREATE POLICY "Permitir leitura publica" ON questions FOR SELECT TO public USING (true);`;
    
    console.log('Executando SQL para liberar inserção...');
    await sql`CREATE POLICY "Permitir insercao anonima" ON questions FOR INSERT TO anon WITH CHECK (true);`;
    
    console.log('✅ Tudo certo! As regras do banco de dados foram atualizadas com sucesso!');
  } catch (error) {
    // Se a regra já existir, ele pode dar erro, mas podemos ignorar
    console.error('Mensagem do banco:', error.message);
  } finally {
    process.exit(0);
  }
}

fixRLS();
