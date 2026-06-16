"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/utils/supabase/client";

type Question = {
  id: string;
  author_name: string;
  content: string;
  status: string;
  ai_score: number | null;
  context: string | null;
  suggested_answer: string | null;
  transition: string | null;
  created_at: string;
};

export default function LiveControlPanel({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  
  const [eventData, setEventData] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [speakerData, setSpeakerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Busca Inicial
  useEffect(() => {
    const fetchEventArchitecture = async () => {
      const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (event) setEventData(event);

      const { data: session } = await supabase
        .from("sessions")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (session) {
        setActiveSession(session);
        
        if (session.speaker_id) {
          const { data: speaker } = await supabase.from("speakers").select("*").eq("id", session.speaker_id).single();
          if (speaker) setSpeakerData(speaker);
        }

        const { data: qData } = await supabase
          .from("questions")
          .select("*")
          .eq("session_id", session.id)
          .order("created_at", { ascending: false });

        if (qData) setQuestions(qData);
      }
      setIsLoading(false);
    };

    fetchEventArchitecture();
  }, [eventId, supabase]);

  // Inscrição Realtime (Agora escuta todas as mudanças passivamente, sem polling)
  useEffect(() => {
    if (!activeSession) return;

    const channel = supabase
      .channel(`live-questions-${activeSession.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `session_id=eq.${activeSession.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setQuestions((prev) => [payload.new as Question, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setQuestions((prev) => prev.map((q) => (q.id === payload.new.id ? (payload.new as Question) : q)));
          } else if (payload.eventType === "DELETE") {
            setQuestions((prev) => prev.filter((q) => q.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeSession, supabase]);


  if (isLoading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Carregando painel ao vivo...</div>;
  }

  // O Painel agora mostra: 'pending' (novas), 'processing' (IA capturou), e 'approved' (IA terminou)
  const displayQuestions = questions.filter(q => ['pending', 'processing', 'approved'].includes(q.status));

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-6">
      
      <header className="mb-8 flex justify-between items-center bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {eventData?.title || "Painel de Controle"}
            <span className="bg-purple-500/20 text-purple-400 border border-purple-500/50 text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
              AI Cloud Batch Ativo
            </span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-neutral-400">Status das Perguntas:</span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${questionsOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              <div className={`w-2 h-2 rounded-full ${questionsOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
              {questionsOpen ? 'Abertas' : 'Fechadas'}
            </div>
          </div>
        </div>
      </header>

      {!activeSession ? (
        <div className="bg-neutral-900 p-12 text-center rounded-2xl border border-neutral-800">
          <h2 className="text-xl text-red-400 mb-2">Nenhuma sessão ativa</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
              <h2 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-2">Palestrante Atual</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-xl font-bold">
                  {speakerData?.name?.charAt(0) || "P"}
                </div>
                <div>
                  <p className="font-medium text-lg">{speakerData?.name || "Indefinido"}</p>
                  <p className="text-sm text-neutral-400">{activeSession.title}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex flex-col h-[calc(100vh-160px)]">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                Feed Inteligente (AI)
                <span className="bg-neutral-800 text-xs py-1 px-2 rounded-full">{displayQuestions.length}</span>
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {displayQuestions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                  <p>Aguardando perguntas da audiência...</p>
                </div>
              ) : (
                displayQuestions.map((q) => (
                  <div key={q.id} className={`p-5 rounded-xl border transition-colors ${
                    q.status === 'approved' ? 'bg-purple-500/5 border-purple-500/30' : 
                    q.status === 'processing' ? 'bg-blue-500/5 border-blue-500/30 opacity-70' :
                    'bg-neutral-950 border-neutral-800'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-semibold flex items-center gap-2 ${
                        q.status === 'approved' ? 'text-purple-400' : 
                        q.status === 'processing' ? 'text-blue-400' : 
                        'text-emerald-400'
                      }`}>
                        {q.status === 'approved' && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>}
                        {q.status === 'processing' && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {q.author_name}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {new Date(q.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-lg mb-4 ${q.status === 'approved' ? 'text-white' : 'text-neutral-300'}`}>{q.content}</p>
                    
                    {q.status === 'approved' && q.suggested_answer && (
                      <div className="mt-4 bg-neutral-950/50 rounded-lg p-4 border border-purple-500/20 space-y-3">
                        {q.context && (
                          <div className="text-sm">
                            <span className="text-purple-400 font-semibold block mb-1">💡 Contexto (Por que responder):</span>
                            <span className="text-neutral-300">{q.context}</span>
                          </div>
                        )}
                        {q.transition && (
                          <div className="text-sm">
                            <span className="text-emerald-400 font-semibold block mb-1">🗣️ Transição sugerida:</span>
                            <span className="text-neutral-300 italic">"{q.transition}"</span>
                          </div>
                        )}
                        <div className="text-sm">
                          <span className="text-blue-400 font-semibold block mb-1">🤖 Resposta da IA (Co-host):</span>
                          <span className="text-neutral-300">{q.suggested_answer}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-neutral-800/50">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium uppercase tracking-wider px-2 py-1 rounded ${
                          q.status === 'approved' ? 'text-purple-400 bg-purple-400/10' : 
                          q.status === 'processing' ? 'text-blue-400 bg-blue-400/10' :
                          'text-amber-500 bg-amber-500/10'
                        }`}>
                          {q.status === 'approved' ? 'Aprovado pela IA' : 
                           q.status === 'processing' ? 'A IA está lendo...' : 
                           'Na fila'}
                        </span>
                        {q.ai_score && q.ai_score > 1 && (
                          <span className="text-xs text-neutral-400 bg-neutral-800 px-2 py-1 rounded-full">
                            Agrupou {q.ai_score} perguntas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
