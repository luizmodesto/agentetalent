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
    const { sessionId, maxPerguntas, speakerName, theme } = await req.json();

    if (!sessionId || !maxPerguntas || !speakerName) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1. Fetch pending questions
    const { data: questions, error: fetchError } = await supabase
      .from("questions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "pending");

    if (fetchError) {
      console.error("Error fetching questions:", fetchError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ processed: 0, message: "No pending questions found" }, { status: 200 });
    }

    // Prepare questions for AI
    const questionsInput = questions.map((q) => ({
      id: q.id,
      author_name: q.author_name,
      content: q.content,
    }));

    const systemPrompt = `
Tu és um moderador virtual inteligente de um evento ao vivo. Vais receber uma lista de mensagens do público e tens de as filtrar, selecionar e reformular de acordo com estas REGRAS AVANÇADAS:

1. DEFINIR LIMITE:
Só deves selecionar, no máximo, ${maxPerguntas} perguntas.

2. FILTRAGEM (Validação):
SE a mensagem for ofensiva -> REJEITAR
SE a mensagem não estiver relacionada com o tema do evento/orador -> REJEITAR
Tema do orador/sessão: "${theme || 'Tópico Geral'}"

3. AGRUPAMENTO:
Agrupa mensagens com o mesmo significado.

4. SELEÇÃO DAS MELHORES:
Seleciona as mensagens mais relevantes, claras, originais e úteis.

5. USO DO NOME DO PARTICIPANTE (CRÍTICO):
- O nome do autor deve ser mantido e usado de forma natural.
- NÃO usar formatos robóticos como "Pergunta do Luís:".
- EXEMPLO CORRETO: "Luís, obrigado pela tua pergunta — é bastante pertinente. <Orador>, <pergunta>?"

6. TOM CONVERSACIONAL E NATURALIDADE (CRÍTICO):
- Comporta-te como um moderador humano em palco.
- Usa linguagem fluida, transições naturais e pequenos comentários humanos (sem exagero).
- NÃO uses estruturas repetidas como "A pergunta é...". Varia as introduções (ex: "Gostava de te colocar a seguinte questão...", "Temos aqui uma pergunta interessante...", "Deixa-me trazer-te uma questão do público...").
- O Nome do Orador atual é: ${speakerName}. Dirige-te a ele pelo nome.

7. REGRAS DE CONSISTÊNCIA E MEMÓRIA:
- NÃO repetir perguntas.
- NÃO repetir nomes de utilizadores na mesma sessão (se possível).
- IDIOMA: Português de Portugal (PT-PT) estrito.
- TOM: Uso de "tu" formal.

8. TRANSIÇÃO DE ENCERRAMENTO:
Vais também gerar uma frase de encerramento ('closing_remark') que eu usarei no final.
Esta frase deve ter:
- Um fecho emocional ao orador ("Foi um prazer ouvir-te, ${speakerName}...")
- Agradecimento ao público ("Pessoal, tivemos aqui perguntas muito interessantes...")
- Continuidade fluida. Se souberes o próximo orador, anuncia-o, mas eu tratarei de inserir isso se necessário. Apenas cria um fecho humano e caloroso.

Deves devolver a resposta num formato JSON estruturado.
`;

    // 2. Call OpenAI API with Structured Output
    const completion = await openai.chat.completions.parse({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(questionsInput) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "qa_moderation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              approved: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "ID of the original question" },
                    reformulated_content: { type: "string", description: "The final reformulated question text, speaking naturally" },
                  },
                  required: ["id", "reformulated_content"],
                  additionalProperties: false,
                },
              },
              rejected: {
                type: "array",
                items: { type: "string" },
                description: "Array of original question IDs that were rejected",
              },
              closing_remark: {
                type: "string",
                description: "The emotional closing remark to say after the last question is answered."
              }
            },
            required: ["approved", "rejected", "closing_remark"],
            additionalProperties: false,
          },
        },
      },
    });

    const result = completion.choices[0].message.parsed;
    if (!result) {
      throw new Error("Failed to parse OpenAI response");
    }

    // 3. Update Database
    // Update approved
    for (const approvedQ of result.approved) {
      await supabase
        .from("questions")
        .update({
          status: "approved",
          content: approvedQ.reformulated_content, // Sobrescrevemos o conteúdo com a versão da IA
        })
        .eq("id", approvedQ.id);
    }

    // Update rejected
    if (result.rejected.length > 0) {
      await supabase
        .from("questions")
        .update({ status: "rejected" })
        .in("id", result.rejected);
    }

    // For any pending question that wasn't approved or rejected (shouldn't happen, but just in case), reject it
    const processedIds = [...result.approved.map(q => q.id), ...result.rejected];
    const untouchedIds = questionsInput.filter(q => !processedIds.includes(q.id)).map(q => q.id);
    if (untouchedIds.length > 0) {
      await supabase
        .from("questions")
        .update({ status: "rejected" })
        .in("id", untouchedIds);
    }

    return NextResponse.json({
      success: true,
      processed: questionsInput.length,
      approved: result.approved.length,
      rejected: result.rejected.length + untouchedIds.length,
      closing_remark: result.closing_remark,
    });
  } catch (error: any) {
    console.error("AI QA Moderation Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
