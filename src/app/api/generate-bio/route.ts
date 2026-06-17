import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

async function fetchMetaDescription(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });
    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';

    // Extract meta description or og:description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) 
                   || html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const description = descMatch ? descMatch[1] : '';

    return `${title} - ${description}`;
  } catch (e) {
    console.error(`Failed to fetch ${url}:`, e);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { name, role, linkedin_url, instagram_url, facebook_url } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key não configurada' }, { status: 500 });
    }

    const scrapedData: string[] = [];

    if (linkedin_url) {
      const data = await fetchMetaDescription(linkedin_url);
      if (data) scrapedData.push(`LinkedIn: ${data}`);
    }
    if (instagram_url) {
      const data = await fetchMetaDescription(instagram_url);
      if (data) scrapedData.push(`Instagram: ${data}`);
    }
    if (facebook_url) {
      const data = await fetchMetaDescription(facebook_url);
      if (data) scrapedData.push(`Facebook: ${data}`);
    }

    const scrapedContext = scrapedData.length > 0 
      ? `Informações extraídas das redes sociais:\n${scrapedData.join('\n')}` 
      : 'Não foi possível extrair dados automáticos das redes. Use a criatividade baseada no nome e cargo/papel.';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `Você é um copywriter especialista em criar biografias de alto impacto para eventos. 
Sua missão é escrever uma introdução curta, forte e engajadora sobre um profissional.
O texto deve enaltecer a pessoa, mostrar autoridade e criar expectativa na audiência.
Evite formatações complexas. Retorne apenas o texto final da biografia em português (pt-BR).`
        },
        {
          role: 'user',
          content: `Nome da pessoa: ${name}
Papel no evento: ${role || 'Orador'}

${scrapedContext}

Crie uma biografia de impacto (máximo 2 parágrafos).`
        }
      ],
    });

    const bio = response.choices[0].message.content?.trim() || '';

    return NextResponse.json({ bio });

  } catch (error: any) {
    console.error('Erro ao gerar bio:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
