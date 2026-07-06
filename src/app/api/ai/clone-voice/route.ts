import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { provider, apiKey, fileName, voiceName } = await request.json();

    if (!provider || !apiKey || !fileName) {
      return NextResponse.json({ error: 'Provedor, Chave API e Ficheiro são obrigatórios.' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'audio', fileName);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Ficheiro de áudio não encontrado no servidor.' }, { status: 404 });
    }

    if (provider === "elevenlabs") {
      const formData = new FormData();
      formData.append('name', voiceName || `Cloned Voice - ${fileName}`);
      
      const fileBuffer = fs.readFileSync(filePath);
      const fileBlob = new Blob([fileBuffer], { type: 'audio/mpeg' });
      formData.append('files', fileBlob, fileName);

      const elResponse = await fetch(`https://api.elevenlabs.io/v1/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
        },
        body: formData
      });

      if (elResponse.ok) {
        const data = await elResponse.json();
        return NextResponse.json({ success: true, voice_id: data.voice_id });
      } else {
        const errText = await elResponse.text();
        return NextResponse.json({ error: "Erro ElevenLabs: " + errText }, { status: elResponse.status });
      }
    } 
    else if (provider === "fishaudio") {
      const formData = new FormData();
      formData.append('title', voiceName || `Cloned Voice - ${fileName}`);
      formData.append('visibility', 'private');
      
      const fileBuffer = fs.readFileSync(filePath);
      const fileBlob = new Blob([fileBuffer], { type: 'audio/mpeg' });
      formData.append('voices', fileBlob, fileName);

      const fishResponse = await fetch(`https://api.fish.audio/model`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });

      if (fishResponse.ok) {
        const data = await fishResponse.json();
        // A API da Fish Audio retorna o ID do modelo como _id ou id
        const newId = data._id || data.id;
        return NextResponse.json({ success: true, voice_id: newId });
      } else {
        const errText = await fishResponse.text();
        return NextResponse.json({ error: "Erro Fish Audio: " + errText }, { status: fishResponse.status });
      }
    }

    return NextResponse.json({ error: 'Provedor não suportado para clonagem via API.' }, { status: 400 });

  } catch (error: any) {
    console.error("Erro na Clonagem de Voz:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
