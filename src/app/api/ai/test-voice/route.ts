import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { provider, apiKey, voiceId, text, speed, pitch, tone, rhythm, storytelling, language } = await request.json();

    if (!text || !provider || !apiKey) {
      return NextResponse.json({ error: 'Faltam parÃ¢metros obrigatÃ³rios.' }, { status: 400 });
    }

    let finalSynthesizeText = text;

    if (tone) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key' });
      let systemPrompt = `Gere uma Ãºnica frase curta (mÃ¡ximo 15 palavras) para testar um sistema de som em um evento. A frase deve indicar que o sistema estÃ¡ a ser testado e que o palco estÃ¡ pronto. O evento chama-se Digitalent'26. Adapte estritamente o tom da frase baseado nos parÃ¢metros abaixo:\n`;
      if (tone) systemPrompt += `- Tom: ${tone}\n`;
      if (rhythm) systemPrompt += `- Ritmo: ${rhythm}\n`;
      if (storytelling) systemPrompt += `- NÃ­vel de Storytelling: ${storytelling}/10\n`;
      
      if (language === 'en-US') {
           systemPrompt += `- Idioma: strictly American English (en-US).\n`;
      } else if (language === 'pt-BR') {
           systemPrompt += `- Idioma: PortuguÃªs do Brasil.\n`;
      } else {
           systemPrompt += `- Idioma: estritamente PortuguÃªs de Portugal (PT-PT). Proibido usar gerÃºndios.\n`;
      }

      try {
          const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Gere a frase de teste de Ã¡udio agora."}],
              temperature: 0.7,
              max_tokens: 50
          });
          if (response.choices[0].message.content) {
              finalSynthesizeText = response.choices[0].message.content.trim();
          }
      } catch (e) {
          console.error("Erro ao gerar frase dinÃ¢mica GPT-4o para teste", e);
      }
    }


    if (provider === "fishaudio") {
      const fishResponse = await fetch(`https://api.fish.audio/v1/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: finalSynthesizeText,
          format: 'mp3',
          reference_id: voiceId || undefined
        })
      });

      if (fishResponse.ok) {
        const buffer = Buffer.from(await fishResponse.arrayBuffer());
        return new NextResponse(buffer, {
          headers: { 'Content-Type': 'audio/mpeg' },
        });
      } else {
        const errText = await fishResponse.text();
        return NextResponse.json({ error: "Erro Fish Audio: " + errText }, { status: fishResponse.status });
      }
    } 
    else if (provider === "elevenlabs") {
      const elResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: finalSynthesizeText,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      });

      if (elResponse.ok) {
        const buffer = Buffer.from(await elResponse.arrayBuffer());
        return new NextResponse(buffer, {
          headers: { 'Content-Type': 'audio/mpeg' },
        });
      } else {
        const errText = await elResponse.text();
        return NextResponse.json({ error: "Erro ElevenLabs: " + errText }, { status: elResponse.status });
      }
    } else if (provider === "openai") {
      const openAiKey = process.env.OPENAI_API_KEY;
      if (!openAiKey) {
        return NextResponse.json({ error: "Chave OpenAI nÃ£o configurada no servidor." }, { status: 500 });
      }

      const oaResponse = await fetch(`https://api.openai.com/v1/audio/speech`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "tts-1",
          voice: voiceId || "onyx",
          input: finalSynthesizeText
        })
      });

      if (oaResponse.ok) {
        const buffer = Buffer.from(await oaResponse.arrayBuffer());
        return new NextResponse(buffer, {
          headers: { 'Content-Type': 'audio/mpeg' },
        });
      } else {
        const errText = await oaResponse.text();
        return NextResponse.json({ error: "Erro OpenAI TTS: " + errText }, { status: oaResponse.status });
      }
    }

    return NextResponse.json({ error: 'Provedor invÃ¡lido.' }, { status: 400 });

  } catch (error: any) {
    console.error("Erro no proxy TTS:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
