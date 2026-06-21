import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { provider, apiKey, voiceId, text, speed, pitch } = await request.json();

    if (!text || !provider || !apiKey) {
      return NextResponse.json({ error: 'Faltam parâmetros obrigatórios.' }, { status: 400 });
    }

    if (provider === "fishaudio") {
      const fishResponse = await fetch(`https://api.fish.audio/v1/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
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
          text: text,
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
        return NextResponse.json({ error: "Chave OpenAI não configurada no servidor." }, { status: 500 });
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
          input: text
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

    return NextResponse.json({ error: 'Provedor inválido.' }, { status: 400 });

  } catch (error: any) {
    console.error("Erro no proxy TTS:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
