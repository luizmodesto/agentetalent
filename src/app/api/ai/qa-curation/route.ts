import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export async function POST(req: Request) {
  try {
    const { sessionId, maxPerguntas, speakerName, theme, autoCurateOnly } = await req.json();

    if (!sessionId || !maxPerguntas || !speakerName) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Fetch pending questions
    const { data: questions, error: fetchError } = await supabase
      .from("questions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "pending");

    if (fetchError) {
      console.error("Error fetching questions:", fetchError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Prepare questions for AI
    const questionsInput = questions && questions.length > 0 ? questions.map((q) => ({
      id: q.id,
      author_name: q.author_name,
      content: q.content,
    })) : [];

    // If autoCurateOnly is true and there are no pending questions, just return empty!
    if (autoCurateOnly && questionsInput.length === 0) {
       return NextResponse.json({ success: true, processed: 0, approved: 0 });
    }

    const generationRule = autoCurateOnly 
      ? "- É EXPRESSAMENTE PROIBIDO inventar ou gerar perguntas novas. Apenas avalia e reformula as perguntas que estão na lista fornecida. Se a lista estiver vazia, não devolvas perguntas nenhumas."
      : `- Se houver menos perguntas na lista do que as ${maxPerguntas} pedidas, DEVES gerar perguntas originais, inteligentes e realistas da tua própria autoria baseadas no tema e orador.`;

    const systemPrompt = `
Tu és um moderador virtual de eventos ao vivo, gerindo perguntas do público de forma natural e profissional.
Nesta fase, estás a fazer "Curadoria Silenciosa". A tua tarefa é avaliar as perguntas recebidas e prepará-las para serem lidas em voz alta.

1. OBJETIVO GERAL:
- Selecionar e preparar, no máximo, ${maxPerguntas} perguntas.
${generationRule}
Tema do orador/sessão: "${theme || 'Tópico Geral'}"
Orador atual: ${speakerName}

2. FILTRAGEM E SELEÇÃO:
- REJEITAR conteúdo ofensivo ou irrelevante.
- Agrupar perguntas repetidas ou com o mesmo significado numa só.

3. FORMATAÇÃO E TOM CONVERSACIONAL (MUITO IMPORTANTE):
- O idioma é ESTRITAMENTE Português de Portugal (PT-PT). Usa o pronome "tu" formal de forma respeitosa, natural e fluida, como um apresentador humano.
- NUNCA uses "Pergunta de [Nome]:". O texto gerado deve ser EXATAMENTE a fala direta.
- Quando a pergunta vem de um participante (da lista), o nome dele deve ser citado no início da fala de forma simpática. Exemplo: "O Luís tem uma dúvida muito pertinente, [Nome Orador]..." ou "A Maria gostava de saber..."
- Intercala a forma como chamas os nomes para não soar robótico.
- Se a pergunta for gerada por ti, não inventes um nome. Podes dizer algo como: "Aproveito para colocar uma questão: ..." ou "[Nome Orador], há um ponto importante..."

Deves devolver a resposta num formato JSON estruturado.
`;

    // Call OpenAI API
    const completion = await openai.chat.completions.parse({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(questionsInput) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "qa_curation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              approved: {
                type: "array",
                description: "A lista final de perguntas formatadas prontas para TTS.",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "ID da pergunta original, ou 'generated-1', etc." },
                    reformulated_content: { type: "string", description: "O texto final exato que a IA vai falar, mencionando o autor de forma natural." },
                  },
                  required: ["id", "reformulated_content"],
                  additionalProperties: false,
                },
              },
              rejected: {
                type: "array",
                items: { type: "string" },
                description: "Lista de IDs originais rejeitados.",
              }
            },
            required: ["approved", "rejected"],
            additionalProperties: false,
          },
        },
      },
    });

    const result = completion.choices[0].message.parsed as any;
    if (!result) throw new Error("Failed to parse OpenAI response");

    // Update Database
    for (const approvedQ of result.approved) {
      if (!approvedQ.id.startsWith('generated')) {
        await supabase
          .from("questions")
          .update({
            status: "approved",
            content: approvedQ.reformulated_content,
          })
          .eq("id", approvedQ.id);
      } else {
        await supabase.from("questions").insert([{
          session_id: sessionId,
          author_name: "IA (Moderadora)",
          content: approvedQ.reformulated_content,
          status: "approved"
        }]);
      }
    }

    if (result.rejected.length > 0) {
      await supabase.from("questions").update({ status: "rejected" }).in("id", result.rejected);
    }

    const processedIds = [...result.approved.filter((q: any) => !q.id.startsWith('generated')).map((q: any) => q.id), ...result.rejected];
    const untouchedIds = questionsInput.filter((q: any) => !processedIds.includes(q.id)).map((q: any) => q.id);
    if (untouchedIds.length > 0) {
      await supabase.from("questions").update({ status: "rejected" }).in("id", untouchedIds);
    }

    return NextResponse.json({
      success: true,
      processed: questionsInput.length,
      approved: result.approved.length,
      rejected: result.rejected.length + untouchedIds.length,
    });
  } catch (error: any) {
    console.error("AI QA Curation Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
