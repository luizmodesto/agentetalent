import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertQuestions() {
  const { data, error } = await supabase
    .from('questions')
    .insert([
      { content: 'Como a Inteligência Artificial vai mudar o mercado de trabalho?' },
      { content: 'Qual é a melhor arquitetura para um app Next.js de grande escala?' }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir:', error);
  } else {
    console.log('✨ 2 Perguntas inseridas com sucesso no banco de dados!', data);
  }
}

insertQuestions();
