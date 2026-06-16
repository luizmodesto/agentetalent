import postgres from 'postgres';
const sql = postgres('postgresql://postgres:S@l798412010185@db.dsjqrhnolypvnxrwiypt.supabase.co:5432/postgres', { ssl: 'require' });

async function checkPolicies() {
  try {
    const policies = await sql`
      SELECT policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'questions';
    `;
    console.log(policies);
  } finally {
    process.exit(0);
  }
}
checkPolicies();
