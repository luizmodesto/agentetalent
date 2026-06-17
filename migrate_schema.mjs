import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
    try {
        console.log("Updating speakers table...");
        await sql`ALTER TABLE speakers ADD COLUMN IF NOT EXISTS role text DEFAULT 'orador'`;
        await sql`ALTER TABLE speakers ADD COLUMN IF NOT EXISTS linkedin_url text`;
        await sql`ALTER TABLE speakers ADD COLUMN IF NOT EXISTS instagram_url text`;
        await sql`ALTER TABLE speakers ADD COLUMN IF NOT EXISTS facebook_url text`;

        console.log("Updating events table...");
        await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS max_questions_limit int DEFAULT 10`;

        console.log("Creating supporters table...");
        await sql`
        CREATE TABLE IF NOT EXISTS supporters (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id uuid REFERENCES events(id) ON DELETE CASCADE,
            name text NOT NULL,
            contact text,
            logo_url text,
            created_at timestamp with time zone DEFAULT now()
        )
        `;

        console.log("Database migration completed successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit(0);
    }
}
run();
