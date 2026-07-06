import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co');
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder');
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { text, eventId, voice_id, speed } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Texto Ã© obrigatÃ³rio.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key nÃ£o configurada.' }, { status: 500 });
    }

    let finalVoice = voice_id || "onyx";
    let finalSpeed = speed ? parseFloat(speed) : 1.0;

    // Busca a configuraÃ§Ã£o global de voz do banco de dados para evitar fallbacks
    if (eventId) {
       const { data } = await supabase.from('events').select('voice_settings, personality').eq('id', eventId).single();
       if (data) {
          let voiceConfig = data.voice_settings || {};
          if (Object.keys(voiceConfig).length === 0 && data.personality) {
             try { voiceConfig = JSON.parse(data.personality); } catch(e) {}
          }
          
          const provider = voiceConfig.tts_provider || "elevenlabs";
          const speedRate = voiceConfig.speed ? parseFloat(voiceConfig.speed) : 1.0;

          if (provider === "fishaudio" && voiceConfig.fish_api_key) {
             const fishResponse = await fetch(`https://api.fish.audio/v1/tts`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${voiceConfig.fish_api_key}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  text: text,
                  format: 'mp3',
                  reference_id: voiceConfig.fish_reference_id || undefined
                })
             });
             if (fishResponse.ok) {
                const buffer = Buffer.from(await fishResponse.arrayBuffer());
                return new NextResponse(buffer, { headers: { 'Content-Type': 'audio/mpeg' } });
             } else {
                return NextResponse.json({ error: "Erro Fish Audio: " + await fishResponse.text() }, { status: 500 });
             }
          } 
          else if (provider === "elevenlabs" && voiceConfig.elevenlabs_api_key && voiceConfig.voice_id) {
             const elResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voice_id}`, {
                method: 'POST',
                headers: {
                  'Accept': 'audio/mpeg',
                  'Content-Type': 'application/json',
                  'xi-api-key': voiceConfig.elevenlabs_api_key
                },
                body: JSON.stringify({
                  text: text,
                  model_id: "eleven_multilingual_v2",
                  voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                })
             });
             if (elResponse.ok) {
                const buffer = Buffer.from(await elResponse.arrayBuffer());
                return new NextResponse(buffer, { headers: { 'Content-Type': 'audio/mpeg' } });
             } else {
                return NextResponse.json({ error: "Erro ElevenLabs: " + await elResponse.text() }, { status: 500 });
             }
          }
          else {
             // Fallback para OpenAI (ou se provider for 'openai')
             const openAiKey = process.env.OPENAI_API_KEY;
             if (!openAiKey) return NextResponse.json({ error: 'OpenAI API Key nÃ£o configurada.' }, { status: 500 });
             
             const mp3 = await openai.audio.speech.create({
                model: "tts-1",
                voice: (voiceConfig.openai_voice || "onyx") as any,
                input: text,
             });
             const buffer = Buffer.from(await mp3.arrayBuffer());
             return new NextResponse(buffer, { headers: { 'Content-Type': 'audio/mpeg' } });
          }
       }
    }

    // Fallback absoluto se nÃ£o houver eventId
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: text,
      speed: 1.0,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return new NextResponse(buffer, { headers: { 'Content-Type': 'audio/mpeg' } });

  } catch (error: any) {
    console.error("Erro no TTS:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
