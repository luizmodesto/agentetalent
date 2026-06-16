import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
    const res = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events'`;
    console.log(res);
    process.exit(0);
}
run();
