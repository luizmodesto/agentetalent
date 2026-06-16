import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Inicializa os clientes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
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
      .limit(50);

    if (fetchError) throw fetchError;

    if (!toProcess || toProcess.length === 0) {
      return NextResponse.json({ message: 'Nenhuma pergunta pendente no momento.' });
    }

    idsToProcess = toProcess.map(q => q.id);

    const { data: questions, error: lockError } = await supabase
      .from('questions')
      .update({ status: 'processing' })
      .in('id', idsToProcess)
      .eq('status', 'pending') 
      .select('id, content, session_id');

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
      
      const inputForAI = sessionQuestions.map((q) => `ID: ${q.id} | Pergunta: ${q.content}`).join('\n');

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é o 'Talent Brain', uma IA diretora de eventos ao vivo. Sua missão é ler as perguntas enviadas pela audiência e:
1. Rejeitar mensagens de spam, sem sentido, ou ofensivas.
2. Agrupar perguntas semelhantes ou com a mesma intenção em 'clusters'.
3. Para cada cluster, reescrever a pergunta final de forma clara, profissional e impactante para ser lida por um palestrante.`
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
                clusters: {
                  type: "array",
                  description: "Grupos de perguntas válidas.",
                  items: {
                    type: "object",
                    properties: {
                      original_ids: { type: "array", items: { type: "string" } },
                      refined_question: { type: "string" }
                    },
                    required: ["original_ids", "refined_question"],
                    additionalProperties: false
                  }
                }
              },
              required: ["rejected_ids", "clusters"],
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

      for (const cluster of aiResult.clusters) {
        if (cluster.original_ids.length === 0) continue;

        const { data: newQuestion, error: insertError } = await supabase
          .from('questions')
          .insert({
            session_id: sessionId,
            content: cluster.refined_question,
            author_name: 'Talent Brain',
            status: 'approved',
            ai_score: cluster.original_ids.length
          })
          .select('id')
          .single();

        if (!insertError) {
          await supabase
            .from('questions')
            .update({ status: 'processed', parent_id: newQuestion.id })
            .in('id', cluster.original_ids);
        } else {
           await supabase.from('questions').update({ status: 'rejected' }).in('id', cluster.original_ids);
        }
      }
      
      finalResult.push({ sessionId, processedCount: sessionQuestions.length, clustersGenerated: aiResult.clusters.length });
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
