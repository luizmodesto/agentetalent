import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    
    if (!fs.existsSync(audioDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(audioDir);
    // Filter only audio extensions
    const audioFiles = files.filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.m4a'));
    
    return NextResponse.json({ files: audioFiles });
  } catch (error: any) {
    console.error("Erro ao listar áudios:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
