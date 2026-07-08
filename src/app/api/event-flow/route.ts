import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co');
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder');
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key not configured' }, { status: 500 });
    }

    // 1. Fetch RAW questions (status pending)
    const { data: rawQuestions, error: rawError } = await supabase
      .from('questions')
      .select('id, content, author_name')
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(30);

    if (rawError) throw rawError;

    // Fetch Context (Event name, topic)
    const { data: session } = await supabase.from('sessions').select('*, events(*)').eq('id', sessionId).single();
    const eventContext = session ? `Contexto do Evento: ${session.events?.title || 'Unknown'}` : 'Evento ao Vivo';

    let inputQuestions = "";
    let isGeneratingFromPresentation = false;
    let presentationText = "";

    // Always fetch speaker presentation text
    const { data: sessionData } = await supabase.from('sessions').select('speakers(presentation_text, bio, name)').eq('id', sessionId).single();
    const speakerInfo = sessionData?.speakers as any;
    
    if (speakerInfo && (speakerInfo.presentation_text || speakerInfo.bio)) {
      presentationText = `Nome do Orador: ${speakerInfo.name}\nBio: ${speakerInfo.bio || ''}\nTexto da Apresentação: ${speakerInfo.presentation_text || ''}`;
    }

    if (!rawQuestions || rawQuestions.length === 0) {
      if (presentationText) {
        isGeneratingFromPresentation = true;
      } else {
        return NextResponse.json({ message: 'Nenhuma pergunta pendente e sem texto de apresentação para gerar.' }, { status: 200 });
      }
    } else {
      inputQuestions = rawQuestions
        .map((q) => `[ID: ${q.id}] ${q.author_name ? `De ${q.author_name}: ` : ''}${q.content}`)
        .join('\n');
    }

    // 2. System Prompt from the User
    const systemPrompt = `We are building a real-time AI Event Copilot system called DIGITALENT.
This AI is responsible for managing live audience interaction, selecting and refining questions, and actively assisting the speaker during an event.

# ROLE OF THE AI
You are an intelligent event moderator, co-host, and director.
Your responsibilities include:
* filtering and improving audience questions
* grouping similar questions
* selecting the best questions to ask
* guiding the flow of the event
* assisting the speaker with context and answers
* generating natural speaking phrases

You must think like a professional live event host.

# CORE RESPONSIBILITIES

## 1. FILTER & CLEAN QUESTIONS
* Remove spam, duplicates, and irrelevant questions
* Normalize language
* Keep only meaningful questions

## 2. CLUSTER QUESTIONS
* Group similar questions into themes
* Avoid repetition
* Identify main audience interests

## 3. GENERATE REFINED QUESTIONS
For each cluster:
* create one high-quality, clear, professional question

## 4. GENERATE SPEAKER SUPPORT
For each refined question generate:
* CONTEXT: Why this question matters / How it connects to the topic
* SUGGESTED ANSWER: Clear and concise (3-5 sentences), useful and realistic. Base it strictly on the speaker material provided.
* TRANSITION PHRASE: Natural phrase for the speaker to start answering

## 5. EVENT FLOW MANAGEMENT
Analyze all refined questions and decide:
* NEXT QUESTION: The best question to ask now
* QUESTION QUEUE: Next 2-3 questions to maintain flow
* EVENT STATE: Classify as "opening", "engagement", "deep_discussion", or "closing"
* ENGAGEMENT STRATEGY: Suggest what the speaker should do (go deeper, simplify, ask audience interaction, change topic)

## 6. SPEAKER INTERACTION MODE
Generate real-time guidance for the speaker:
* how to introduce the question
* tone suggestion (formal, energetic, reflective)
* optional follow-up question

# RULES
* Always respond in Brazilian Portuguese
* Keep answers concise and useful for live speaking
* Avoid generic or vague responses
* Prioritize clarity and engagement
* Maintain natural and human tone
* Think in real-time context (live event)`;

    const userMessageContent = isGeneratingFromPresentation 
      ? `Aqui está o contexto do evento e o texto da apresentação do orador. Como não há perguntas da plateia, crie 1 ou 2 perguntas extremamente inteligentes e engajadoras que poderiam ser feitas pela plateia com base neste conteúdo, e simule a resposta do orador baseada no material.\n\n${eventContext}\n\nMATERIAL DO ORADOR:\n${presentationText}`
      : `Aqui está o contexto, as perguntas cruas (raw) da plateia, e o material do orador. Você deve processar as perguntas da plateia e usar o MATERIAL DO ORADOR para fornecer uma sugestão de resposta (suggested_answer) para cada pergunta refinada.\n\n${eventContext}\n\nMATERIAL DO ORADOR:\n${presentationText ? presentationText : 'Nenhum material disponível.'}\n\nPERGUNTAS:\n${inputQuestions}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessageContent
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'talent_copilot_output',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              approved: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    question: { type: 'string', description: 'refined question' },
                    context: { type: 'string' },
                    suggested_answer: { type: 'string' },
                    transition: { type: 'string' },
                    speaker_tip: { type: 'string', description: 'tone suggestion and how to introduce' },
                    follow_up: { type: 'string' }
                  },
                  required: ['question', 'context', 'suggested_answer', 'transition', 'speaker_tip', 'follow_up'],
                  additionalProperties: false
                }
              },
              rejected_ids: {
                type: 'array',
                items: { type: 'string' },
                description: 'The IDs of the raw questions that were rejected, marked as spam or merged into a cluster.'
              },
              event_flow: {
                type: 'object',
                properties: {
                  next_question: { type: 'string' },
                  queue: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  event_state: {
                    type: 'string',
                    enum: ['opening', 'engagement', 'deep_discussion', 'closing']
                  },
                  engagement_tip: { type: 'string' }
                },
                required: ['next_question', 'queue', 'event_state', 'engagement_tip'],
                additionalProperties: false
              }
            },
            required: ['approved', 'rejected_ids', 'event_flow'],
            additionalProperties: false
          }
        }
      }
    });

    const aiResult = JSON.parse(response.choices[0].message.content!);

    // Se geramos da apresentação, insere diretamente como 'approved' na tabela
    if (isGeneratingFromPresentation && aiResult.approved && aiResult.approved.length > 0) {
      for (const generated of aiResult.approved) {
        await supabase.from('questions').insert([{
          session_id: sessionId,
          content: generated.question,
          author_name: "DIGITALENT IA",
          status: "approved",
          context: JSON.stringify({ 
             openai_tone: "Corporativo", 
             openai_rhythm: "Natural"
          }),
          suggested_answer: generated.suggested_answer,
          transition: generated.transition
        }]);
      }
    }

    return NextResponse.json({ success: true, ...aiResult });

  } catch (error: any) {
    console.error('Error in DIGITALENT Copilot:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
