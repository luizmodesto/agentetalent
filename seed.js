const fs = require('fs');

async function seed() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  console.log("Atualizando Evento Existente...");
  const eventId = "0e8c52f8-8435-4dda-9cfe-500bd5b9bd11";

  console.log("Criando Oradores...");
  const speakersData = [
    { name: 'Ana SEO', role: 'Especialista em SEO', bio: 'Focada em tráfego orgânico.' },
    { name: 'Beto Ads', role: 'Especialista em Tráfego Pago', bio: 'Mestre em Google Ads.' },
    { name: 'Carla Social', role: 'Social Media', bio: 'Criadora de comunidades.' },
    { name: 'Daniel Brand', role: 'Especialista em Branding', bio: 'Estrategista de marcas.' },
    { name: 'Eva Copy', role: 'Copywriter', bio: 'Transforma palavras em vendas.' },
    { name: 'Fábio Data', role: 'Análise de Dados', bio: 'Especialista em métricas.' }
  ];

  let speakers = [];
  for (let s of speakersData) {
    const res = await fetch(`${url}/rest/v1/speakers`, { method: 'POST', headers, body: JSON.stringify(s) });
    const data = await res.json();
    speakers.push(data[0]);
  }
  console.log("6 Oradores criados com sucesso.");

  console.log("Criando Perguntas...");
  const topics = [
    "Como otimizar meta tags de forma eficaz?", "Vale a pena investir em backlinks em 2026?", "Qual a densidade de palavras-chave ideal?", "O tempo de carregamento impacta o SEO?", "Pesquisa por voz afeta o SEO?",
    "Google Ads vs Facebook Ads?", "Qual o CPC médio na nossa indústria?", "Como diminuir o custo de aquisição?", "Remarketing funciona?", "Estratégia de ROAS vs CPA?",
    "TikTok ou Instagram Reels?", "Como ganhar engajamento organicamente?", "Horário de postagem importa?", "Influenciadores trazem retorno real?", "Como gerir crises nas redes sociais?",
    "Como repaginar a marca sem perder a identidade?", "O que é brand equity?", "Cores e psicologia nas vendas?", "Branding para PMEs?", "Como comunicar os valores da empresa?",
    "Gatilhos mentais funcionam?", "Copy curta vs Copy longa?", "Como escrever bons assuntos de email?", "Storytelling na página de vendas?", "Onde encontrar boas ideias para copy?",
    "Google Analytics 4 é melhor?", "Como medir a taxa de rejeição corretamente?", "O que é LTV e como calcular?", "Dashboards em tempo real valem a pena?", "Como tratar dados sujos?"
  ];

  let questions = [];
  for (let i = 0; i < topics.length; i++) {
    questions.push({
      content: topics[i],
      author_name: `Participante ${i+1}`,
      status: 'pending'
    });
  }

  const qRes = await fetch(`${url}/rest/v1/questions`, { method: 'POST', headers, body: JSON.stringify(questions) });
  if(qRes.ok) console.log("30 Perguntas criadas com sucesso na base de dados.");
  else console.error("Erro nas perguntas:", await qRes.text());

  console.log("Atualizando Configuração do Evento (Patrocinadores, Slides e Controlo de Voz)...");
  
  const sponsors = [
    "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
    "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
  ];

  const slideDecks = {};
  speakers.forEach((sp, i) => {
    slideDecks[sp.id] = [
      `https://placehold.co/1280x720/111111/FFF?text=Slide+1+-+${encodeURIComponent(sp.name)}`,
      `https://placehold.co/1280x720/333333/FFF?text=Slide+2+-+${encodeURIComponent(sp.name)}`,
      `https://placehold.co/1280x720/555555/FFF?text=Slide+3+-+${encodeURIComponent(sp.name)}`
    ];
  });

  const evRes = await fetch(`${url}/rest/v1/events?id=eq.${eventId}&select=personality`, { method: 'GET', headers: { ...headers, 'Prefer': '' } });
  let existingConfig = {};
  try { existingConfig = JSON.parse((await evRes.json())[0].personality); } catch(e) {}

  const personality = {
    ...existingConfig,
    sponsors: sponsors,
    slide_decks: slideDecks,
    active_speaker_id: speakers[0].id,
    current_slide_index: 0,
    voice_commands: {
      next: "próxima página",
      prev: "retorna"
    }
  };

  const updateRes = await fetch(`${url}/rest/v1/events?id=eq.${eventId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ personality: JSON.stringify(personality) })
  });

  if (updateRes.ok) console.log(`Evento configurado com sucesso! Já pode ver no Painel o evento ID: ${eventId}`);
  else console.error("Erro ao atualizar evento:", await updateRes.text());

}

seed();
