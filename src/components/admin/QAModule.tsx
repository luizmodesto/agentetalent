"use client";

import React, { useState, useEffect } from "react";
import { 
  Lock, User, LogIn, LayoutDashboard, Settings, 
  MessageSquare, Radio, Check, X, Edit, Trash2, 
  PlayCircle, Mic, TerminalSquare, AlertCircle, PlusCircle,
  Monitor, MonitorPlay, Smartphone, ExternalLink, CalendarDays,
  ArrowLeft, Plus, BriefcaseBusiness, Bot, Link as LinkIcon, RotateCcw,
  Activity, Zap, MicOff, UserCheck, Play, Pause, FastForward, StopCircle
} from "lucide-react";
import QRCode from "react-qr-code";
import Link from "next/link";

export function QAModule({ eventId, supabase }: { eventId: string | null, supabase: any }) {
  if (!eventId) return <div className="text-white">Selecione um evento na aba 'Meus Eventos' primeiro.</div>;

  const [rawQuestions, setRawQuestions] = useState<any[]>([]);
  const [activeQueue, setActiveQueue] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [fastAssistCache, setFastAssistCache] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchQuestions();
    
    // Realtime subscription na tabela questions
    const channel = supabase.channel('questions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, (payload: any) => {
        fetchQuestions(); // Simples re-fetch para garantir integridade, em vez de manipular array local
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Hook para invocar o fast-assist automaticamente nas novas perguntas brutas
  useEffect(() => {
    rawQuestions.forEach(async (q) => {
      if (!fastAssistCache[q.id]) {
         setFastAssistCache(prev => ({ ...prev, [q.id]: { loading: true } }));
         try {
           const res = await fetch('/api/ai/fast-assist', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ question: q.content })
           });
           const data = await res.json();
           if (data.refined_question) {
             setFastAssistCache(prev => ({ ...prev, [q.id]: { loading: false, data } }));
           } else {
             setFastAssistCache(prev => ({ ...prev, [q.id]: { loading: false, error: true } }));
           }
         } catch(e) {
             setFastAssistCache(prev => ({ ...prev, [q.id]: { loading: false, error: true } }));
         }
      }
    });
  }, [rawQuestions, fastAssistCache]);

  const fetchQuestions = async () => {
    setLoading(true);
    // Primeiro, pegar as sessões do evento
    const { data: sessions } = await supabase.from('sessions').select('id').eq('event_id', eventId);
    if (!sessions || sessions.length === 0) {
      setLoading(false);
      return;
    }
    
    const sessionIds = sessions.map((s: any) => s.id);
    
    // Pegar perguntas pendentes (Inbox)
    const { data: pending } = await supabase.from('questions')
      .select('*, session:sessions(speakers(*))').in('session_id', sessionIds).eq('status', 'pending').order('created_at', { ascending: false });
    
    // Pegar perguntas aprovadas (Fila)
    const { data: approved } = await supabase.from('questions')
      .select('*, session:sessions(speakers(*))').in('session_id', sessionIds).eq('status', 'approved').order('created_at', { ascending: true });
      
    if (pending) setRawQuestions(pending);
    if (approved) setActiveQueue(approved);
    setLoading(false);
  };

  const handleApprove = async (q: any) => {
    const fastData = fastAssistCache[q.id]?.data;
    
    // Traz tags de tom/ritmo do evento
    let tone = "Corporativo";
    let rhythm = "Natural";
    const { data: eventData } = await supabase.from('events').select('personality').eq('id', eventId).single();
    if (eventData?.personality) {
      try {
        const config = JSON.parse(eventData.personality);
        if (config.openai_tone) tone = config.openai_tone;
        if (config.openai_rhythm) rhythm = config.openai_rhythm;
      } catch(e) {}
    }

    if (fastData) {
      const metadata = JSON.stringify({ 
         openai_tone: tone, 
         openai_rhythm: rhythm
      });
      await supabase.from('questions').update({ 
        status: 'approved',
        content: fastData.refined_question,
        context: metadata,
        suggested_answer: fastData.short_answer,
        transition: fastData.speaker_start
      }).eq('id', q.id);
    } else {
      await supabase.from('questions').update({ status: 'approved' }).eq('id', q.id);
    }
    fetchQuestions();
  };

  const handleReject = async (id: number) => {
    await supabase.from('questions').update({ status: 'rejected' }).eq('id', id);
    fetchQuestions();
  };

  const handleDeleteFromQueue = async (id: number) => {
    await supabase.from('questions').delete().eq('id', id);
    fetchQuestions();
  };

  const handleClearQueue = async () => {
    if (!confirm("Tem certeza que deseja apagar todas as perguntas da Fila de Espera Ativa?")) return;
    const ids = activeQueue.map(q => q.id);
    await supabase.from('questions').delete().in('id', ids);
    fetchQuestions();
  };

  const processWithAI = async () => {
    setIsProcessingAI(true);
    try {
      const res = await fetch('/api/event-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      });
      const data = await res.json();
      if (data.success || data.approved) {
        alert("Inteligência Artificial processou as perguntas com sucesso!");
        fetchQuestions();
      } else {
        alert("Erro na IA: " + (data.error || "Erro desconhecido"));
      }
    } catch (error) {
      console.error(error);
      alert("Falha de conexão com a DIGITALENT.");
    }
    setIsProcessingAI(false);
  };

  const simulateIncoming = async () => {
    if (!newQuestion.trim()) return;
    
    const { data: sessions } = await supabase.from('sessions').select('id').eq('event_id', eventId).limit(1);
    if (!sessions || sessions.length === 0) {
      alert("Crie primeiro uma Sessão para este evento na aba de Controle/Configurações.");
      return;
    }

    await supabase.from('questions').insert([
      { session_id: sessions[0].id, content: newQuestion, author_name: "Admin (Simulado)", status: "pending" }
    ]);
    
    setNewQuestion("");
    fetchQuestions();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="bg-[#111] border border-neutral-800 rounded-2xl flex flex-col h-[700px]">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Inbox / Filtragem ({rawQuestions.length})
          </h3>
          <button 
            onClick={processWithAI} 
            disabled={isProcessingAI}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            <Bot className="w-4 h-4" /> 
            {isProcessingAI ? "Processando..." : "Processar com DIGITALENT"}
          </button>
        </div>
        
        <div className="p-4 border-b border-neutral-800 bg-[#1a1a1a]">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              placeholder="Simular pergunta da plateia..."
              className="flex-1 bg-[#111] border border-neutral-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              onKeyDown={e => e.key === "Enter" && simulateIncoming()}
            />
            <button onClick={simulateIncoming} className="bg-neutral-800 hover:bg-neutral-700 p-2 rounded-lg text-white">
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-center text-neutral-500 mt-4">Carregando perguntas...</p>}
          {!loading && rawQuestions.map(q => (
            <div key={q.id} className="bg-[#1a1a1a] border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-white mb-2">&quot;{q.content}&quot;</p>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-500">De: {q.author_name}</span>
                  {q.session?.speakers?.name && (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded w-max border border-emerald-500/20">
                        Para o orador: {q.session.speakers.name}
                    </span>
                  )}
                </div>
                {q.ai_score && <span className="ml-2 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">Score IA: {q.ai_score}/10</span>}
                
                {fastAssistCache[q.id]?.loading && (
                   <div className="mt-2 text-xs text-indigo-400 animate-pulse flex items-center gap-1">
                      <Bot className="w-3 h-3" /> Reformulando (Fast-Assist)...
                   </div>
                )}
                {fastAssistCache[q.id]?.data && (
                   <div className="mt-3 bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-lg">
                      <p className="text-xs text-indigo-300 font-semibold mb-1">Versão Reformulada/Mais Forte:</p>
                      <p className="text-sm text-white italic">{fastAssistCache[q.id].data.refined_question}</p>
                   </div>
                )}
              </div>
              <div className="flex sm:flex-col items-end gap-2 shrink-0">
                <button onClick={() => handleApprove(q)} className="w-full px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> Aprovar
                </button>
                <div className="flex gap-2 w-full">
                  <button className="flex-1 flex justify-center p-1.5 text-neutral-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors" title="Editar">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleReject(q.id)} className="flex-1 flex justify-center p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!loading && rawQuestions.length === 0 && (
            <div className="text-center text-neutral-500 text-sm mt-10">
              Nenhuma pergunta pendente.
            </div>
          )}
        </div>
      </div>

      {/* ACTIVE QUEUE */}
      <div className="bg-[#111] border border-neutral-800 rounded-2xl flex flex-col h-[700px]">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-emerald-500" />
            Fila de Espera Ativa ({activeQueue.length})
          </h3>
          {activeQueue.length > 0 && (
            <button 
              onClick={handleClearQueue}
              className="text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Limpar Tudo
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeQueue.map((q, i) => (
            <div key={q.id} className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex gap-4 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
              <div className="flex flex-col items-center justify-center bg-indigo-500/10 text-indigo-400 font-bold rounded-lg w-10 h-10 shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm text-white mb-2 font-medium">{q.content}</p>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-500">De: {q.author_name}</span>
                  {q.session?.speakers?.name && (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded w-max border border-emerald-500/20">
                      Para o orador: {q.session.speakers.name}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => handleDeleteFromQueue(q.id)} 
                className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors h-max opacity-0 group-hover:opacity-100"
                title="Apagar pergunta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {activeQueue.length === 0 && (
            <div className="text-center text-neutral-500 text-sm mt-10">
              A fila está vazia. Aprova perguntas para enviá-las a DIGITALENT.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- MODULE: VOICE SETTINGS (ELEVENLABS + NATIVE) ---