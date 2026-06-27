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
         addLog("Erro ao enviar alerta.");
         return;
      }
      addLog(\`Alerta de Palco Enviado: \${teleprompterMsg}\`);
      setTeleprompterMsg("");
    } catch (err: any) {
      console.error(err);
    }
  };

  if (!eventId) return <div className="text-white">Nenhum evento selecionado.</div>;

  const cardStyle = "bg-[#242936] rounded-2xl border border-[#3A4150] shadow-sm p-4 flex flex-col";

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[#3A4150] pb-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors">
            <ArrowLeft className="w-5 h-5" /> <span className="text-sm font-medium">Voltar</span>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Live Controller (ID: {eventId.substring(0, 8)}...)</h2>
            <p className="text-sm text-slate-400">Gestão ao vivo da palestra e interação com a Inteligência Artificial.</p>
          </div>
        </div>
        
        <div className="font-bold text-white text-lg tracking-wide hidden md:block">
           {managerName}
        </div>

        <div className="flex gap-4">
          <button 
             onClick={() => window.location.reload()}
             className="bg-transparent border border-slate-600 hover:bg-slate-800 text-slate-200 font-medium py-2 px-5 rounded-xl transition-colors flex items-center gap-2 text-sm"
          >
             Reiniciar sistema
          </button>
          <a 
            href={\`/event/\${eventId}/live\`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white hover:bg-slate-200 text-slate-900 font-bold py-2 px-5 rounded-xl transition-colors flex items-center gap-2 shadow-sm text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir Ecrã do Evento
          </a>
        </div>
      </div>

      {/* MATCHING 6-COLUMN TWO-ROW GRID */}
      <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="min-w-[1400px] flex flex-col gap-6">
          
          {/* ROW 1 (TALL) */}
          <div className="grid grid-cols-6 gap-6 h-[520px]">
            
            {/* Col 1 */}
            <div className={\`\${cardStyle} col-span-1 h-full\`}>
              <h3 className="font-semibold text-slate-100 mb-1 flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400" /> Sequência Oradores
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4 leading-tight">Orador atual destacado verde, outros em laranja</p>
              <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                 {speakersList.length === 0 ? (
                   <div className="text-sm text-slate-500 p-4 text-center border border-dashed border-[#3A4150] rounded-lg">Vazio</div>
                 ) : (
                   speakersList.map((spk, idx) => {
                     const isActive = idx === 0;
                     return (
                       <div key={spk.id} className="flex gap-3 items-center">
                         <span className="font-black text-lg text-slate-500 w-4">{idx + 1}</span>
                         <button className={\`flex-1 py-3 px-4 rounded-xl text-sm font-bold text-left truncate transition-all shadow-sm \${isActive ? 'bg-[#22C55E] text-white' : 'bg-[#F97316] text-white'}\`}>
                           {spk.name}
                         </button>
                       </div>
                     );
                   })
                 )}
              </div>
            </div>

            {/* Col 2 */}
            <div className={\`\${cardStyle} col-span-1 h-full\`}>
              <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2 text-sm">
                <UserCheck className="w-4 h-4 text-emerald-400" /> Fila em Palco
              </h3>
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 space-y-3">
                {activeQueue.length === 0 ? (
                  <div className="text-sm text-slate-500 h-full flex items-center justify-center text-center px-4">
                    Fila Vazia. Aprove no Curador.
                  </div>
                ) : (
                  activeQueue.map((q) => (
                    <div key={q.id} className={\`p-3 rounded-xl border flex flex-col gap-2 transition-colors \${q.status === 'active' ? 'bg-[#1A2F2B] border-[#2B5C4A]' : 'bg-[#1E222B] border-[#3A4150]'}\`}>
                      <div className="flex justify-between items-center">
                        <span className={\`text-xs font-bold \${q.status === 'active' ? 'text-emerald-400' : 'text-slate-300'}\`}>{q.author_name}</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{q.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Col 3 */}
            <div className={\`\${cardStyle} col-span-1 h-full relative overflow-hidden\`}>
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none"><Activity className="w-32 h-32" /></div>
              <h3 className="font-semibold text-slate-100 mb-6 flex items-center gap-2 relative z-10 text-sm">
                <Mic className="w-4 h-4 text-indigo-400" /> Gestão da Palestra
              </h3>
              
              <div className="mb-6 relative z-10">
                 <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">1. Fase do Evento</h4>
                 <button className="w-full bg-white text-slate-900 font-bold py-2.5 rounded-xl mb-3 text-sm shadow-sm hover:bg-slate-200 transition-colors">
                   Play List Músicas
                 </button>
                 <div className="grid grid-cols-2 gap-3">
                   {["Abertura", "Intervalo", "Q&A", "Fim"].map((phase) => {
                     const isActive = eventConfig?.current_phase === phase || (!eventConfig?.current_phase && phase === "Abertura");
                     return (
                       <button 
                         key={phase} onClick={() => updatePhase(phase)}
                         className={\`py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-sm \${
                           isActive ? "bg-indigo-600 text-white" : "bg-white text-slate-900"
                         }\`}
                       >
                         {phase}
                       </button>
                     )
                   })}
                 </div>
              </div>

              <div className="flex-1 space-y-4 relative z-10">
                 <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">2. Comandos IA</h4>
                 <button onClick={triggerIntroQA} className="w-full bg-white text-slate-900 hover:bg-slate-100 p-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                   <PlayCircle className="w-4 h-4 text-indigo-600" />
                   <span className="font-bold text-sm">Iniciar Q&A</span>
                 </button>
                 <button onClick={triggerNextQuestion} className="w-full bg-white text-slate-900 hover:bg-slate-100 p-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                   <FastForward className="w-4 h-4 text-emerald-600" />
                   <span className="font-bold text-sm">Próxima Pergunta</span>
                 </button>
                 <div className="grid grid-cols-2 gap-3">
                   <button onClick={pauseAudio} className="bg-white text-slate-900 hover:bg-slate-100 p-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                     <span className="text-xs font-bold flex items-center gap-1"><Pause className="w-3 h-3 text-amber-500"/> Pausar Voz</span>
                   </button>
                   <button onClick={resumeAudio} className="bg-white text-slate-900 hover:bg-slate-100 p-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                     <span className="text-xs font-bold flex items-center gap-1"><Play className="w-3 h-3 text-sky-500"/> Continuar</span>
                   </button>
                 </div>
              </div>
            </div>

            {/* Col 4 */}
            <div className={\`\${cardStyle} col-span-1 h-full\`}>
              <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2 text-sm">
                <TerminalSquare className="w-4 h-4 text-slate-400" /> System Logs
              </h3>
              <div className="flex-1 bg-[#1E222B] border border-[#3A4150] rounded-xl p-3 overflow-y-auto space-y-1.5 text-xs font-mono scrollbar-thin scrollbar-thumb-slate-700">
                {logs.map((log, i) => (
                  <div key={i} className="flex flex-col border-l-2 border-slate-700 pl-2 py-1">
                    <span className="text-slate-500">[{log.time}]</span>
                    <span className={log.msg.includes("EMERGÊNCIA") ? "text-red-400" : log.msg.includes("Comando") ? "text-indigo-400" : "text-emerald-400"}>{log.msg}</span>
                  </div>
                ))}
                <div className="animate-pulse flex gap-2 text-emerald-500/50 pt-2 pb-1">
                   <TerminalSquare className="w-3 h-3" /> <span>Idle...</span>
                </div>
              </div>
            </div>

            {/* Col 5 */}
            <div className={\`\${cardStyle} col-span-1 h-full\`}>
               <h3 className="font-semibold text-slate-100 mb-6 text-sm">Mensagens da IA</h3>
               <div className="space-y-4">
                  {["Abertura", "Apresentação Equipa", "Coordenadores", "Almoço", "Intervalo", "Fim", "Q&A"].map((macro) => {
                    const isActiveMacro = eventConfig?.macro_state === macro;
                    // Colors matching the design image perfectly
                    const activeClasses = "bg-[#1A2F2B] border-[#2B5C4A] text-[#98C379]";
                    const inactiveClasses = "bg-[#2A1E24] border-[#5C2B36] text-[#E06C75]";
                    return (
                      <button 
                        key={macro} 
                        onClick={() => updateMacroState(macro)}
                        className={\`w-full font-bold py-3 px-3 rounded-xl text-xs text-center transition-all border \${isActiveMacro ? activeClasses : inactiveClasses}\`}
                      >
                        {macro}
                      </button>
                    );
                  })}
               </div>
            </div>

            {/* Col 6 */}
            <div className="col-span-1 h-full flex flex-col gap-6">
               <div className={\`\${cardStyle} flex-none h-[140px]\`}>
                  <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2 text-[10px] uppercase tracking-wider">
                    <Activity className="w-3 h-3 text-emerald-400" /> Estatísticas e Monitorização
                  </h3>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Active Users</p>
                      <p className="text-2xl font-black text-white flex items-center gap-2">15 <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase text-right mb-1">Q&A Velocity</p>
                      <p className="text-2xl font-black text-[#22C55E]">8.4s</p>
                    </div>
                  </div>
               </div>

               <div className={\`\${cardStyle} flex-1\`}>
                  <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2 text-[10px] uppercase tracking-wider">
                     <MessageSquare className="w-3 h-3 text-slate-400" /> Mensagens do Chat
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                     <div className="flex gap-3">
                       <div className="w-6 h-6 shrink-0 rounded-full bg-[#1A2F2B] text-[#98C379] flex items-center justify-center font-bold">Z</div>
                       <div className="bg-[#1E222B] rounded-xl p-2.5 text-slate-300 leading-relaxed shadow-sm">Nova pergunta enviada...</div>
                     </div>
                     <div className="flex gap-3">
                       <div className="w-6 h-6 shrink-0 rounded-full bg-[#2A1E24] text-[#E06C75] flex items-center justify-center font-bold">L</div>
                       <div className="bg-[#1E222B] rounded-xl p-2.5 text-slate-300 leading-relaxed shadow-sm">Apresentação da equipa</div>
                     </div>
                  </div>
               </div>
            </div>

          </div>

          {/* ROW 2 (SHORT) */}
          <div className="grid grid-cols-6 gap-6 h-[220px]">
            
            {/* Col 1 */}
            <div className={\`\${cardStyle} col-span-1 h-full flex flex-col\`}>
               <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2 text-sm">
                 <Bot className="w-4 h-4 text-indigo-400" /> Configure Voz IA
               </h3>
               <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">Qtd. de Perguntas para IA e colunas</p>
               <div className="flex items-center gap-3 mt-auto mb-4">
                 <input 
                   type="range" min="1" max="10" step="1" 
                   value={eventConfig.max_questions || 3} 
                   onChange={(e) => updateMaxQuestions(parseInt(e.target.value))}
                   className="flex-1 accent-indigo-500 h-1 bg-[#3A4150] rounded-lg appearance-none cursor-pointer" 
                 />
                 <span className="text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded text-sm">{eventConfig.max_questions || 3}</span>
               </div>
               <div className="mt-auto pt-3 border-t border-[#3A4150] text-[10px] text-slate-400 flex justify-between items-center cursor-pointer hover:text-slate-200 transition-colors">
                  <span className="flex items-center gap-1.5"><Settings className="w-3 h-3" /> Configuração da Voz IA</span> <ArrowLeft className="w-3 h-3 rotate-180" />
               </div>
            </div>

            {/* Col 2 */}
            <div className={\`\${cardStyle} col-span-1 h-full flex flex-col\`}>
               <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2 text-sm">
                 <Bot className="w-4 h-4 text-indigo-400" /> Configure Voz IA
               </h3>
               <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">Voz da IA (Idioma Base: PT-PT)</p>
               <select className="w-full bg-[#1E222B] border border-[#3A4150] text-slate-200 font-medium rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 mt-auto mb-4 shadow-sm">
                 <option>Nova (Feminina)</option>
                 <option>Onyx (Masculina)</option>
                 <option>Shimmer (Feminina)</option>
               </select>
               <div className="mt-auto pt-3 border-t border-[#3A4150] text-[10px] text-slate-400 flex justify-between items-center cursor-pointer hover:text-slate-200 transition-colors">
                  <span className="flex items-center gap-1.5"><Settings className="w-3 h-3" /> Configuração da Voz IA</span> <ArrowLeft className="w-3 h-3 rotate-180" />
               </div>
            </div>

            {/* Col 3 */}
            <div className={\`\${cardStyle} col-span-1 h-full flex flex-col justify-center\`}>
               <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-semibold text-slate-100">Perguntas ao Orador</h4>
               </div>
               <p className="text-[10px] text-slate-500 mb-6">Acesso via QR Code</p>
               <div className="flex items-center justify-between bg-[#1E222B] border border-[#3A4150] p-3 rounded-xl mt-auto">
                  <button className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors">
                     Cópia Link
                  </button>
                  <div className="bg-white p-1.5 rounded-md shadow-sm">
                     {typeof window !== 'undefined' && <QRCode value={\`\${window.location.origin}/event/\${eventId}/join\`} size={32} />}
                  </div>
               </div>
            </div>

            {/* Col 4 & 5 */}
            <div className={\`\${cardStyle} col-span-2 h-full relative overflow-hidden group cursor-pointer p-0\`}>
               <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-500"></div>
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1E222B]/90"></div>
               <div className="absolute inset-0 flex flex-col p-4 z-10">
                  <div className="flex items-center gap-2">
                     <MonitorPlay className="w-4 h-4 text-slate-300" />
                     <span className="text-slate-200 text-sm font-semibold">Preview Palco</span>
                  </div>
                  <div className="mt-auto flex justify-center pb-2">
                     <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/60 px-4 py-1.5 rounded-lg shadow-sm">Preview Palco</span>
                  </div>
               </div>
            </div>

            {/* Col 6 */}
            <div className="col-span-1 h-full flex flex-col gap-6">
               <div className={\`\${cardStyle} flex-none h-[60px] justify-center\`}>
                  <div className="flex items-center gap-3">
                     <Bell className="w-4 h-4 text-slate-400" />
                     <span className="text-xs text-slate-300 font-medium">Notificação de Alerta</span>
                  </div>
               </div>

               <div className={\`\${cardStyle} flex-1 relative overflow-hidden group cursor-pointer p-0\`}>
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 group-hover:scale-105 transition-transform duration-500"></div>
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                     <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded-lg shadow-sm">Preview Palco</span>
                  </div>
               </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('f:/desklip/Talent/src/components/admin/ManageEventModule.tsx', content, 'utf8');
console.log('ManageEventModule perfectly matched to the provided screenshot layout!');
