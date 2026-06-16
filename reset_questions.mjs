import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function resetQuestions() {
  try {
    const res = await sql`
      UPDATE questions SET status = 'pending' WHERE status = 'processing';
    `;
    console.log("Resetado com sucesso:", res);
  } finally {
    process.exit(0);
  }
}
resetQuestions();
