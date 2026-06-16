import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
    const res = await sql`SELECT content, suggested_answer FROM questions WHERE status = 'approved'`;
    console.log(res);
    process.exit(0);
}
run();
