import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
    try {
        console.log("Confirming email for admin@talent.com...");
        const result = await sql`UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'admin@talent.com' RETURNING id, email, email_confirmed_at`;
        if (result.length > 0) {
            console.log("User confirmed successfully:", result[0]);
        } else {
            console.log("User not found or email already confirmed.");
        }
    } catch (e) {
        console.error("Failed to update user:", e);
    } finally {
        process.exit(0);
    }
}
run();
