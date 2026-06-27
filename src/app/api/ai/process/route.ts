import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

export async function GET(request: Request) {
  return processAI();
}

export async function POST(request: Request) {
  return processAI();
}

async function processAI() {
  let idsToProcess: string[] = [];

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key não configurada.' }, { status: 500 });
    }

    const { data: toProcess, error: fetchError } = await supabase
      .from('questions')
      .select('id')
      .eq('status', 'pending')
      .limit(20);

    if (fetchError) throw fetchError;

    if (!toProcess || toProcess.length < 5) {
      return NextResponse.json({ message: 'Menos de 5 perguntas pendentes, aguardando lote maior para otimizar custos.' });
    }

    idsToProcess = toProcess.map(q => q.id);

    const { data: questions, error: lockError } = await supabase
      .from('questions')
      .update({ status: 'processing' })
      .in('id', idsToProcess)
      .eq('status', 'pending') 
      .select('id, content, session_id, author_name');

    if (lockError) throw lockError;

    if (!questions || questions.length === 0) {
      return NextResponse.json({ message: 'Perguntas já foram capturadas por outra execução.' });
    }

    const sessionMap = new Map<string, typeof questions>();
    questions.forEach(q => {
      if (!sessionMap.has(q.session_id)) sessionMap.set(q.session_id, []);
      sessionMap.get(q.session_id)!.push(q);
    });

    const finalResult = [];

    for (const [sessionId, sessionQuestions] of sessionMap.entries()) {
      let personality = "";
      let language = "pt-BR";
      
      const { data: sessionData } = await supabase.from('sessions').select('event_id').eq('id', sessionId).single();
      if (sessionData && sessionData.event_id) {
        const { data: eventData } = await supabase.from('events').select('personality, language').eq('id', sessionData.event_id).single();
        if (eventData) {
          personality = eventData.personality || "";
          language = eventData.language || "pt-BR";
        }
      }
      
      const inputForAI = sessionQuestions.map((q) => `ID:${q.id}|${q.author_name ? 'De:' + q.author_name + '|' : ''}Q:${q.content}`).join('\n');

      let languageInstruction = "Português do Brasil";
      if (language === "pt-PT") {
        languageInstruction = "Português de Portugal (EUROPEU). Utilize OBRIGATORIAMENTE vocabulário, gírias e sintaxe típicas de Portugal (ex: 'a falar' em vez de 'falando', 'ecrã', 'telemóvel'). Aja como um nativo de Portugal.";
      } else {
        languageInstruction = "Português do Brasil. Utilize vocabulário natural do Brasil.";
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1000,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `Você é o 'Talent Brain', uma IA diretora de eventos ao vivo e co-host. Sua missão é ler as perguntas enviadas pela audiência e:
1. Rejeitar mensagens de spam, sem sentido, ou ofensivas.
2. Agrupar perguntas semelhantes em 'clusters'.
3. Para cada cluster aprovado, você deve gerar:
   - A pergunta refinada (clara, profissional e impactante).
   - Um contexto breve explicando por que a pergunta é relevante para o tema.
   - Uma sugestão de resposta clara e concisa (máx 3-5 frases).
   - Uma frase de transição natural para o palestrante falar antes de responder.
Regras: 
- Mantenha o tom e o idioma da resposta rigidamente como: ${languageInstruction}
- ${personality ? 'Personalidade obrigatória: ' + personality : 'Mantenha um tom profissional e natural.'}
- Evite respostas genéricas e seja conciso.`
          },
          {
            role: "user",
            content: `Analise as seguintes perguntas:\n\n${inputForAI}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "question_processing",
            strict: true,
            schema: {
              type: "object",
              properties: {
                rejected_ids: { type: "array", description: "IDs de spam.", items: { type: "string" } },
                approved: {
                  type: "array",
                  description: "Grupos de perguntas válidas processadas.",
                  items: {
                    type: "object",
                    properties: {
                      original_ids: { type: "array", items: { type: "string" } },
                      question: { type: "string" },
                      context: { type: "string" },
                      suggested_answer: { type: "string" },
                      transition: { type: "string" }
                    },
                    required: ["original_ids", "question", "context", "suggested_answer", "transition"],
                    additionalProperties: false
                  }
                }
              },
              required: ["rejected_ids", "approved"],
              additionalProperties: false
            }
          }
        }
      });

      const aiResult = JSON.parse(response.choices[0].message.content!);
      
      if (aiResult.rejected_ids.length > 0) {
        await supabase
          .from('questions')
          .update({ status: 'rejected' })
          .in('id', aiResult.rejected_ids);
      }

      for (const item of aiResult.approved) {
        if (item.original_ids.length === 0) continue;

        const { data: newQuestion, error: insertError } = await supabase
          .from('questions')
          .insert({
            session_id: sessionId,
            content: item.question,
            context: item.context,
            suggested_answer: item.suggested_answer,
            transition: item.transition,
            author_name: 'Talent Brain',
            status: 'approved',
            ai_score: item.original_ids.length
          })
          .select('id')
          .single();

        if (!insertError) {
          await supabase
            .from('questions')
            .update({ status: 'processed', parent_id: newQuestion.id })
            .in('id', item.original_ids);
        } else {
           await supabase.from('questions').update({ status: 'rejected' }).in('id', item.original_ids);
        }
      }
      
      finalResult.push({ sessionId, processedCount: sessionQuestions.length, clustersGenerated: aiResult.approved.length });
    }

    return NextResponse.json({ message: 'Processamento Batch concluído!', details: finalResult });

  } catch (error: any) {
    console.error("Erro na API de IA Batch:", error);
    
    // Libera o lock se deu algum erro na OpenAI ou no meio do processo!
    if (idsToProcess.length > 0) {
      console.log("Revertendo lock de", idsToProcess.length, "perguntas para 'pending' devido a erro.");
      await supabase
        .from('questions')
        .update({ status: 'pending' })
        .in('id', idsToProcess)
        .eq('status', 'processing');
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
