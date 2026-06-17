import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
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

    // 1. Fetch approved questions
    const { data: questions, error } = await supabase
      .from('questions')
      .select('content, author_name')
      .eq('session_id', sessionId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!questions || questions.length === 0) {
      return NextResponse.json({ message: 'No approved questions available yet.' }, { status: 200 });
    }

    // Format questions for AI prompt
    const inputQuestions = questions
      .map((q, idx) => `[${idx + 1}] ${q.author_name ? `From ${q.author_name}: ` : ''}${q.content}`)
      .join('\n');

    // 2. Call OpenAI using Event Director prompt
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 800,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are a real-time Event Flow AI acting as an event director and moderator.
You must:
- analyze all approved questions provided by the user
- decide what should be asked next
- maintain a coherent flow of conversation

TASKS
1. PRIORITIZATION
- Select the best next question based on: relevance, diversity (avoid repetition), and audience interest.

2. FLOW MANAGEMENT
- Suggest the next 2-3 questions in sequence to form a queue.

3. EVENT STATE
Classify current moment:
- "opening"
- "deep_discussion"
- "closing"

4. ENGAGEMENT SUGGESTION
- Suggest what the speaker should do: go deeper, simplify, interact with audience.

RULES
- Think like a professional event host
- Keep flow natural and engaging
- Avoid repetitive topics
- Optimize for audience experience

Return only the requested structured JSON data.`
        },
        {
          role: 'user',
          content: `Here are the currently approved questions:\n\n${inputQuestions}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'event_flow_director',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              next_question: { type: 'string', description: 'The exact next question that should be asked.' },
              queue: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'The next 2-3 questions in sequence.'
              },
              event_state: { 
                type: 'string', 
                enum: ['opening', 'deep_discussion', 'closing'],
                description: 'Classification of the current event moment.'
              },
              engagement_tip: { 
                type: 'string',
                description: 'Suggestion on what the speaker should do next (go deeper, simplify, interact with audience).'
              }
            },
            required: ['next_question', 'queue', 'event_state', 'engagement_tip'],
            additionalProperties: false
          }
        }
      }
    });

    const aiResult = JSON.parse(response.choices[0].message.content!);

    return NextResponse.json(aiResult);

  } catch (error: any) {
    console.error('Error generating event flow:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
