const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) envVars[key.trim()] = values.join('=').trim();
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { error: errPart } = await supabase.from('participants').select('id').limit(1);
  if (errPart) {
     console.log("participants table error:", errPart.message);
  } else {
     console.log("participants table EXISTS");
  }

  const { error: errMan } = await supabase.from('managers').select('id').limit(1);
  if (errMan) {
     console.log("managers table error:", errMan.message);
  } else {
     console.log("managers table EXISTS");
  }
}

check();
