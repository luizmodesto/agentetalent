const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const names = ["Ana", "Bruno", "Carlos", "Diana", "Eduardo", "Filipa", "Gonçalo", "Helena", "Inês", "João", "Leonor", "Miguel", "Nuno", "Olívia", "Pedro", "Rita", "Sofia", "Tiago", "Vasco", "Zita"];
const questions = [
  "Qual é o maior desafio na sua área atualmente?",
  "Pode dar um exemplo prático de como isso funciona no dia a dia?",
  "Como vê o futuro do mercado de trabalho com a inteligência artificial?",
  "Existe algum risco associado a essa tecnologia?",
  "Muito mau evento, estou a odiar tudo. Não concordo com nada do que disse.", // Ofensivo / Negativo
  "Como podemos aplicar estes conhecimentos na nossa empresa?",
  "Onde posso encontrar mais informação sobre este tema?",
  "Qual foi o erro que mais o ajudou a crescer profissionalmente?",
  "Pode recomendar algum livro sobre o assunto?",
  "Que conselho daria a alguém que está a começar agora?",
  "Como é que isto se compara com as soluções antigas?",
  "Qual é a sua opinião sobre o impacto disso na educação?",
  "Eu acho que a IA vai roubar os nossos trabalhos todos, o que me diz disso?",
  "Como lidou com o fracasso na sua carreira?",
  "Esta palestra está muito aborrecida.", // Off-topic / irrelevante
  "Como a inovação tecnológica pode ajudar empresas mais pequenas?",
  "Quais são os principais mitos sobre essa área?",
  "O orador está a falar muito rápido...", // Off-topic
  "Que ferramentas utiliza diariamente no seu trabalho?",
  "Como manter a equipa motivada perante tantas mudanças?",
  "Qual foi o projeto mais desafiador em que já trabalhou?",
  "Acha que a regulamentação é suficiente neste momento?",
  "Como os jovens se podem preparar para as profissões do futuro?",
  "Quais os erros mais comuns que as empresas cometem ao adotar essa estratégia?",
  "Como mede o sucesso dessa implementação?",
  "Qual a diferença entre a sua abordagem e a dos concorrentes?",
  "Esta ideia é um bocado parva, não acha?", // Negativo
  "Pode partilhar um case de estudo de sucesso?",
  "Quais são as tendências para o próximo ano?",
  "Como garantir a segurança dos dados nesse cenário?"
];

async function seed() {
  // Fetch an active session
  const { data: sessions, error: sessionError } = await supabase.from('sessions').select('id, event_id').eq('status', 'live').limit(1);
  
  let sessionId = null;
  let eventId = null;

  if (sessions && sessions.length > 0) {
    sessionId = sessions[0].id;
    eventId = sessions[0].event_id;
    console.log("Sessão 'live' encontrada:", sessionId);
  } else {
    const { data: anySession } = await supabase.from('sessions').select('id, event_id').limit(1);
    if (anySession && anySession.length > 0) {
      sessionId = anySession[0].id;
      eventId = anySession[0].event_id;
      console.log("Usando uma sessão qualquer encontrada:", sessionId);
    } else {
      console.log("Nenhuma sessão encontrada na base de dados.");
      return;
    }
  }

  const inserts = [];
  for (let i = 0; i < 30; i++) {
    const randomName = names[Math.floor(Math.random() * names.length)] + " " + names[Math.floor(Math.random() * names.length)];
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    inserts.push({
      session_id: sessionId,
      author_name: randomName,
      content: randomQuestion,
      status: 'pending' // pendente para a IA processar
    });
  }

  const { data, error } = await supabase.from('questions').insert(inserts);
  
  if (error) {
    console.error("Erro ao inserir perguntas:", error);
  } else {
    console.log("30 perguntas inseridas com sucesso!");
  }
}

seed();
