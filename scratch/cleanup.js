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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const fakeNames = [
  "Alexandre Silva",
  "Carolina Mendes",
  "Ricardo Gomes",
  "Sofia Costa",
  "Bruno Almeida",
  "Inês Ribeiro"
];

async function cleanup() {
  console.log("A limpar oradores duplicados...");

  const { data: events } = await supabase.from('events').select('id').order('created_at', { ascending: false }).limit(1);
  if (!events || events.length === 0) return;
  const eventId = events[0].id;

  // Find all speakers with fake names
  const { data: speakers } = await supabase.from('speakers').select('*').in('name', fakeNames);
  
  if (!speakers || speakers.length === 0) {
    console.log("Nenhum orador fake encontrado.");
    return;
  }

  // Keep the most recently created one for each name (the one that succeeded with sessions)
  // or the one that is actually referenced in sessions.
  const { data: sessions } = await supabase.from('sessions').select('speaker_id').eq('event_id', eventId);
  const sessionSpeakerIds = sessions ? sessions.map(s => s.speaker_id) : [];

  const toDelete = [];

  const grouped = {};
  speakers.forEach(s => {
    if (!grouped[s.name]) grouped[s.name] = [];
    grouped[s.name].push(s);
  });

  for (const name in grouped) {
    const list = grouped[name];
    if (list.length > 1) {
      // Find the one that is in sessions
      const hasSession = list.find(s => sessionSpeakerIds.includes(s.id));
      const keepId = hasSession ? hasSession.id : list[list.length - 1].id;
      
      list.forEach(s => {
        if (s.id !== keepId) {
          toDelete.push(s.id);
        }
      });
    }
  }

  if (toDelete.length > 0) {
    console.log(`A apagar ${toDelete.length} oradores duplicados...`);
    const { error } = await supabase.from('speakers').delete().in('id', toDelete);
    if (error) {
      console.error("Erro ao apagar:", error);
    } else {
      console.log("Oradores duplicados apagados com sucesso!");
    }
  } else {
    console.log("Não foram encontrados duplicados exatos para apagar.");
  }
}

cleanup();
