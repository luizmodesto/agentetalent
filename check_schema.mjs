import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data: q } = await supabase.from('questions').select('*').limit(1);
  console.log('Questions:', q);

  const { data: e } = await supabase.from('events').select('*').limit(1);
  console.log('Events:', e);

  const { data: s } = await supabase.from('speakers').select('*').limit(1);
  console.log('Speakers:', s);
}

checkSchema();
