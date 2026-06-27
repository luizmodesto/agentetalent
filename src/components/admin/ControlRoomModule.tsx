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
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        
        const { data: session } = await supabase.from('sessions').select('*, speakers(name, bio)').eq('event_id', eventId).eq('status', 'live').maybeSingle();
        if (session) {
          setActiveSession(session);
          if (session.speakers) setSpeaker(session.speakers);
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

  const handleCommand = async (cmd: string) => {
    addLog(`Comando enviado: "${cmd}"`);
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

      if (cmd === "Digitalent, vamos às perguntas") {
        if (!activeSession || !speaker) {
          addLog("ERRO: Nenhuma sessão ativa encontrada.");
          return;
        }

        setIsProcessing(true);
        addLog("A processar perguntas via OpenAI...");

        // Call our API
        const res = await fetch('/api/ai/qa-moderation', {
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
        setIsProcessing(false);

        if (data.success) {
           addLog(`IA Processou ${data.processed} perguntas: ${data.approved} aprovadas, ${data.rejected} rejeitadas.`);
           if (data.closing_remark) {
             setClosingRemark(data.closing_remark);
           }
           // Trigger AI Introduction
           const introText = `Muito bem. Recebi várias perguntas fantásticas do público. Vamos começar.`;
           await supabase.from('events').update({
             personality: JSON.stringify({ ai_force_speak: { text: introText, time: Date.now() }, target_screen_id: 'ALL' })
           }).eq('id', eventId);
           addLog("Teleprompter: Introdução do Q&A enviada.");
        } else {
           addLog("ERRO no processamento de IA.");
        }
      }

      if (cmd === "Próxima pergunta") {
        // Find next approved question that hasn't been read
        const { data: qs } = await supabase.from('questions').select('*').eq('session_id', activeSession.id).eq('status', 'approved').order('created_at', { ascending: true });
        
        if (qs && qs.length > 0) {
           const nextQ = qs[0];
           
           // If it's the last question, append closing
           let speech = nextQ.content;
           if (qs.length === 1) {
             speech += " " + (closingRemark || "Muito obrigado pelas tuas respostas. Foi um prazer contar contigo.");
           }

           // Send to teleprompter
           await supabase.from('events').update({
             personality: JSON.stringify({ ai_force_speak: { text: speech, time: Date.now() }, target_screen_id: 'ALL' })
           }).eq('id', eventId);
           
           addLog(`Pergunta ativada: "${nextQ.content.substring(0, 30)}..."`);
           
           // Mark as answered
           await supabase.from('questions').update({ status: 'answered' }).eq('id', nextQ.id);
        } else {
           addLog("Aviso: Não há mais perguntas aprovadas na fila.");
        }
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
        <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-neutral-400 text-sm font-medium mb-4 uppercase tracking-wider">Estado do Evento</h3>
          <div className="flex gap-2 flex-wrap">
            {["Abertura", "Orador Atual", "Bloco de Perguntas", "Encerramento"].map(phase => (
              <button 
                key={phase}
                onClick={() => { setEventPhase(phase); addLog(`Fase alterada para: ${phase}`); }}
                className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  eventPhase === phase 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                    : "bg-[#1a1a1a] text-neutral-400 hover:bg-neutral-800 border border-neutral-800"
                }`}
              >
                {phase}
              </button>
            ))}
          </div>
        </div>

        {/* TRIGGERS */}
        <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-neutral-400 text-sm font-medium mb-4 uppercase tracking-wider flex items-center gap-2">
            <Mic className="w-4 h-4" /> Gatilhos de Comando (Teleprompter)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button disabled={isProcessing} onClick={() => handleCommand("Digitalent, vamos às perguntas")} className="group bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-neutral-800 hover:border-indigo-500/50 p-5 rounded-xl text-left transition-all relative overflow-hidden disabled:opacity-50">
              <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <PlayCircle className="w-6 h-6 text-indigo-400 mb-3" />
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-semibold text-white">Iniciar Bloco Q&A</h4>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <label className="text-[10px] text-neutral-500 uppercase">Limite:</label>
                  <input type="number" min="1" max="10" value={maxPerguntas} onChange={e => setMaxPerguntas(parseInt(e.target.value)||3)} className="w-12 bg-neutral-900 border border-neutral-700 rounded text-center text-xs text-white py-1" />
                </div>
              </div>
              <p className="text-xs text-neutral-500">{isProcessing ? "A processar..." : "A IA processa todas as mensagens, seleciona as melhores e abre a sessão."}</p>
            </button>
            
            <button onClick={() => handleCommand("Próxima pergunta")} className="group bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-neutral-800 hover:border-emerald-500/50 p-5 rounded-xl text-left transition-all relative overflow-hidden">
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <MessageSquare className="w-6 h-6 text-emerald-400 mb-3" />
              <h4 className="font-semibold text-white mb-1">Próxima Pergunta <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full ml-2">{approvedQuestions.length} fila</span></h4>
              <p className="text-xs text-neutral-500">Chama a próxima pergunta filtrada pela IA. Fecha automaticamente na última.</p>
            </button>
          </div>
        </div>

        {/* TELAS DO EVENTO */}
        <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-neutral-400 text-sm font-medium mb-4 uppercase tracking-wider flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Acesso às Telas do Evento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href={`/event/${eventId}/live`} target="_blank" className="group bg-gradient-to-br from-purple-900/20 to-[#111] border border-purple-500/30 hover:border-purple-500 p-5 rounded-xl text-left transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <MonitorPlay className="w-6 h-6 text-purple-400 mb-3" />
                <h4 className="font-semibold text-white mb-1">Painel do Palestrante</h4>
                <p className="text-xs text-neutral-500">Abre a tela que fica no palco para o orador interagir com a IA (Teleprompter).</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-purple-400 group-hover:translate-x-1 transition-transform">
                Abrir em nova aba <ExternalLink className="w-3 h-3" />
              </div>
            </a>
            
            <a href={`/event/${eventId}/pergunta`} target="_blank" className="group bg-gradient-to-br from-emerald-900/20 to-[#111] border border-emerald-500/30 hover:border-emerald-500 p-5 rounded-xl text-left transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <Smartphone className="w-6 h-6 text-emerald-400 mb-3" />
                <h4 className="font-semibold text-white mb-1">Tela do Público (Q&A)</h4>
                <p className="text-xs text-neutral-500">Abre a interface do celular onde a audiência envia perguntas para o sistema.</p>
                <div className="mt-4 px-3 py-2 bg-black/40 border border-emerald-500/20 rounded-lg text-emerald-300 font-mono text-[10px] break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/event/${eventId}/pergunta` : `/event/${eventId}/pergunta`}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-400 group-hover:translate-x-1 transition-transform">
                Abrir em nova aba <ExternalLink className="w-3 h-3" />
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* TERMINAL / LOGS */}
      <div className="bg-[#0f0f13] border border-neutral-800 rounded-2xl p-6 flex flex-col h-[500px] xl:h-auto font-mono">
        <h3 className="text-neutral-500 text-xs mb-4 uppercase flex items-center gap-2">
          <TerminalSquare className="w-4 h-4" /> DIGITALENT System Output
        </h3>
        <div className="flex-1 overflow-y-auto space-y-2 text-sm">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3 text-neutral-400">
              <span className="text-neutral-600 shrink-0">[{log.time}]</span>
              <span className={log.msg.includes("Comando") ? "text-indigo-400" : "text-emerald-500"}>
                {log.msg}
              </span>
            </div>
          ))}
          <div className="animate-pulse flex gap-2 text-neutral-600">
            <span>_</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MODULE B: QA MANAGEMENT ---