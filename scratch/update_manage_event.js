const fs = require('fs');

const content = `"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, ExternalLink, User, Bot, Settings, Activity, Mic, PlayCircle, FastForward, Pause, Play, MicOff, MonitorPlay, LinkIcon, UserCheck, Radio, TerminalSquare, MessageSquare, Bell } from "lucide-react";
import Link from "next/link";
import QRCode from "react-qr-code";

export function ManageEventModule({ eventId, supabase, onBack }: { eventId: string | null, supabase: any, onBack: () => void }) {
  const [eventConfig, setEventConfig] = useState<any>({ max_questions: 3 });
  const [activeQueue, setActiveQueue] = useState<any[]>([]);
  const [logs, setLogs] = useState<{time: string, msg: string}[]>([
    { time: new Date().toLocaleTimeString('pt-PT'), msg: "Sala de Controle Inicializada. Ligando ao Supabase..." }
  ]);
  const [loading, setLoading] = useState(true);
  
  // New States
  const [speakersList, setSpeakersList] = useState<any[]>([]);
  const [teleprompterMsg, setTeleprompterMsg] = useState("");
  const [managerName, setManagerName] = useState<string>("A procurar gestor...");

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('pt-PT');
    setLogs(prev => [{ time, msg }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    if (!eventId) return;

    const fetchInitialData = async () => {
      setLoading(true);
      const { data } = await supabase.from('events').select('personality').eq('id', eventId).single();
      if (data?.personality) {
        try { 
          const parsed = JSON.parse(data.personality);
          setEventConfig({ ...parsed, max_questions: parsed.max_questions || 3 }); 
        } catch(e) {
          setEventConfig({ max_questions: 3 });
        }
      } else {
        setEventConfig({ max_questions: 3 });
      }
      
      // Fetch Speakers via sessions
      const { data: sessionsData } = await supabase.from('sessions').select('*, speaker:speakers(*)').eq('event_id', eventId).order('created_at', { ascending: true });
      if (sessionsData) {
         setSpeakersList(sessionsData.map((s:any) => s.speaker).filter(Boolean));
      }

      // Fetch Manager Name
      const { data: managerData } = await supabase.from('managers').select('name').eq('event_id', eventId).limit(1).maybeSingle();
      if (managerData?.name) {
         setManagerName(managerData.name);
      } else {
         setManagerName("Gestor não atribuído");
      }
      
      await fetchQuestions();
      setLoading(false);
      addLog("Sincronização concluída.");
    };

    fetchInitialData();

    const eventSub = supabase.channel('event_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: \`id=eq.\${eventId}\` }, (payload: any) => {
         if(payload.new.personality) {
           try { 
             const parsed = JSON.parse(payload.new.personality);
             setEventConfig((prev: any) => ({...prev, ...parsed, max_questions: parsed.max_questions || prev.max_questions})); 
           } catch(e){}
         }
      }).subscribe();

    const questionsSub = supabase.channel('questions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
         fetchQuestions();
      }).subscribe();

    return () => {
      supabase.removeChannel(eventSub);
      supabase.removeChannel(questionsSub);
    };
  }, [eventId, supabase]);

  const fetchQuestions = async () => {
    const { data: sessions } = await supabase.from('sessions').select('id').eq('event_id', eventId);
    if (!sessions || sessions.length === 0) return;
    const sessionIds = sessions.map((s: any) => s.id);
    const { data: approved } = await supabase.from('questions')
      .select('*')
      .in('session_id', sessionIds)
      .in('status', ['approved', 'active'])
      .order('created_at', { ascending: true });
    if (approved) setActiveQueue(approved);
  };

  const updatePhase = async (phase: string) => {
    const newConfig = { ...eventConfig, current_phase: phase };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(\`Fase alterada para: \${phase}\`);
  };

  const updateMacroState = async (state: string) => {
    const predefinedText = eventConfig?.macro_texts?.[state];
    const alertUpdate = predefinedText ? { 
      teleprompter_alert: predefinedText, 
      teleprompter_alert_time: Date.now(),
      ai_force_speak: { text: predefinedText, time: Date.now() }
    } : {};
    
    const newConfig = { ...eventConfig, macro_state: state, ...alertUpdate };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    
    addLog(\`Macro-Estado disparado: \${state}\`);
    if (predefinedText) {
      addLog(\`Mensagem da IA enviada: \${state}\`);
    }
  };

  const triggerNextQuestion = async () => {
    const nextQ = activeQueue.find(q => q.status === 'approved');
    if (!nextQ) {
      addLog("Fila vazia: não há perguntas aprovadas.");
      return;
    }
    const currentActive = activeQueue.find(q => q.status === 'active');
    if (currentActive) {
      await supabase.from('questions').update({ status: 'completed' }).eq('id', currentActive.id);
    }
    await supabase.from('questions').update({ status: 'active' }).eq('id', nextQ.id);
    
    addLog(\`Próxima Pergunta em palco: "\${nextQ.content}"\`);
    
    const newConfig = { ...eventConfig, kill_audio: false, pause_audio: false };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const triggerIntroQA = async () => {
    addLog("Comando: Iniciar Bloco Q&A!");
    const newConfig = { ...eventConfig, kill_audio: false, pause_audio: false };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const killAudio = async () => {
    addLog("EMERGÊNCIA: Comando de Mutar IA enviado!");
    const newConfig = { ...eventConfig, kill_audio: true };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const pauseAudio = async () => {
    addLog("Comando: Pausar IA");
    const newConfig = { ...eventConfig, pause_audio: true };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const resumeAudio = async () => {
    addLog("Comando: Continuar IA");
    const newConfig = { ...eventConfig, pause_audio: false, kill_audio: false };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const changeSlideIndex = async (increment: boolean) => {
    const currentIndex = eventConfig.current_slide_index || 0;
    const newIndex = increment ? currentIndex + 1 : Math.max(0, currentIndex - 1);
    
    const newConfig = { ...eventConfig, current_slide_index: newIndex };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(\`Slide alterado manualmente para: \${newIndex + 1}\`);
  };

  const toggleSliderMode = async () => {
    const newState = !eventConfig?.slider_mode_active;
    const newConfig = { ...eventConfig, slider_mode_active: newState };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(\`Modo Slider alterado para: \${newState ? 'ATIVO' : 'INATIVO'}\`);
  };

  const updateMaxQuestions = async (val: number) => {
    const newConfig = { ...eventConfig, max_questions: val };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(\`Limite de perguntas da IA alterado para: \${val}\`);
  };

  const sendTeleprompterAlert = async () => {
    if(!teleprompterMsg.trim()) return;
    try {
      const newConfig = { ...eventConfig, teleprompter_alert: teleprompterMsg, teleprompter_alert_time: Date.now() };
      setEventConfig(newConfig);
      
      const { error } = await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
      
      if (error) {
        console.error("Supabase Error:", error);
        alert("Erro ao enviar para a base de dados: " + error.message);
        addLog("Erro ao enviar alerta.");
        return;
      }
      
      addLog(\`Alerta de Palco Enviado: \${teleprompterMsg}\`);
      setTeleprompterMsg("");
    } catch (err: any) {
      console.error("App Error:", err);
      alert("Erro na aplicação: " + err.message);
    }
  };

  if (!eventId) return <div className="text-white">Nenhum evento selecionado.</div>;

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">Live Controller (ID: {eventId.substring(0, 8)}...)</h2>
            <p className="text-sm text-slate-400">Gestão ao vivo da palestra e interação com a Inteligência Artificial.</p>
          </div>
        </div>
        
        <div className="font-bold text-white text-lg tracking-wide hidden md:block">
           {managerName}
        </div>

        <div className="flex gap-3">
          <button 
             onClick={() => window.location.reload()}
             className="bg-transparent border border-slate-600 hover:bg-slate-800 text-slate-200 font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
          >
             Reiniciar sistema
          </button>
          <a 
            href={\`/event/\${eventId}/live\`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white hover:bg-slate-200 text-slate-900 font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir Ecrã do Evento
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
        
        {/* COLUNA 1 */}
        <div className="space-y-4 flex flex-col xl:col-span-1">
          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm flex-1 flex flex-col min-h-[400px]">
            <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-slate-400" /> Sequência Oradores
            </h3>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-3 leading-tight">Orador atual destacado verde, outros em laranja</p>
            
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
               {speakersList.length === 0 ? (
                 <div className="text-xs text-slate-500 p-3 text-center border border-dashed border-slate-700/50 rounded-lg">Nenhum orador cadastrado</div>
               ) : (
                 speakersList.map((spk, idx) => {
                   const isActive = idx === 0; // Temporário
                   return (
                     <div key={spk.id} className="flex gap-2 items-center">
                       <span className="font-black text-lg text-slate-500 w-4">{idx + 1}</span>
                       <button className={\`flex-1 py-2 px-3 rounded-xl text-xs font-bold text-left truncate transition-all border shadow-sm \${isActive ? 'bg-emerald-500/80 border-emerald-400 text-white' : 'bg-orange-500/80 border-orange-400 text-white hover:opacity-90'}\`}>
                         {spk.name}
                       </button>
                     </div>
                   );
                 })
               )}
            </div>
          </div>

          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm flex flex-col h-[180px]">
             <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2 text-xs">
               <Bot className="w-4 h-4 text-indigo-400" /> Configura Voz IA
             </h3>
             <p className="text-[9px] text-slate-500 mb-3 leading-tight">Qtd. de Perguntas para IA e colunas</p>
             <div className="flex items-center gap-2 mt-auto">
               <input 
                 type="range" min="1" max="10" step="1" 
                 value={eventConfig.max_questions || 3} 
                 onChange={(e) => updateMaxQuestions(parseInt(e.target.value))}
                 className="flex-1 accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" 
               />
               <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded text-xs">{eventConfig.max_questions || 3}</span>
             </div>
             
             <div className="mt-4 pt-4 border-t border-slate-700/50 text-[10px] text-slate-400 flex justify-between items-center cursor-pointer hover:text-slate-200">
                <Settings className="w-3 h-3" /> Configuração da Voz IA <ArrowLeft className="w-3 h-3 rotate-180" />
             </div>
          </div>
        </div>

        {/* COLUNA 2 */}
        <div className="space-y-4 flex flex-col xl:col-span-1">
          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm flex flex-col h-[400px]">
            <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2 text-sm">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Fila em Palco
            </h3>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 bg-slate-900/50 rounded-xl border border-slate-700/50 p-2">
              {activeQueue.length === 0 ? (
                <div className="text-[10px] text-slate-500 h-full flex items-center justify-center text-center px-4">
                  Fila Vazia. Aprove no Curador.
                </div>
              ) : (
                activeQueue.map((q) => (
                  <div key={q.id} className={\`p-2 mb-2 rounded-xl border flex flex-col gap-1 \${q.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/80 border-slate-700/50'}\`}>
                    <div className="flex justify-between items-center">
                      <span className={\`text-[9px] font-bold \${q.status === 'active' ? 'text-emerald-400' : 'text-slate-300'}\`}>{q.author_name}</span>
                      {q.status === 'active' && <span className="flex items-center gap-1 text-[8px] text-emerald-400 uppercase bg-emerald-500/20 px-1.5 py-0.5 rounded-full"><Radio className="w-2 h-2"/> Ativo</span>}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">{q.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm flex flex-col h-[180px]">
             <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2 text-xs">
               <Bot className="w-4 h-4 text-indigo-400" /> Configura Voz IA
             </h3>
             <p className="text-[9px] text-slate-500 mb-3 leading-tight">Voz da IA (Idioma Base: PT-PT)</p>
             <select className="w-full bg-slate-800/50 border border-slate-700/50 text-slate-200 font-medium rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-indigo-500 mt-auto">
               <option>Nova (Feminina)</option>
               <option>Onyx (Masculina)</option>
               <option>Shimmer (Feminina)</option>
             </select>

             <div className="mt-4 pt-4 border-t border-slate-700/50 text-[10px] text-slate-400 flex justify-between items-center cursor-pointer hover:text-slate-200">
                <Settings className="w-3 h-3" /> Configuração da Voz IA <ArrowLeft className="w-3 h-3 rotate-180" />
             </div>
          </div>
        </div>

        {/* COLUNA 3 */}
        <div className="space-y-4 flex flex-col xl:col-span-1">
          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm flex flex-col relative overflow-hidden h-[400px]">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none"><Activity className="w-24 h-24" /></div>
            
            <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2 relative z-10 text-sm">
              <Mic className="w-4 h-4 text-indigo-400" /> Gestão da Palestra
            </h3>
            
            <div className="mb-4 relative z-10">
               <h4 className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-2">1. Fase do Evento</h4>
               
               <button className="w-full bg-white text-slate-900 font-bold py-1.5 rounded-xl mb-2 text-xs shadow-sm hover:bg-slate-200 transition-colors">
                 Play List Musicas
               </button>

               <div className="grid grid-cols-2 gap-2">
                 {["Abertura", "Intervalo", "Q&A", "Fim"].map((phase) => {
                   const isActive = eventConfig?.current_phase === phase || (!eventConfig?.current_phase && phase === "Abertura");
                   return (
                     <button 
                       key={phase} onClick={() => updatePhase(phase)}
                       className={\`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all \${
                         isActive ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                       }\`}
                     >
                       {phase}
                     </button>
                   )
                 })}
               </div>
            </div>

            <div className="flex-1 space-y-3 relative z-10">
               <h4 className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-2">2. Comandos IA</h4>
               
               <button onClick={triggerIntroQA} className="w-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 p-2 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                 <PlayCircle className="w-4 h-4 text-indigo-600" />
                 <span className="font-bold text-xs">Iniciar Q&A</span>
               </button>

               <button onClick={triggerNextQuestion} className="w-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 p-2 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                 <FastForward className="w-4 h-4 text-emerald-600" />
                 <span className="font-bold text-xs">Próxima Pergunta</span>
               </button>

               <div className="grid grid-cols-2 gap-2">
                 <button onClick={pauseAudio} className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 p-2 rounded-xl flex items-center justify-center gap-1 transition-all shadow-sm">
                   <Pause className="w-3 h-3 text-amber-500" />
                   <span className="text-[10px] font-bold">Pausar Voz</span>
                 </button>
                 <button onClick={resumeAudio} className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 p-2 rounded-xl flex items-center justify-center gap-1 transition-all shadow-sm">
                   <Play className="w-3 h-3 text-sky-500" />
                   <span className="text-[10px] font-bold">Continuar</span>
                 </button>
               </div>

               <button onClick={killAudio} className="w-full bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 p-2 rounded-xl flex items-center justify-center gap-2 transition-all text-red-200 group">
                 <MicOff className="w-3 h-3 group-hover:animate-pulse" />
                 <span className="font-bold text-[10px] uppercase tracking-wider">Mutar IA (Stop)</span>
               </button>
            </div>

            <div className="relative z-10 pt-3 mt-3 border-t border-slate-700/50">
               <h4 className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                 3. Controlo Manual Slides
               </h4>
               <button onClick={toggleSliderMode} className={\`w-full p-2 mb-2 rounded-xl flex items-center justify-center gap-2 transition-all group border \${eventConfig?.slider_mode_active ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/50'}\`}>
                 <span className="font-bold text-[10px] uppercase tracking-wider">
                   {eventConfig?.slider_mode_active ? 'Modo Slider: ATIVO' : 'Ativar Modo Slider'}
                 </span>
               </button>
               <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => changeSlideIndex(false)} className="bg-slate-800/50 border border-slate-700/50 text-slate-400 p-1.5 rounded-lg text-[9px] font-bold uppercase">&larr; Anterior</button>
                 <button onClick={() => changeSlideIndex(true)} className="bg-slate-800/50 border border-slate-700/50 text-slate-400 p-1.5 rounded-lg text-[9px] font-bold uppercase">Próximo &rarr;</button>
               </div>
            </div>
          </div>

          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm h-[180px] flex flex-col justify-center">
             <div className="flex items-center gap-2 mb-1">
                <LinkIcon className="w-4 h-4 text-slate-400" />
                <h4 className="text-sm font-semibold text-slate-100">Perguntas ao Orador</h4>
             </div>
             <p className="text-[9px] text-slate-500 mb-3">Acesso via QR Code</p>
             <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700/50 p-2 rounded-xl mt-auto">
                <button className="text-xs font-medium text-slate-400 hover:text-slate-200">
                   Copiar Link
                </button>
                <div className="bg-white p-1 rounded">
                   {typeof window !== 'undefined' && <QRCode value={\`\${window.location.origin}/event/\${eventId}/join\`} size={32} />}
                </div>
             </div>
          </div>
        </div>

        {/* COLUNA 4 */}
        <div className="space-y-4 flex flex-col xl:col-span-1">
          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm flex flex-col h-[400px]">
            <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2 text-sm">
              <TerminalSquare className="w-4 h-4 text-slate-400" /> System Logs
            </h3>
            <div className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl p-2 overflow-y-auto space-y-1 text-[9px] font-mono scrollbar-thin scrollbar-thumb-slate-700">
              {logs.map((log, i) => (
                <div key={i} className="flex flex-col border-l border-slate-700 pl-1 py-0.5">
                  <span className="text-slate-600">[{log.time}]</span>
                  <span className={log.msg.includes("EMERGÊNCIA") ? "text-red-400" : log.msg.includes("Comando") ? "text-indigo-400" : "text-emerald-400"}>{log.msg}</span>
                </div>
              ))}
              <div className="animate-pulse flex gap-1 text-emerald-500/50 pt-1">
                 <TerminalSquare className="w-2 h-2" /> <span>Idle...</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm flex flex-col h-[180px]">
            <p className="text-[9px] text-slate-400 mb-2">Mensagem direta para o operador ou teleprompter.</p>
            <textarea 
               rows={2} 
               value={teleprompterMsg}
               onChange={(e) => setTeleprompterMsg(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTeleprompterAlert(); } }}
               className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg p-2 text-slate-200 text-xs resize-none focus:outline-none mb-2" 
               placeholder="Mensagem rápida..."
            />
            <div className="flex justify-between items-center mt-auto">
               <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Event: Online</span>
               <button onClick={sendTeleprompterAlert} className="bg-white hover:bg-slate-200 text-slate-900 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm uppercase">Enviar</button>
            </div>
          </div>
        </div>

        {/* COLUNA 5 */}
        <div className="space-y-4 flex flex-col xl:col-span-1">
           <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm h-[200px]">
             <h3 className="font-semibold text-slate-100 mb-3 text-sm">Mensagens da IA</h3>
             <div className="space-y-2">
                {["Abertura", "Apresentação Equipa", "Cordenadores", "Almoço", "Encerramento"].map((macro) => {
                  const isActiveMacro = eventConfig?.macro_state === macro;
                  return (
                    <button 
                      key={macro} 
                      onClick={() => updateMacroState(macro)}
                      className={\`w-full hover:opacity-90 font-bold py-1.5 px-2 rounded-lg text-[11px] text-center transition-all shadow-sm border \${isActiveMacro ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-200'}\`}
                    >
                      {macro}
                    </button>
                  );
                })}
             </div>
           </div>

           <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-sm flex-1 overflow-hidden relative group cursor-pointer flex items-center justify-center min-h-[380px]">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-emerald-500/10"></div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-[2px]">
                 <div className="text-center">
                    <MonitorPlay className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-slate-300 text-xs font-semibold uppercase tracking-widest">Preview Palco</span>
                 </div>
              </div>
           </div>
        </div>

        {/* COLUNA 6 */}
        <div className="space-y-4 flex flex-col xl:col-span-1">
           <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm h-[130px]">
              <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider">
                <Activity className="w-3 h-3 text-emerald-400" /> Estatísticas e Monitorização
              </h3>
              <div className="flex justify-between mb-2">
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Active Users</p>
                  <p className="text-xl font-black text-white flex items-center gap-1">15 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span></p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase text-right">Q&A Velocity</p>
                  <p className="text-xl font-black text-emerald-400">8.4s</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] border-t border-slate-700/50 pt-2">
                 <span className="text-slate-400">System Health: <span className="text-white font-bold">90%</span></span>
                 <span className="text-slate-400">Next Event: <span className="text-white font-bold">0h 01m</span></span>
              </div>
           </div>

           <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm h-[180px] flex flex-col">
              <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider">
                 <MessageSquare className="w-3 h-3 text-slate-400" /> Mensagens do Chat
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 text-[9px]">
                 <div className="flex gap-2">
                   <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">S</div>
                   <div className="bg-slate-800/50 rounded-lg p-1.5 text-slate-300">Nova pergunta enviada...</div>
                 </div>
                 <div className="flex gap-2">
                   <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">L</div>
                   <div className="bg-slate-800/50 rounded-lg p-1.5 text-slate-300">Apresentação não equipa?</div>
                 </div>
              </div>
           </div>

           <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm h-[70px] flex items-center gap-3">
              <Bell className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Notificação de Alerta</span>
           </div>

           <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-sm flex-1 overflow-hidden relative min-h-[150px] group">
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <MonitorPlay className="w-8 h-8 text-white" />
              </div>
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
              <div className="absolute inset-0 flex items-end justify-center pb-4 z-0">
                 <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded">Preview Palco</span>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
`;

fs.writeFileSync('f:/desklip/Talent/src/components/admin/ManageEventModule.tsx', content, 'utf8');
console.log('ManageEventModule refactored successfully to 6 columns!');
