"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Question = {
  id: string;
  author_name: string;
  content: string;
  status: string;
  created_at: string;
};

export default function LiveControlPanel({ params }: { params: { eventId: string } }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  
  const [eventData, setEventData] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [speakerData, setSpeakerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();
  const eventId = params.eventId;

  // Busca Inicial da Arquitetura (Event -> Session -> Speaker -> Questions)
  useEffect(() => {
    const fetchEventArchitecture = async () => {
      // 1. Busca o Evento
      const { data: event } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();
      
      if (event) setEventData(event);

      // 2. Busca a Sessão Ativa
      const { data: session } = await supabase
        .from("sessions")
        .select("*")
        .eq("event_id", eventId)
        // .eq("status", "active") // Simplificado para o MVP (busca a mais recente)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (session) {
        setActiveSession(session);
        
        // 3. Busca o Palestrante (Speaker)
        if (session.speaker_id) {
          const { data: speaker } = await supabase
            .from("speakers")
            .select("*")
            .eq("id", session.speaker_id)
            .single();
          if (speaker) setSpeakerData(speaker);
        }

        // 4. Busca as perguntas da Sessão Ativa
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

  // Inscrição Realtime (apenas se houver uma sessão ativa)
  useEffect(() => {
    if (!activeSession) return;

    const channel = supabase
      .channel(`live-questions-${activeSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "questions",
          filter: `session_id=eq.${activeSession.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setQuestions((prev) => [payload.new as Question, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setQuestions((prev) =>
              prev.map((q) => (q.id === payload.new.id ? (payload.new as Question) : q))
            );
          } else if (payload.eventType === "DELETE") {
            setQuestions((prev) => prev.filter((q) => q.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession, supabase]);

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Carregando painel ao vivo...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-6">
      
      {/* Header / Event Status */}
      <header className="mb-8 flex justify-between items-center bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold">{eventData?.title || "Painel de Controle Ao Vivo"}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-neutral-400">Status das Perguntas:</span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${questionsOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              <div className={`w-2 h-2 rounded-full ${questionsOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
              {questionsOpen ? 'Abertas' : 'Fechadas'}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-neutral-400">ID do Evento</p>
          <p className="text-xs font-mono text-cyan-400 bg-neutral-950 p-1 rounded border border-neutral-800 mt-1">{eventId}</p>
        </div>
      </header>

      {!activeSession ? (
        <div className="bg-neutral-900 p-12 text-center rounded-2xl border border-neutral-800">
          <h2 className="text-xl text-red-400 mb-2">Nenhuma sessão ativa encontrada</h2>
          <p className="text-neutral-500">Crie uma sessão para este evento no banco de dados para começar a receber perguntas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Speaker Flow & Actions */}
          <div className="space-y-6">
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
              <h2 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-2">Palestrante Atual</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-xl font-bold">
                  {speakerData?.name?.charAt(0) || "P"}
                </div>
                <div>
                  <p className="font-medium text-lg">{speakerData?.name || "Palestrante Indefinido"}</p>
                  <p className="text-sm text-neutral-400">{activeSession.title}</p>
                </div>
              </div>

              <h2 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-2">Controles da Sessão</h2>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setQuestionsOpen(true)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all ${questionsOpen ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
                >
                  Abrir Perguntas
                </button>
                <button 
                  onClick={() => setQuestionsOpen(false)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all ${!questionsOpen ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
                >
                  Fechar Perguntas
                </button>
                <button className="py-3 px-4 rounded-xl font-medium bg-indigo-500 hover:bg-indigo-400 text-white mt-2 transition-colors">
                  Próximo Palestrante ⏭
                </button>
              </div>
            </div>
            
            {/* QR Code Placeholder for Big Screen */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 text-center flex flex-col items-center">
              <h2 className="text-sm font-semibold text-neutral-400 mb-4">Link para Participantes</h2>
              <div className="w-48 h-48 bg-white p-2 rounded-xl flex items-center justify-center mb-4">
                 <div className="w-full h-full bg-neutral-200 border-4 border-dashed border-neutral-400 flex items-center justify-center text-neutral-500 text-sm text-center">
                   [QR Code]
                 </div>
              </div>
              <p className="text-sm text-cyan-400 font-mono break-all bg-neutral-950 p-2 rounded-lg border border-neutral-800 w-full">
                /event/{eventId}/join
              </p>
            </div>
          </div>

          {/* Right Column: Questions Feed */}
          <div className="lg:col-span-2 bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex flex-col h-[calc(100vh-160px)]">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                Feed de Perguntas ao Vivo
                <span className="bg-neutral-800 text-xs py-1 px-2 rounded-full">{questions.length}</span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm text-neutral-400">Atualizando via Websocket</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {questions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                  <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>Nenhuma pergunta recebida ainda.</p>
                  <p className="text-sm">As perguntas aparecerão aqui magicamente!</p>
                </div>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-emerald-400">{q.author_name}</span>
                      <span className="text-xs text-neutral-500">
                        {new Date(q.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-lg text-neutral-200 mb-4">{q.content}</p>
                    
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-neutral-800/50">
                      <span className="text-xs font-medium uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
                        {q.status}
                      </span>
                      <div className="flex gap-2">
                        <button className="text-xs py-1.5 px-3 bg-neutral-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors">
                          Rejeitar
                        </button>
                        <button className="text-xs py-1.5 px-3 bg-neutral-800 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-lg transition-colors">
                          Aprovar
                        </button>
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
