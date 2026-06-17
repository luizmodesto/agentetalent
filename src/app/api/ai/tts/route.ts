import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const { text, voice_id, speed } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Texto é obrigatório.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key não configurada.' }, { status: 500 });
    }

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice_id || "onyx",
      input: text,
      speed: speed ? parseFloat(speed) : 1.0,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error: any) {
    console.error("Erro no TTS:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
