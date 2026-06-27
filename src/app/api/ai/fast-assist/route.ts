import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Configurando o edge runtime para latÃªncia mÃ­nima e velocidade extrema
export const runtime = 'edge';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co');
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder');
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

export async function POST(request: Request) {
  try {
    const { question, eventId } = await request.json();

    if (!question) {
      return NextResponse.json({ error: 'Pergunta obrigatÃ³ria.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key nÃ£o configurada.' }, { status: 500 });
    }

    let languageRule = "* O seu idioma de saÃ­da Ã© estritamente o PortuguÃªs de Portugal (PT-PT). Ã‰ expressamente proibido o uso de gerÃºndios (use sempre a estrutura 'estou a apresentar', 'estou a falar'). Utilize vocabulÃ¡rio estritamente europeu: 'ecrÃ£', 'oradores', 'equipas', 'painel', 'reunir'. A estrutura do texto deve forÃ§ar o modelo de TTS da OpenAI a adotar a fonÃ©tica de Portugal.";
    let eventName = "Digitalentâ€™26 em Portugal";

    if (eventId) {
      const { data: eventData } = await supabase.from('events').select('title, language, voice_settings').eq('id', eventId).single();
      if (eventData) {
        if (eventData.title) eventName = eventData.title;
        
        if (eventData.language === 'en-US') {
           languageRule = "* Your response language must be strictly American English (en-US). Use an engaging, high-energy vocabulary suitable for a premium event.";
        } else if (eventData.language === 'pt-BR') {
           languageRule = "* O seu idioma de resposta Ã© o PortuguÃªs do Brasil. Utilize vocabulÃ¡rio natural do Brasil, adequando a um evento de tecnologia/marketing.";
        }
      }
    }

    const systemPrompt = `VocÃª atua como a inteligÃªncia por trÃ¡s do AGENTE TALENT, mediador profissional no evento ${eventName}.
Seu objetivo Ã© processar perguntas da plateia instantaneamente.
Aja muito rÃ¡pido. Priorize velocidade sobre profundidade.

TAREFAS:
1. Limpe e melhore a pergunta original.
2. Reescreva de forma clara e profissional.
3. Gere uma sugestÃ£o de resposta curta (mÃ¡ximo 2 a 3 frases curtas).
4. Gere uma frase natural para o orador iniciar a resposta (ex: "Excelente pergunta. Acredito que...").

REGRAS:
${languageRule}
* Retorne APENAS o JSON no formato estrito abaixo.
* NÃ£o adicione textos explicativos antes ou depois do JSON.

FORMATO DE SAÃDA (JSON):
{
  "refined_question": "...",
  "short_answer": "...",
  "speaker_start": "..."
}`;

    // Usamos gpt-4o-mini por ser incrivelmente rÃ¡pido e eficiente para tarefas curtas como esta
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Pergunta crua: "${question}"` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 300,
    });

    const aiResponse = response.choices[0].message.content;

    if (!aiResponse) {
      return NextResponse.json({ error: 'Falha ao processar resposta da IA.' }, { status: 500 });
    }

    const jsonResult = JSON.parse(aiResponse);

    return NextResponse.json(jsonResult);

  } catch (error: any) {
    console.error('Erro no Fast AI Endpoint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
