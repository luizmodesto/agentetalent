import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Inicializa os clientes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Nota: Em um ambiente de produção rigoroso, idealmente usaríamos a SERVICE_ROLE_KEY 
// para bypass de RLS no backend, mas como o MVP liberou UPDATE anônimo, usaremos a anon key.
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function GET(request: Request) {
  // A Vercel Cron envia requisições GET por padrão. 
  // Redirecionamos para a mesma lógica do POST.
  return processAI();
}

export async function POST(request: Request) {
  return processAI();
}

async function processAI() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key não configurada.' }, { status: 500 });
    }

    // 1. Busca os IDs das próximas 50 perguntas pendentes (Batching Limitado)
    const { data: toProcess, error: fetchError } = await supabase
      .from('questions')
      .select('id')
      .eq('status', 'pending')
      .limit(50);

    if (fetchError) throw fetchError;

    if (!toProcess || toProcess.length === 0) {
      return NextResponse.json({ message: 'Nenhuma pergunta pendente no momento.' });
    }

    const idsToProcess = toProcess.map(q => q.id);

    // 2. BLOQUEIO ATÔMICO (Locking)
    // Atualizamos imediatamente para 'processing'. 
    // Só pegamos as que ainda estão 'pending', evitando Race Conditions com outra execução.
    const { data: questions, error: lockError } = await supabase
      .from('questions')
      .update({ status: 'processing' })
      .in('id', idsToProcess)
      .eq('status', 'pending') 
      .select('id, content, session_id');

    if (lockError) throw lockError;

    if (!questions || questions.length === 0) {
      return NextResponse.json({ message: 'Perguntas já foram capturadas por outra execução paralela.' });
    }

    // 3. Agrupamento Local por Sessão
    // Diferentes eventos podem estar acontecendo ao mesmo tempo, não queremos misturar as perguntas.
    const sessionMap = new Map<string, typeof questions>();
    questions.forEach(q => {
      if (!sessionMap.has(q.session_id)) sessionMap.set(q.session_id, []);
      sessionMap.get(q.session_id)!.push(q);
    });

    const finalResult = [];

    // 4. Processa cada sessão isoladamente
    for (const [sessionId, sessionQuestions] of sessionMap.entries()) {
      
      const inputForAI = sessionQuestions.map((q) => `ID: ${q.id} | Pergunta: ${q.content}`).join('\n');

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Rápido, barato, ideal para produção
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
      
      // 5. Salva os resultados no banco
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
           // Se falhar a inserção, reverte os originais para erro ou rejected para não travarem como processing eternamente
           await supabase.from('questions').update({ status: 'rejected' }).in('id', cluster.original_ids);
        }
      }
      
      finalResult.push({ sessionId, processedCount: sessionQuestions.length, clustersGenerated: aiResult.clusters.length });
    }

    return NextResponse.json({ message: 'Processamento Batch concluído!', details: finalResult });

  } catch (error: any) {
    console.error("Erro na API de IA Batch:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
