import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
    const res = await sql`SELECT id, personality, voice_id, language FROM events`;
    console.log(res);
    process.exit(0);
}
run();
