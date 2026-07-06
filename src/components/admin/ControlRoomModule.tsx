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

export function ControlRoomModule({ eventId }: { eventId: string | null }) {
  const [eventPhase, setEventPhase] = useState("Abertura");
  const [maxPerguntas, setMaxPerguntas] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [speaker, setSpeaker] = useState<any>(null);
  const [approvedQuestions, setApprovedQuestions] = useState<any[]>([]);
  const [closingRemark, setClosingRemark] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);

  const [logs, setLogs] = useState<{time: string, msg: string}[]>([
    { time: "18:00:01", msg: "Agente iniciado. Carregando modelo pt-BR_onyx." },
    { time: "18:00:05", msg: "Aguardando gatilho do apresentador..." }
  ]);

  // Fetch active session and questions
  useEffect(() => {
    if (!eventId) return;
    
    // We import createClient here inline to avoid passing it as props, or we can use fetch
    const fetchSessionData = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient((process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'), (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'));
        
        const { data: session } = await supabase.from('sessions').select('*, speakers(name, bio)').eq('event_id', eventId).eq('status', 'live').maybeSingle();
        if (session) {
          setActiveSession(session);
          if (session.speakers) setSpeaker(session.speakers);
        }

        const { data: eventData } = await supabase.from('events').select('personality').eq('id', eventId).single();
        if (eventData?.personality) {
          try {
            const parsed = JSON.parse(eventData.personality);
            setIsEventOpen(parsed.is_event_open === true);
          } catch(e){}
        }

        // Fetch approved questions that haven't been asked yet
        if (session) {
           const { data: qs } = await supabase.from('questions').select('*').eq('session_id', session.id).eq('status', 'approved').order('created_at', { ascending: true });
           if (qs) setApprovedQuestions(qs);
        }
      } catch (err) {}
    };

    fetchSessionData();
    const interval = setInterval(fetchSessionData, 5000); // refresh every 5s just in case
    return () => clearInterval(interval);
  }, [eventId]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('pt-PT');
    setLogs(prev => [...prev, { time, msg }]);
  };

  const triggerAIProcessing = async () => {
    if (!activeSession || !speaker) {
      addLog("ERRO: Sessão ou Orador não encontrados para Curadoria.");
      return;
    }
    setIsProcessing(true);
    addLog("A preparar perguntas em background (Curadoria IA)...");
    try {
      const res = await fetch('/api/ai/qa-curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          maxPerguntas: maxPerguntas,
          speakerName: speaker.name,
          theme: speaker.bio
        })
      });
      const data = await res.json();
      if (data.success) {
         addLog(`Curadoria Concluída: ${data.processed} processadas, ${data.approved} aprovadas.`);
      } else {
         addLog("ERRO na Curadoria IA.");
      }
    } catch (e) {
      addLog("ERRO de rede na Curadoria IA.");
    }
    setIsProcessing(false);
  };

  const toggleEventOpen = async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient((process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'), (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'));
      
      const { data: eventData } = await supabase.from('events').select('personality').eq('id', eventId).single();
      let config: any = {};
      if (eventData?.personality) {
        try { config = JSON.parse(eventData.personality); } catch(e){}
      }
      const newState = !isEventOpen;
      config = { ...config, is_event_open: newState };
      await supabase.from('events').update({ personality: JSON.stringify(config) }).eq('id', eventId);
      setIsEventOpen(newState);
      addLog(`Sala de Q&A (Público) ${newState ? 'ABERTA' : 'FECHADA'}`);
      
      if (!newState) {
        triggerAIProcessing();
      }
    } catch (e) {
      addLog("ERRO ao alterar estado da sala.");
    }
  };

  const handleCommand = async (cmd: string) => {
    addLog(`Comando enviado: "${cmd}"`);
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient((process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'), (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'));

      if (cmd === "Digitalent, vamos às perguntas") {
        if (!activeSession || !speaker) {
          addLog("ERRO: Nenhuma sessão ativa encontrada.");
          return;
        }

        setIsProcessing(true);
        addLog("A iniciar Q&A via OpenAI...");

        const { data: qs } = await supabase.from('questions').select('*').eq('session_id', activeSession.id).eq('status', 'approved').order('created_at', { ascending: true });
        const firstQuestion = (qs && qs.length > 0) ? qs[0].content : undefined;

        const res = await fetch('/api/ai/qa-moderation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            managerName: "Gestor",
            speakerName: speaker.name,
            action: "intro",
            firstQuestion: firstQuestion
          })
        });

        const data = await res.json();
        setIsProcessing(false);

        if (data.success && data.text) {
           addLog(`IA Introdução gerada com sucesso.`);
           await supabase.from('events').update({
             personality: JSON.stringify({ ai_force_speak: { text: data.text, time: Date.now() }, target_screen_id: 'ALL' })
           }).eq('id', eventId);
           addLog("Teleprompter: Introdução enviada.");
           
           if (qs && qs.length > 0) {
             await supabase.from('questions').update({ status: 'answered' }).eq('id', qs[0].id);
           }
        } else {
           addLog("ERRO no processamento de IA.");
        }
      }

      if (cmd === "Próxima pergunta") {
        setIsProcessing(true);
        const { data: qs } = await supabase.from('questions').select('*').eq('session_id', activeSession.id).eq('status', 'approved').order('created_at', { ascending: true });
        
        if (qs && qs.length > 0) {
           const nextQ = qs[0];
           
           const res = await fetch('/api/ai/qa-moderation', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               managerName: "Gestor",
               speakerName: speaker.name,
               action: "next_question",
               firstQuestion: nextQ.content
             })
           });

           const data = await res.json();

           if (data.success && data.text) {
             await supabase.from('events').update({
               personality: JSON.stringify({ ai_force_speak: { text: data.text, time: Date.now() }, target_screen_id: 'ALL' })
             }).eq('id', eventId);
             addLog(`Próxima Pergunta ativada.`);
             await supabase.from('questions').update({ status: 'answered' }).eq('id', nextQ.id);
           }
        } else {
           const res = await fetch('/api/ai/qa-moderation', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               managerName: "Gestor",
               speakerName: speaker.name,
               action: "closing"
             })
           });
           const data = await res.json();
           if (data.success && data.text) {
             await supabase.from('events').update({
               personality: JSON.stringify({ ai_force_speak: { text: data.text, time: Date.now() }, target_screen_id: 'ALL' })
             }).eq('id', eventId);
             addLog("Fila vazia. Teleprompter: Encerramento enviado.");
           }
        }
        setIsProcessing(false);
      }
    } catch(e) {
      setIsProcessing(false);
      addLog("ERRO de execução de comando.");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        {/* EVENT STATE */}
        <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Estado do Evento
            </h3>
            <button 
              onClick={toggleEventOpen}
              className={`font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition-colors border ${
                !isEventOpen 
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20" 
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              }`}
            >
              {!isEventOpen ? '🛑 Sala Fechada (Abrir para Público)' : '✅ Sala Aberta (Recebendo Perguntas)'}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Abertura", "Orador Atual", "Bloco de Perguntas", "Encerramento"].map(phase => (
              <button 
                key={phase}
                onClick={() => { setEventPhase(phase); addLog(`Fase alterada para: ${phase}`); }}
                className={`py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  eventPhase === phase 
                    ? "bg-indigo-600 text-white shadow-indigo-500/20" 
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-slate-700/50"
                }`}
              >
                {phase}
              </button>
            ))}
          </div>
        </div>

        {/* TRIGGERS */}
        <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-400 text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2">
            <Mic className="w-4 h-4 text-emerald-400" /> Gatilhos de Comando (Teleprompter)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button disabled={isProcessing} onClick={() => handleCommand("Digitalent, vamos às perguntas")} className="group bg-slate-800/80 border border-slate-700/50 hover:border-indigo-400/50 p-5 rounded-xl text-left transition-all relative overflow-hidden disabled:opacity-50 shadow-sm">
              <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <PlayCircle className="w-6 h-6 text-indigo-400 mb-3" />
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-bold text-slate-100">Iniciar Bloco Q&A</h4>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Limite:</label>
                  <input type="number" min="1" max="10" value={maxPerguntas} onChange={e => setMaxPerguntas(parseInt(e.target.value)||3)} className="w-12 bg-slate-900 border border-slate-700/50 rounded text-center text-xs font-bold text-indigo-400 py-1 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <p className="text-xs text-slate-400">{isProcessing ? "A processar..." : "A IA processa todas as mensagens, seleciona as melhores e abre a sessão."}</p>
            </button>
            
            <button onClick={() => handleCommand("Próxima pergunta")} className="group bg-slate-800/80 border border-slate-700/50 hover:border-emerald-400/50 p-5 rounded-xl text-left transition-all relative overflow-hidden shadow-sm disabled:opacity-50" disabled={isProcessing}>
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <MessageSquare className="w-6 h-6 text-emerald-400 mb-3" />
              <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-2">
                Próxima Pergunta / Encerrar
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{approvedQuestions.length} fila</span>
              </h4>
              <p className="text-xs text-slate-400">Chama a próxima pergunta da fila, ou a frase de encerramento se vazia.</p>
            </button>
            
            <button onClick={triggerAIProcessing} className="group bg-slate-800/80 border border-slate-700/50 hover:border-amber-400/50 p-5 rounded-xl text-left transition-all relative overflow-hidden shadow-sm disabled:opacity-50" disabled={isProcessing}>
              <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Activity className="w-6 h-6 text-amber-400 mb-3" />
              <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-2">
                Forçar Processamento IA
              </h4>
              <p className="text-xs text-slate-400">Curadoria manual. Se enviarem perguntas após fechar a sala, usa isto.</p>
            </button>
          </div>
        </div>

        {/* TELAS DO EVENTO */}
        <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-400 text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2">
            <Monitor className="w-4 h-4 text-purple-400" /> Acesso às Telas do Evento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href={`/event/${eventId}/live`} target="_blank" className="group bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 p-5 rounded-xl text-left transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <MonitorPlay className="w-6 h-6 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-slate-200 mb-1">Painel do Palestrante</h4>
                <p className="text-xs text-slate-400">Abre a tela que fica no palco para o orador interagir com a IA (Teleprompter).</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">
                Abrir em nova aba <ExternalLink className="w-3 h-3" />
              </div>
            </a>
            
            <div className="group bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 p-5 rounded-xl text-left transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <Smartphone className="w-6 h-6 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-slate-200 mb-1">Tela do Público (Q&A)</h4>
                <p className="text-xs text-slate-400">Abre a interface do celular onde a audiência envia perguntas para o sistema.</p>
                <div className="mt-4 px-3 py-2 bg-slate-900/80 border border-slate-700/50 rounded-lg text-emerald-400 font-mono text-[10px] break-all flex items-center justify-between group-hover:border-emerald-500/50 transition-colors">
                  {typeof window !== 'undefined' ? `${window.location.origin}/event/${eventId}/pergunta` : `/event/${eventId}/pergunta`}
                </div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <a href={`/event/${eventId}/pergunta`} target="_blank" className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors group-hover:translate-x-1">
                  Abrir em nova aba <ExternalLink className="w-3 h-3" />
                </a>
                <button 
                  onClick={(e) => { e.preventDefault(); setShowQR(true); }} 
                  className="flex justify-center items-center gap-2 text-xs font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-2 rounded-lg transition-colors border border-emerald-500/20"
                >
                  Gerar QR Code <Monitor className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TERMINAL / LOGS */}
      <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-sm flex flex-col h-[500px] xl:h-auto font-mono">
        <h3 className="text-slate-400 text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2">
          <TerminalSquare className="w-4 h-4 text-slate-500" /> System Output
        </h3>
        <div className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 overflow-y-auto space-y-3 text-[11px] scrollbar-thin scrollbar-thumb-slate-700 shadow-inner">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3 text-slate-400 border-l-2 border-slate-700/50 pl-2">
              <span className="text-slate-600 shrink-0">[{log.time}]</span>
              <span className={log.msg.includes("Comando") ? "text-indigo-400 font-semibold" : log.msg.includes("ERRO") ? "text-red-400 font-semibold" : "text-emerald-400"}>
                {log.msg}
              </span>
            </div>
          ))}
          <div className="animate-pulse flex gap-2 text-emerald-500/50 mt-2">
            <span>_</span>
          </div>
        </div>
      </div>

      {/* Modal QR Code */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl flex flex-col items-center relative max-w-sm w-full">
            <button 
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-2">Público (Q&A)</h3>
            <p className="text-sm text-slate-400 mb-6 text-center">Peça ao público para ler o QR Code e enviar perguntas.</p>
            
            <div className="bg-white p-4 rounded-2xl relative shadow-inner mb-6">
              <QRCode 
                value={typeof window !== 'undefined' ? `${window.location.origin}/event/${eventId}/pergunta` : `/event/${eventId}/pergunta`} 
                size={220} 
                level="H"
              />
              {/* Logo Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
                  <div className="w-12 h-12 relative flex items-center justify-center overflow-hidden rounded-xl">
                    <img src="https://i.imgur.com/7g8ZWrI.png" alt="Logo DJ" className="object-contain w-full h-full" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full">
              <div className="bg-slate-800 rounded-lg p-3 text-xs text-emerald-400 font-mono text-center break-all border border-slate-700 mb-4">
                {typeof window !== 'undefined' ? `${window.location.origin}/event/${eventId}/pergunta` : `/event/${eventId}/pergunta`}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(typeof window !== 'undefined' ? `${window.location.origin}/event/${eventId}/pergunta` : `/event/${eventId}/pergunta`);
                  addLog("Link copiado para a área de transferência.");
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm"
              >
                Copiar Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- MODULE B: QA MANAGEMENT ---
