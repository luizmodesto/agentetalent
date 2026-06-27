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
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const speakersData = [
  {
    name: "Alexandre Silva",
    role: "Especialista em SEO e Tráfego Orgânico",
    bio: "Mais de 10 anos de experiência em otimização de motores de busca. Já liderou estratégias de SEO técnico para as maiores plataformas de e-commerce da Europa, aumentando o tráfego orgânico em mais de 300%. Especialista em Core Web Vitals e arquitetura de dados."
  },
  {
    name: "Carolina Mendes",
    role: "Growth Hacker & Tráfego Pago",
    bio: "Focada em aquisição de utilizadores em escala. Gere orçamentos de milhões em Meta Ads e Google Ads. Criadora do framework 'Scale-Up Fast' utilizado por unicórnios tecnológicos para reduzir o CAC em 40% durante rondas de investimento."
  },
  {
    name: "Ricardo Gomes",
    role: "Copywriter & Estrategista de Conteúdo",
    bio: "Mestre na arte da persuasão digital. Os seus funis de e-mail e páginas de vendas já geraram mais de 50 milhões de euros em receitas. Autor do best-seller 'Palavras que Convertem' e consultor de neuromarketing."
  },
  {
    name: "Sofia Costa",
    role: "Gestão de Comunidades e Redes Sociais",
    bio: "Especialista em construir tribos digitais. Transformou marcas desconhecidas em movimentos virais no TikTok e Instagram. Vencedora do prémio 'Melhor Campanha Orgânica 2025' com foco em User-Generated Content (UGC)."
  },
  {
    name: "Bruno Almeida",
    role: "Analista de Dados & BI em Marketing",
    bio: "O homem dos números. Ajuda empresas a tomar decisões baseadas em dados através de dashboards complexos no Looker Studio e Google Analytics 4. Especialista em atribuição multitouch e modelagem preditiva de LTV."
  },
  {
    name: "Inês Ribeiro",
    role: "Estrategista de Inbound & Automação",
    bio: "Especialista em funis complexos no HubSpot e ActiveCampaign. Cria jornadas de cliente altamente personalizadas que nutrem leads de forma invisível. Já automatizou mais de 10.000 fluxos de trabalho B2B."
  }
];

const questionTemplates = [
  "Como vês o impacto da Inteligência Artificial no {topic} nos próximos 2 anos?",
  "Qual é o maior erro que os iniciantes cometem no {topic}?",
  "Podes partilhar uma ferramenta secreta que usas diariamente para {topic}?",
  "Como convences o cliente de que investir em {topic} traz retorno imediato?",
  "O que mudou na tua estratégia de {topic} após as recentes atualizações do Google?",
  "Qual foi a campanha mais desafiante que tiveste de resolver em {topic}?",
  "Que métrica consideras ser a mais 'vaidosa' e inútil no {topic}?",
  "Qual é o livro obrigatório para quem quer dominar {topic}?"
];

const participantNames = [
  "João Neves", "Maria Santos", "Pedro Costa", "Ana Ferreira", "Tiago Martins",
  "Catarina Lima", "Rui Sousa", "Beatriz Carvalho", "Diogo Fernandes", "Inês Pereira",
  "Miguel Almeida", "Sofia Rodrigues", "André Ribeiro", "Rita Oliveira", "Nuno Mendes",
  "Marta Silva", "Hugo Gomes", "Joana Machado", "Bruno Pinto", "Diana Teixeira",
  "Carlos Duarte", "Filipa Borges", "Luís Fonseca", "Sara Vieira", "Daniel Marques",
  "Teresa Correia", "Vasco Pires", "Patrícia Lopes", "Gonçalo Tavares", "Mariana Batista",
  "Eduardo Rocha", "Helena Morais", "Tomás Mendes", "Daniela Barbosa", "Francisco Cruz",
  "Cátia Ramos", "Leonardo Pinto", "Juliana Neves", "Rafael Pinho", "Cláudia Monteiro",
  "Marco Freitas", "Tatiana Leite", "Fábio Coelho", "Liliana Moura", "Sérgio Azevedo",
  "Bárbara Faria", "Rodrigo Nogueira", "Margarida Antunes", "David Matos", "Raquel Soares"
];

async function seed() {
  console.log("Iniciando simulação de dados...");

  // 1. Get the most recent event
  const { data: events, error: evErr } = await supabase.from('events').select('id').order('created_at', { ascending: false }).limit(1);
  if (evErr || !events || events.length === 0) {
    console.error("Nenhum evento encontrado para popular!");
    return;
  }
  const eventId = events[0].id;
  console.log(`Evento selecionado: ${eventId}`);

  // 2. Insert Speakers
  console.log("A criar 6 palestrantes...");
  const speakersToInsert = speakersData; // They don't have event_id
  const { data: insertedSpeakers, error: spkErr } = await supabase.from('speakers').insert(speakersToInsert).select();
  
  if (spkErr || !insertedSpeakers) {
    console.error("Erro ao inserir palestrantes:", spkErr);
    return;
  }

  // 3. Create Sessions for each speaker
  console.log("A criar sessões para cada palestrante...");
  const sessionsToInsert = insertedSpeakers.map(s => ({
    event_id: eventId,
    speaker_id: s.id,
    title: `Palestra de ${s.name}`
  }));
  const { data: insertedSessions, error: sessErr } = await supabase.from('sessions').insert(sessionsToInsert).select();

  if (sessErr || !insertedSessions) {
    console.error("Erro ao inserir sessões:", sessErr);
    return;
  }

  // Set the first session as active in the event config (simulate admin panel action)
  const firstSession = insertedSessions[0];
  const { data: evData } = await supabase.from('events').select('personality').eq('id', eventId).single();
  let conf = {};
  if (evData && evData.personality) {
     try { conf = JSON.parse(evData.personality); } catch(e) {}
  }
  conf.active_speaker_id = firstSession.speaker_id;
  await supabase.from('events').update({ personality: JSON.stringify(conf) }).eq('id', eventId);
  console.log(`Palestrante ${insertedSpeakers[0].name} definido como ATIVO no painel principal.`);

  // 4. Generate 50 questions
  console.log("A gerar 50 perguntas simuladas vindas do público...");
  const questionsToInsert = [];
  
  for (let i = 0; i < 50; i++) {
    // Pick random speaker/session
    const randomSession = insertedSessions[Math.floor(Math.random() * insertedSessions.length)];
    const relatedSpeaker = insertedSpeakers.find(s => s.id === randomSession.speaker_id);
    
    // Pick random participant
    const author = participantNames[i];
    
    // Pick random template and fill topic
    const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
    
    // Extract a short topic from the speaker's role for the question
    const topic = relatedSpeaker.role.split('&')[0].split(' e ')[0].toLowerCase().trim();
    const content = template.replace('{topic}', topic);

    questionsToInsert.push({
      session_id: randomSession.id,
      content: content,
      author_name: author,
      status: 'pending' // pending so it shows up in the admin "Fila de Espera"
    });
  }

  const { error: qErr } = await supabase.from('questions').insert(questionsToInsert);
  if (qErr) {
    console.error("Erro ao inserir perguntas:", qErr);
    return;
  }

  console.log("✅ Simulação concluída com sucesso!");
  console.log("Foram criados 6 palestrantes e 50 perguntas.");
}

seed();
