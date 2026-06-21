import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkSchema() {
  console.log("Checking events...");
  const { data: events, error: eError } = await supabase.from('events').select('*').limit(1);
  if (eError) console.error("Events error:", eError);
  else console.log("Events columns:", events?.length ? Object.keys(events[0]) : "No data, but table exists.");

  console.log("\nChecking speakers...");
  const { data: speakers, error: sError } = await supabase.from('speakers').select('*').limit(1);
  if (sError) console.error("Speakers error:", sError);
  else console.log("Speakers columns:", speakers?.length ? Object.keys(speakers[0]) : "No data, but table exists.");

  console.log("\nChecking questions...");
  const { data: questions, error: qError } = await supabase.from('questions').select('*').limit(1);
  if (qError) console.error("Questions error:", qError);
  else console.log("Questions columns:", questions?.length ? Object.keys(questions[0]) : "No data, but table exists.");
}

checkSchema();
