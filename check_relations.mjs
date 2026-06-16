import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
    const res = await sql`SELECT id, event_id FROM sessions`;
    console.log("Sessions:", res);
    
    const events = await sql`SELECT id FROM events`;
    console.log("Events:", events);
    process.exit(0);
}
run();
