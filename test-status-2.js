const fs = require('fs');

async function testStatus() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const res = await fetch(`${url}/rest/v1/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Test No Status' })
  });
  if (res.ok) {
    console.log(`Success with no status:`, await res.json());
  } else {
    const err = await res.text();
    console.log(`Failed with no status - Error: ${err}`);
  }
}

testStatus();
