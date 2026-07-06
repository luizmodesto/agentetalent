import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { managerName, speakerName, nextSpeakerName, action, firstQuestion, isFirstSpeaker, aiGender } = await req.json();

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const manager = managerName || "Gestor";
    const speaker = speakerName || "Orador";
    const nextSpeakerInfo = nextSpeakerName ? `O próximo orador será: ${nextSpeakerName}.` : "Não há próximo orador programado (encerramento do evento).";

    let systemPrompt = "";
    
    const genderInstructions = aiGender === 'female'
      ? "IMPORTANTE: A tua persona e voz são FEMININAS. Usa flexões de género no feminino para ti própria (ex: 'Estou ansiosa', 'Estou muito animada', 'Muito obrigada')."
      : "IMPORTANTE: A tua persona e voz são MASCULINAS. Usa flexões de género no masculino para ti próprio (ex: 'Estou ansioso', 'Estou muito animado', 'Muito obrigado').";
    if (action === "intro") {
      const firstQContext = firstQuestion ? `O público enviou perguntas, e a PRIMEIRA PERGUNTA é: "${firstQuestion}". Deves fazer a introdução e DEPOIS LER EXATAMENTE o texto desta primeira pergunta de forma contínua.` : "De momento não há perguntas do público na fila, faz apenas a introdução e aguarda.";
      
      const speakerContext = isFirstSpeaker !== false 
        ? `- Sê breve e dinâmico. Cumprimenta o Gestor do Evento (${manager}) e agradece a passagem de palavra.
- Faz uma breve menção ao orador (${speaker}) que é o primeiro a falar.`
        : `- Sê muito dinâmico e mostra que já estiveste em palco antes. (Ex: "Cá estou eu novamente, ${manager}!", "De volta ao palco!", etc).
- Introduz o novo orador deste bloco (${speaker}) com entusiasmo. Não repitas o cumprimento formal e demorado da primeira vez.`;

      systemPrompt = `
Tu és um moderador virtual de eventos ao vivo, muito carismático e natural.
Gera um pequeno texto para iniciar o bloco de perguntas.
- O idioma é ESTRITAMENTE Português de Portugal (PT-PT). Usa tratamento FORMAL (terceira pessoa, "Você"). NUNCA trates por "Tu".
${speakerContext}
- Introduz a fase de perguntas do público.
- ${firstQContext}
- LÊ A PERGUNTA EXATAMENTE COMO FOI FORNECIDA (já foi curada por mim). Não tentes reescrever a pergunta do público.
- Presta atenção ao nome do orador/oradora (${speaker}) e do gestor/gestora (${manager}) para usares os artigos corretos (ex: "o orador João", "a oradora Maria", "à gestora Inês"). Adapta as palavras 'orador' ou 'gestor' ao género do nome.
Exemplo de estilo para 1º orador: "Olá ${manager}, muito obrigado por me passar a palavra. Estou muito feliz em iniciar este debate com o/a ${speaker}. Vamos lá à nossa primeira pergunta: [texto exato da pergunta]"
Exemplo de estilo para próximos oradores: "Olha eu aqui novamente, ${manager}! Agora vamos iniciar com o/a ${speaker} mais uma sequência de perguntas da nossa audiência. Então vamos lá: [texto exato da pergunta]"
Não devolvas mais nada além da frase falada pela IA.
${genderInstructions}
`;
    } else if (action === "closing") {
      systemPrompt = `
Tu és um moderador virtual de eventos ao vivo.
Gera UMA única frase natural para encerrar o bloco de Q&A.
- O idioma é ESTRITAMENTE Português de Portugal (PT-PT). Usa tratamento FORMAL (terceira pessoa, "Você"). NUNCA trates por "Tu".
- Agradece ao orador/oradora atual (${speaker}) pelas suas respostas.
- Faz uma transição natural, devolvendo a palavra ao Gestor/Gestora (${manager}) e introduzindo o próximo orador/oradora, se aplicável.
- Presta atenção ao género dos nomes para usares "o orador/a oradora" ou "o gestor/a gestora" corretamente.
- Informação sobre transição: ${nextSpeakerInfo}
Exemplo: "Foi um prazer ouvir as suas respostas, ${speaker}, muito obrigado. Agora passo a palavra ao/à ${manager}, que irá dar continuidade e apresentar o próximo orador."
Não devolvas mais nada além da frase falada.
${genderInstructions}
`;
    } else if (action === "next_question") {
      systemPrompt = `
Tu és um moderador virtual de eventos ao vivo, com energia natural e fluida.
Gera UMA pequena frase natural para avançar para a próxima pergunta.
- O idioma é ESTRITAMENTE Português de Portugal (PT-PT). Usa tratamento FORMAL (terceira pessoa, "Você"). NUNCA trates por "Tu".
- Sê muito direto e natural. EVITA frases feitas ou repetitivas como "temos uma questão interessante" ou "temos aqui uma dúvida". Varia a forma como chamas a pergunta (ex: "A próxima questão é de...", "Avançando...", "Vamos a mais uma pergunta...", ou simplesmente lê a pergunta sem ponte).
- A próxima pergunta que vais ler é: "${firstQuestion}".
- LÊ A PERGUNTA EXATAMENTE COMO ESTÁ AÍ, sem alterar o seu conteúdo.
Exemplo: "Muito bem, vamos passar à próxima questão: [texto exato da pergunta]"
Não devolvas mais nada além da frase falada pela IA, lendo a pergunta em seguida.
${genderInstructions}
`;
    } else if (action === "last_question") {
      systemPrompt = `
Tu és um moderador virtual de eventos ao vivo.
Esta é a ÚLTIMA PERGUNTA do bloco para o orador atual (${speaker}).
Gera UMA frase para introduzir esta última pergunta.
- O idioma é ESTRITAMENTE Português de Portugal (PT-PT). Usa tratamento FORMAL (terceira pessoa, "Você"). NUNCA trates por "Tu".
- Informa que esta é a última pergunta do bloco.
- Agradece ao orador/oradora (${speaker}) pelas respostas.
- Informa que, após a resposta, a palavra será devolvida ao Gestor/Gestora (${manager}).
- Presta atenção ao género dos nomes para adaptar as palavras 'orador', 'oradora', 'gestor', 'gestora' corretamente.
- A última pergunta é: "${firstQuestion}".
- LÊ A PERGUNTA EXATAMENTE COMO ESTÁ AÍ, sem alterar o seu conteúdo.
Exemplo: "Antes de passar a palavra ao/à ${manager}, despeço-me deste bloco agradecendo-lhe, ${speaker}. E termino com a seguinte questão: [texto exato da pergunta]"
Não devolvas mais nada além da frase falada, lendo a pergunta em seguida.
${genderInstructions}
`;
    } else if (action === "repeat_question") {
      systemPrompt = `
Tu és um moderador virtual de eventos ao vivo.
Parece que a pergunta anterior não foi bem ouvida ou compreendida, e pediram-te para a repetir.
Gera UMA frase a avisar que vais repetir a pergunta.
- O idioma é ESTRITAMENTE Português de Portugal (PT-PT). Usa tratamento FORMAL (terceira pessoa, "Você"). NUNCA trates por "Tu".
- Sê muito direto (ex: "Parece que a pergunta não foi bem percebida, por isso vou repetir:").
- A pergunta a repetir é: "${firstQuestion}".
- LÊ A PERGUNTA EXATAMENTE COMO ESTÁ AÍ.
Não devolvas mais nada além da frase falada, lendo a pergunta em seguida.
${genderInstructions}
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
