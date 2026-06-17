import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
    console.log("EVENTS:", await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events'`);
    console.log("SPEAKERS:", await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'speakers'`);
    console.log("SESSIONS:", await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sessions'`);
    process.exit(0);
}
run();
