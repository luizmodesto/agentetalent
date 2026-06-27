import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const runtime = 'edge';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co');
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder');
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

export async function POST(request: Request) {
  try {
    const { eventId, speakerId, command, history = [] } = await request.json();

    if (!eventId || !command) {
      return NextResponse.json({ error: 'Faltam parÃ¢metros obrigatÃ³rios.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key nÃ£o configurada.' }, { status: 500 });
    }

    // 1. Coletar o contexto do banco de dados (Paralelizado para Velocidade)
    const [eventRes, speakerRes, sessionsRes] = await Promise.all([
      supabase.from('events').select('*, voice_settings').eq('id', eventId).single(),
      speakerId ? supabase.from('speakers').select('*').eq('id', speakerId).single() : Promise.resolve({ data: null }),
      supabase.from('sessions').select('id').eq('event_id', eventId)
    ]);

    const eventData = eventRes.data;
    let speakerBio = "";
    let speakerName = "";
    
    if (speakerRes.data) {
      speakerName = speakerRes.data.name;
      speakerBio = speakerRes.data.bio || "Nenhuma biografia fornecida.";
    }

    const sessionIds = sessionsRes.data?.map(s => s.id) || [];

    // Coletar perguntas associadas Ã s sessÃµes deste evento (ou globais para simulaÃ§Ã£o)
    let questionsList = "Nenhuma pergunta no momento.";
    let query = supabase.from('questions').select('id, content, author_name, context, suggested_answer, transition').limit(30);
    
    if (sessionIds.length > 0) {
      query = query.in('session_id', sessionIds);
    }
    
    // Buscar tanto approved como pending para garantir que a simulaÃ§Ã£o recebe as perguntas inseridas
    query = query.in('status', ['approved', 'pending']);
    
    const { data: questions } = await query;
    if (questions && questions.length > 0) {
      questionsList = questions.map(q => {
        let str = `[ID: ${q.id}] De ${q.author_name || 'AnÃ´nimo'}: ${q.content}`;
        if (q.transition) str += `\n  (Usa esta frase para introduzir a pergunta de forma natural: "${q.transition}")`;
        if (q.suggested_answer) str += `\n  (Dica de resposta sugerida para o palestrante: "${q.suggested_answer}")`;
        return str;
      }).join('\n\n');
    }

    // LÃ³gica do Idioma
    let languageInstruction = "";
    if (eventData?.language === 'en-US') {
      languageInstruction = "Your response language must be strictly American English (en-US). Use an engaging, high-energy stage-presence vocabulary suitable for a premium tech and marketing event. Match the tone selected by the user (Corporate, Energetic, or Casual).";
    } else if (eventData?.language === 'pt-BR') {
      languageInstruction = "O seu idioma de resposta Ã© o PortuguÃªs do Brasil. Utilize vocabulÃ¡rio natural do Brasil, adequando a um evento de tecnologia/marketing de alto nÃ­vel.";
    } else {
      languageInstruction = "O seu idioma de saÃ­da Ã© estritamente o PortuguÃªs de Portugal (PT-PT). Ã‰ expressamente proibido o uso de gerÃºndios (use sempre a estrutura 'estou a apresentar', 'estou a falar'). Utilize vocabulÃ¡rio estritamente europeu: 'ecrÃ£', 'oradores', 'equipas', 'painel', 'reunir'. A estrutura do texto deve forÃ§ar o modelo de TTS da OpenAI a adotar a fonÃ©tica de Portugal.";
    }

    // ModulaÃ§Ã£o Vocal AvanÃ§ada (OpenAI Prompt Engineering)
    let advancedVocalPrompt = "";
    
    // Prioriza voice_settings, fallback para personality
    let personalityObj: any = eventData?.voice_settings || {};
    if (Object.keys(personalityObj).length === 0 && eventData?.personality) {
      try { personalityObj = JSON.parse(eventData.personality); } catch (e) {}
    }
    
    let customPromptText = personalityObj?.custom_prompt || "Profissional, acolhedor e dinÃ¢mico.";
    if (!personalityObj?.custom_prompt && personalityObj?.tts_provider) {
       customPromptText = "Profissional, acolhedor e dinÃ¢mico.";
    }

    if (personalityObj.tts_provider === "openai") {
      const tone = personalityObj.openai_tone || "Corporativo Premium";
      const rhythm = personalityObj.openai_rhythm || "Cadenciado com Pausas (Formal)";
      const storytelling = personalityObj.openai_storytelling || 5;

      let toneInstruction = "Mantenha um tom corporativo, elegante e de alta qualidade (Premium).";
      if (tone === "EnergÃ©tico de Palco") toneInstruction = "Seja extremamente vibrante, elÃ©trico e entusiÃ¡stico, como um grande apresentador num palco Ã©pico. Use exclamaÃ§Ãµes fortes para escalar a emoÃ§Ã£o!";
      else if (tone === "DescontraÃ­do/Interativo") toneInstruction = "Seja muito leve, use um tom conversacional moderno, humor inteligente e seja incrivelmente prÃ³ximo da audiÃªncia.";

      let rhythmInstruction = "Fale num ritmo padrÃ£o e moderado.";
      if (rhythm === "Cadenciado com Pausas (Formal)") rhythmInstruction = "Utilize reticÃªncias (...) sistematicamente para forÃ§ar pausas dramÃ¡ticas. O texto deve respirar e dar um peso monumental a cada palavra chave.";
      else if (rhythm === "Fluido e RÃ¡pido (DinÃ¢mico)") rhythmInstruction = "Use frases curtas, diretas e contÃ­nuas. Evite reticÃªncias. O ritmo deve ser muito rÃ¡pido, empolgante e focado na aÃ§Ã£o imediata.";

      let storyInstruction = "Linguagem equilibrada.";
      if (storytelling >= 8) storyInstruction = "NÃVEL MÃXIMO DE STORYTELLING: Use metÃ¡foras ricas, adjetivos Ã©picos e construa uma narrativa fortemente emocional e heroica.";
      else if (storytelling <= 3) storyInstruction = "Seja estritamente direto, altamente informativo, limpo e sem floreados literÃ¡rios.";

      advancedVocalPrompt = `
--- DIRETRIZES DE MODULAÃ‡ÃƒO VOCAL EXTREMA (P/ O TTS) ---
(Aplique as regras abaixo na sua escrita, pois a pontuaÃ§Ã£o controla a voz do sintetizador)
- TOM: ${toneInstruction}
- RITMO (PONTUAÃ‡ÃƒO): ${rhythmInstruction}
- NÃVEL DE STORYTELLING: ${storyInstruction}
--------------------------------------------------------`;
    }

    // 2. Construir o Prompt do CÃ©rebro (DIGITALENT)
    const systemPrompt = `VocÃª Ã© a "DIGITALENT", uma Apresentadora AutÃ´noma e Co-Host de Eventos com inteligÃªncia artificial.

DIRETRIZES DE PERSONALIDADE:
- Tom de voz: Alterne entre formal e informal descontraÃ­do. FaÃ§a piadas respeitosas quando apropriado, traga energia e entusiasmo.
- Personalidade Customizada do Evento: ${customPromptText}
- Idioma estrito: ${languageInstruction}
- Regras de SeguranÃ§a: NUNCA repita palavrÃµes, ofensas, tom de deboche ou piadas de mau gosto enviadas pela plateia. Filtre e seja Ã©tico.
${advancedVocalPrompt}


O EVENTO: ${eventData?.title}
O PALESTRANTE ATUAL: ${speakerName || "Nenhum no momento."}
BIO DO PALESTRANTE: ${speakerBio}

FILA DE PERGUNTAS DA AUDIÃŠNCIA (Aprovadas):
${questionsList}

SEU PAPEL E FLUXO:
VocÃª vai receber um comando de voz transcrito do moderador ou do palestrante (ex: "Digitalent, inicie", "Digitalent, vamos Ã s perguntas", "PrÃ³xima"). 
VocÃª deve analisar a situaÃ§Ã£o e responder APENAS com o texto exato que vocÃª vai falar em voz alta no palco. NÃƒO mande aÃ§Ãµes entre asteriscos (ex: *sorri*), pois vocÃª Ã© um sistema de Ã¡udio.

Exemplos de AÃ§Ã£o:
- Se mandarem iniciar o palestrante: FaÃ§a uma apresentaÃ§Ã£o Ã‰PICA e impactante usando a BIO do palestrante.
- Se o palestrante pedir perguntas: Selecione a melhor pergunta da fila, utilize a frase de transiÃ§Ã£o sugerida (se houver) para introduzir a pergunta de forma natural, faÃ§a a pergunta, e inclua a dica de resposta sugerida para ajudar o palestrante.
- Se mandarem chamar os formandos/alunos no final: Traga um tom de Storytelling muito forte, emocionante, e parabenize a todos.
- Responda perguntas naturais do palestrante de forma conversacional.

Responda agora ao comando do usuÃ¡rio:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Mudamos para mini para velocidade ultra-rÃ¡pida no palco
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: command }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const aiResponse = response.choices[0].message.content;

    // 3. Gerar Ãudio com o Provedor Configurado
    let audioBase64 = null;
    try {
      if (Object.keys(personalityObj).length > 0) {
        const config = personalityObj;
        const provider = config.tts_provider || "elevenlabs"; // default if missing
        
        if (provider === "fishaudio" && config.fish_api_key) {
          const fishResponse = await fetch(`https://api.fish.audio/v1/tts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.fish_api_key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: aiResponse,
              format: 'mp3',
              reference_id: config.fish_reference_id || undefined
            })
          });

          if (fishResponse.ok) {
            const arrayBuffer = await fishResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            audioBase64 = buffer.toString('base64');
          } else {
            console.error("Erro Fish Audio:", await fishResponse.text());
          }
        } 
        else if (provider === "elevenlabs" && config.elevenlabs_api_key && config.voice_id) {
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
        else if (provider === "openai") {
          const openAiKey = process.env.OPENAI_API_KEY;
          if (openAiKey) {
            const oaResponse = await fetch(`https://api.openai.com/v1/audio/speech`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: "tts-1",
                voice: config.openai_voice || "onyx",
                input: aiResponse,
                speed: config.speed || 1.0
              })
            });

            if (oaResponse.ok) {
              const arrayBuffer = await oaResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              audioBase64 = buffer.toString('base64');
            } else {
              console.error("Erro OpenAI TTS:", await oaResponse.text());
            }
          } else {
             console.error("Erro: OPENAI_API_KEY nÃ£o definida no servidor.");
          }
        }
      }
    } catch (e) {
      console.error("Falha ao gerar audio TTS:", e);
    }

    return NextResponse.json({ reply: aiResponse, audioBase64 });

  } catch (error: any) {
    console.error('Erro na DIGITALENT:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
