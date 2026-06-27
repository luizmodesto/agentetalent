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

const firstNames = [
  "Ana", "Bruno", "Carlos", "Diana", "Eduardo", "Filipa", "Gonçalo", "Helena", "Igor", "Joana",
  "Luís", "Marta", "Nuno", "Olívia", "Paulo", "Rita", "Sara", "Tiago", "Vera", "Xavier",
  "João", "Maria", "Pedro", "Catarina", "Rui", "Sofia", "Miguel", "Beatriz", "André", "Inês",
  "José", "Teresa", "António", "Mariana", "Francisco", "Carolina", "Manuel", "Laura", "Ricardo", "Mafalda",
  "Tomás", "Matilde", "Diogo", "Leonor", "Hugo", "Margarida", "Daniel", "Alice", "David", "Clara"
];

const lastNames = [
  "Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Jesus", "Sousa",
  "Fernandes", "Gomes", "Marques", "Almeida", "Ribeiro", "Pinto", "Carvalho", "Teixeira", "Moreira", "Correia",
  "Mendes", "Nunes", "Soares", "Vieira", "Monteiro", "Cardoso", "Rocha", "Raposo", "Neves", "Coelho",
  "Cruz", "Cunha", "Machado", "Lourenço", "Dias", "Castro", "Tavares", "Melo", "Fonseca", "Galo"
];

const companies = ["TechCorp", "InovaWeb", "MediaGlobal", "StartUp PT", "Marketing Pro", "SEO Masters", "DataInsights", "AdVision", "SocialBoost", "GrowthX", "Digitalent", "Agência Plus", "Creative Minds", "Future Ads", "E-com Solutions"];
const roles = ["Gestor de Marketing", "Especialista SEO", "Analista de Dados", "Copywriter", "Gestor de Redes Sociais", "Fundador", "CEO", "Diretor Criativo", "Designer", "Web Developer", "Estudante", "Gestor de Tráfego", "Community Manager", "Estrategista", "Consultor"];

const questionTemplates = [
  "Como vês o impacto da Inteligência Artificial nesta área específica nos próximos 5 anos?",
  "Qual foi o teu maior desafio ao implementar essa estratégia?",
  "Que ferramentas recomendas para quem está a começar?",
  "Como podemos medir o ROI desta abordagem de forma mais eficaz?",
  "Achaste que a adaptação do público foi fácil quando introduziste essa mudança?",
  "Podes dar um exemplo prático de uma campanha que correu mal e o que aprendeste?",
  "Qual é a métrica que consideras mais sobrevalorizada atualmente?",
  "Como equilibras a automação com o toque humano?",
  "Na tua opinião, qual é o erro mais comum que as empresas cometem?",
  "Tens alguma dica de produtividade para gerir tantas campanhas ao mesmo tempo?",
  "Qual o papel das comunidades fechadas face às redes sociais abertas?",
  "Como prevês que as políticas de privacidade afetem o nosso targeting futuro?",
  "Que conselho darias ao teu 'eu' de há 10 anos atrás?",
  "Qual a tua opinião sobre o declínio do alcance orgânico?",
  "Existem alternativas viáveis ao duopólio Google/Meta para o nosso mercado?",
  "Como adaptas esta estratégia para B2B vs B2C?",
  "Sentes que a criatividade está a ser substituída pela otimização de algoritmos?",
  "Como manténs a tua equipa atualizada com as constantes mudanças nas plataformas?",
  "Qual a melhor forma de educar o cliente sobre expectativas irrealistas?",
  "Que livro ou podcast mudou a tua forma de pensar sobre este tema?"
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log("A iniciar seed...");

  // 1. Get Event ID
  const { data: events, error: errEvents } = await supabase.from('events').select('id').limit(1);
  if (errEvents || !events.length) {
    console.error("Nenhum evento encontrado!");
    return;
  }
  const eventId = events[0].id;
  console.log("Evento ID:", eventId);

  // 2. Get Speakers and Sessions
  const { data: sessions, error: errSessions } = await supabase.from('sessions').select('id, speaker_id').eq('event_id', eventId);
  if (errSessions || !sessions.length) {
    console.error("Nenhuma sessão/orador encontrado!");
    return;
  }
  console.log(`Encontradas ${sessions.length} sessões ativas.`);

  // 3. Generate 50 Participants
  const newParticipants = [];
  for (let i = 0; i < 50; i++) {
    const name = `${getRandomItem(firstNames)} ${getRandomItem(lastNames)}`;
    newParticipants.push({
      event_id: eventId,
      name: name,
      email: `${name.toLowerCase().replace(/ /g, '.')}@exemplo.pt`,
      company: getRandomItem(companies),
      role: getRandomItem(roles),
      ticket_type: Math.random() > 0.8 ? "VIP" : "Normal"
    });
  }

  console.log("A inserir 50 participantes...");
  const { data: insertedParticipants, error: errPart } = await supabase.from('participants').insert(newParticipants).select();
  if (errPart) {
    console.error("Erro a inserir participantes:", errPart);
    return;
  }
  console.log("50 Participantes inseridos com sucesso!");

  // 4. Generate 3 questions for each participant
  const newQuestions = [];
  let questionCounter = 0;
  
  for (const part of insertedParticipants) {
    // 3 to 5 questions per participant
    const numQuestions = Math.floor(Math.random() * 3) + 3; 
    for (let i = 0; i < numQuestions; i++) {
      const session = getRandomItem(sessions);
      newQuestions.push({
        session_id: session.id,
        author_name: part.name,
        content: getRandomItem(questionTemplates),
        status: 'approved' // Pre-approved so they appear immediately in wordcloud/live!
      });
      questionCounter++;
    }
  }

  console.log(`A inserir ${questionCounter} perguntas...`);
  
  // Insert questions in batches of 50 to avoid any limits
  for (let i = 0; i < newQuestions.length; i += 50) {
    const batch = newQuestions.slice(i, i + 50);
    const { error: errQuest } = await supabase.from('questions').insert(batch);
    if (errQuest) {
       console.error("Erro ao inserir lote de perguntas:", errQuest);
    }
  }

  console.log("Seed concluído com sucesso! Pode verificar no painel.");
}

seed();
