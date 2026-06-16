'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// Definimos o tipo da pergunta com base no que você já tem no banco
type Question = {
  id: string
  content: string | null
  author_name: string | null
  status: string | null
  created_at: string
}

export default function FeedPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // 1. Função para buscar as perguntas que JÁ ESTÃO no banco
    const fetchInitialQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar perguntas:', error)
      } else {
        setQuestions(data || [])
      }
      setLoading(false)
    }

    fetchInitialQuestions()

    // 2. MÁGICA DO REALTIME: Escutar mudanças no banco
    const channel = supabase
      .channel('realtime_questions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'questions' },
        (payload) => {
          // Quando uma nova pergunta é inserida, adicionamos no topo da lista
          console.log('Nova pergunta chegou em tempo real!', payload.new)
          const newQuestion = payload.new as Question
          setQuestions((currentQuestions) => [newQuestion, ...currentQuestions])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'questions' },
        (payload) => {
          // Opcional: Se uma pergunta mudar de status (ex: aprovada), atualiza na tela
          const updatedQuestion = payload.new as Question
          setQuestions((currentQuestions) => 
            currentQuestions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q)
          )
        }
      )
      .subscribe()

    // Limpeza: quando o usuário sair da página, desconectamos o WebSocket
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando feed ao vivo...</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        Feed do Evento 
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      </h1>

      <div className="space-y-4">
        {questions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma pergunta ainda. O feed está vazio!</p>
        ) : (
          questions.map((question) => (
            <div 
              key={question.id} 
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-lg shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {question.author_name || 'Anônimo'}
                </span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                  {question.status || 'pendente'}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-lg">
                {question.content}
              </p>
              <div className="mt-3 text-xs text-slate-400">
                {new Date(question.created_at).toLocaleTimeString('pt-BR')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
