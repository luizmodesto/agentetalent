import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

export async function POST(req: Request) {
  try {
    const { managerName, speakerName, nextSpeakerName, action, firstQuestion } = await req.json();

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const manager = managerName || "Gestor";
    const speaker = speakerName || "Orador";
    const nextSpeakerInfo = nextSpeakerName ? `O próximo orador será: ${nextSpeakerName}.` : "Não há próximo orador programado (encerramento do evento).";

    let systemPrompt = "";
    
    if (action === "intro") {
      const firstQContext = firstQuestion ? `O público enviou perguntas, e a PRIMEIRA PERGUNTA é: "${firstQuestion}". Deves fazer a introdução E ler esta primeira pergunta de forma contínua.` : "De momento não há perguntas do público na fila, faz apenas a introdução e aguarda.";
      systemPrompt = `
Tu és um moderador virtual de eventos ao vivo.
Gera um pequeno texto natural para iniciar o bloco de perguntas.
- O idioma é ESTRITAMENTE Português de Portugal (PT-PT). Usa "tu" formal.
- Cumprimenta o Gestor do Evento (${manager}) e agradece a passagem de palavra.
- Faz uma menção ao orador (${speaker}).
- Introduz a fase de perguntas do público.
- ${firstQContext}
Exemplo de estilo: "Olá ${manager}, muito obrigado por me passares a palavra. Estou muito feliz em iniciar este debate com o ${speaker}. Vamos lá à nossa primeira pergunta: [lê a pergunta]"
Não devolvas mais nada além da frase falada pela IA.
`;
    } else if (action === "closing") {
      systemPrompt = `
Tu és um moderador virtual de eventos ao vivo.
Gera UMA única frase natural para encerrar o bloco de Q&A.
- O idioma é ESTRITAMENTE Português de Portugal (PT-PT). Usa "tu" formal.
- Agradece ao orador atual (${speaker}) pelas suas respostas.
- Faz uma transição natural, devolvendo a palavra ao Gestor (${manager}) e introduzindo o próximo orador, se aplicável.
- Informação sobre transição: ${nextSpeakerInfo}
Exemplo: "Foi um prazer ouvir as tuas respostas, ${speaker}, muito obrigado. Agora passo a palavra ao ${manager}, que irá dar continuidade e apresentar o próximo orador."
Não devolvas mais nada além da frase falada.
`;
    } else if (action === "next_question") {
      systemPrompt = `
Tu és um moderador virtual de eventos ao vivo.
Gera UMA pequena frase natural para avançar para a próxima pergunta.
- O idioma é ESTRITAMENTE Português de Portugal (PT-PT). Usa "tu" formal.
- Apenas introduz a nova pergunta, sem repetir o que já disseste na introdução inicial.
- A próxima pergunta que vais ler é: "${firstQuestion}".
Exemplo: "Muito bem, vamos passar à próxima questão do público: [lê a pergunta]"
Não devolvas mais nada além da frase falada pela IA, lendo a pergunta em seguida.
`;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Gera a frase para a ação: ${action}` },
      ],
      temperature: 0.7,
    });

    const resultText = completion.choices[0].message.content?.trim();

    return NextResponse.json({
      success: true,
      text: resultText,
    });
  } catch (error: any) {
    console.error("AI QA Moderation Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
