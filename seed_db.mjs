import postgres from 'postgres';

const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function seedAndSecure() {
  try {
    console.log('2. Inserindo dados de teste (Seed) sem passar status...');
    
    const eventId = '00000000-0000-0000-0000-000000000001';
    const speakerId = '00000000-0000-0000-0000-000000000003';
    const sessionId = '00000000-0000-0000-0000-000000000002';

    await sql.unsafe(`
      INSERT INTO events (id, title, description) 
      VALUES ('${eventId}', 'Talent Live Summit 2026', 'O maior evento sobre Inteligência Artificial')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO speakers (id, name, bio)
      VALUES ('${speakerId}', 'João Silva', 'Especialista em Next.js e Supabase')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO sessions (id, event_id, speaker_id, title)
      VALUES ('${sessionId}', '${eventId}', '${speakerId}', 'O futuro da Web com IA')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('✅ Banco de dados atualizado e populado com sucesso!');
    console.log(`💡 ID do Evento para testes: ${eventId}`);
  } catch (error) {
    console.error('Erro ao executar:', error);
  } finally {
    process.exit(0);
  }
}

seedAndSecure();
