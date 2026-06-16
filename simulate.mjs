import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
  try {
    // Pegar ultima sessao
    const sessions = await sql`SELECT id FROM sessions ORDER BY created_at DESC LIMIT 1`;
    if (sessions.length === 0) {
      console.log('Sem sessão ativa!');
      process.exit(1);
    }
    const sessionId = sessions[0].id;
    
    console.log('Sessão encontrada:', sessionId);
    
    // Inserir 6 perguntas
    const questions = [
      { session_id: sessionId, content: 'Como a IA vai afetar o mercado de trabalho dos desenvolvedores?', author_name: 'Lucas', status: 'pending' },
      { session_id: sessionId, content: 'Quais são as melhores ferramentas de IA para iniciantes?', author_name: 'Maria', status: 'pending' },
      { session_id: sessionId, content: 'Acha que a inteligência artificial pode substituir um CEO no futuro?', author_name: 'João', status: 'pending' },
      { session_id: sessionId, content: 'teste de spam 12345 adasddad asdasd', author_name: 'Troll', status: 'pending' },
      { session_id: sessionId, content: 'Qual o maior desafio de segurança ao implementar IA nas empresas?', author_name: 'Ana', status: 'pending' },
      { session_id: sessionId, content: 'Como proteger os dados da empresa usando o ChatGPT?', author_name: 'Pedro', status: 'pending' },
    ];
    
    for (const q of questions) {
      await sql`INSERT INTO questions (session_id, content, author_name, status) VALUES (${q.session_id}, ${q.content}, ${q.author_name}, ${q.status})`;
    }
    
    console.log('6 Perguntas de simulação inseridas com sucesso!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
