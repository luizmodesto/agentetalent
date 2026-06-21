import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const { eventId, speakerId, command, history = [] } = await request.json();

    if (!eventId || !command) {
      return NextResponse.json({ error: 'Faltam parâmetros obrigatórios.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key não configurada.' }, { status: 500 });
    }

    // 1. Coletar o contexto do banco de dados
    const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).single();
    let speakerBio = "";
    let speakerName = "";
    
    if (speakerId) {
      const { data: speakerData } = await supabase.from('speakers').select('*').eq('id', speakerId).single();
      if (speakerData) {
        speakerName = speakerData.name;
        speakerBio = speakerData.bio || "Nenhuma biografia fornecida.";
      }
    }

    // 1.5. Coletar Sessões Ativas do Evento
    const { data: sessions } = await supabase.from('sessions').select('id').eq('event_id', eventId);
    const sessionIds = sessions?.map(s => s.id) || [];

    // Coletar perguntas aprovadas associadas às sessões deste evento
    let questionsList = "Nenhuma pergunta no momento.";
    if (sessionIds.length > 0) {
      const { data: questions } = await supabase
        .from('questions')
        .select('id, content, author_name')
        .in('session_id', sessionIds)
        .eq('status', 'approved')
        .limit(10);
      
      questionsList = questions?.map((q, idx) => `[ID: ${q.id}] De ${q.author_name || 'Anônimo'}: ${q.content}`).join('\n') || "Nenhuma pergunta no momento.";
    }

    // Lógica do Idioma
    const isPT = eventData?.language === 'pt-PT';
    const languageInstruction = isPT 
      ? "Português de Portugal (EUROPEU). Utilize OBRIGATORIAMENTE vocabulário, gírias e sintaxe típicas de Portugal. Aja como um nativo de Portugal."
      : "Português do Brasil. Utilize vocabulário natural do Brasil.";

    // 2. Construir o Prompt do Cérebro (DIGITALENT)
    const systemPrompt = `Você é a "DIGITALENT", uma Apresentadora Autônoma e Co-Host de Eventos com inteligência artificial.

DIRETRIZES DE PERSONALIDADE:
- Tom de voz: Alterne entre formal e informal descontraído. Faça piadas respeitosas quando apropriado, traga energia e entusiasmo.
- Personalidade Customizada do Evento: ${eventData?.personality || "Profissional, acolhedor e dinâmico."}
- Idioma estrito: ${languageInstruction}
- Regras de Segurança: NUNCA repita palavrões, ofensas, tom de deboche ou piadas de mau gosto enviadas pela plateia. Filtre e seja ético.

O EVENTO: ${eventData?.title}
O PALESTRANTE ATUAL: ${speakerName || "Nenhum no momento."}
BIO DO PALESTRANTE: ${speakerBio}

FILA DE PERGUNTAS DA AUDIÊNCIA (Aprovadas):
${questionsList}

SEU PAPEL E FLUXO:
Você vai receber um comando de voz transcrito do moderador ou do palestrante (ex: "Digitalent, inicie", "Digitalent, vamos às perguntas", "Próxima"). 
Você deve analisar a situação e responder APENAS com o texto exato que você vai falar em voz alta no palco. NÃO mande ações entre asteriscos (ex: *sorri*), pois você é um sistema de áudio.

Exemplos de Ação:
- Se mandarem iniciar o palestrante: Faça uma apresentação ÉPICA e impactante usando a BIO do palestrante.
- Se o palestrante pedir perguntas: Selecione a melhor pergunta da fila, contextualize ela (adicione uma curiosidade ou dica rápida relacionada) e faça a pergunta ao palestrante de forma natural.
- Se mandarem chamar os formandos/alunos no final: Traga um tom de Storytelling muito forte, emocionante, e parabenize a todos.
- Responda perguntas naturais do palestrante de forma conversacional.

Responda agora ao comando do usuário:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: command }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const aiResponse = response.choices[0].message.content;

    // 3. Gerar Áudio com ElevenLabs se configurado
    let audioBase64 = null;
    try {
      if (eventData?.personality) {
        const config = JSON.parse(eventData.personality);
        if (config.elevenlabs_api_key && config.voice_id) {
          const elResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voice_id}`, {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': config.elevenlabs_api_key
            },
            body: JSON.stringify({
              text: aiResponse,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
              }
            })
          });

          if (elResponse.ok) {
            const arrayBuffer = await elResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            audioBase64 = buffer.toString('base64');
          } else {
            console.error("Erro ElevenLabs:", await elResponse.text());
          }
        }
      }
    } catch (e) {
      console.error("Falha ao gerar audio ElevenLabs", e);
    }

    return NextResponse.json({ reply: aiResponse, audioBase64 });

  } catch (error: any) {
    console.error('Erro na DIGITALENT:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
