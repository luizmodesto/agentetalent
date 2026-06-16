import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function selectQuestions() {
  try {
    const res = await sql`
      SELECT id, status, content FROM questions;
    `;
    console.log("Questions:", res);
  } finally {
    process.exit(0);
  }
}
selectQuestions();
