"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, ExternalLink, User, Bot, Settings, Activity, Mic, PlayCircle, FastForward, Pause, Play, MicOff, MonitorPlay, LinkIcon, UserCheck, Radio, TerminalSquare } from "lucide-react";
import Link from "next/link";
import QRCode from "react-qr-code";

export function ManageEventModule({ eventId, supabase, onBack }: { eventId: string | null, supabase: any, onBack: () => void }) {
  const [eventConfig, setEventConfig] = useState<any>({ max_questions: 3 });
  const [activeQueue, setActiveQueue] = useState<any[]>([]);
  const [logs, setLogs] = useState<{time: string, msg: string}[]>([
    { time: new Date().toLocaleTimeString('pt-PT'), msg: "Sala de Controle Inicializada. Ligando ao Supabase..." }
  ]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pairingId, setPairingId] = useState("");
  
  // New States
  const [sessionsList, setSessionsList] = useState<any[]>([]);
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
      const { data: eventData } = await supabase.from('events').select('personality').eq('id', eventId).single();
      let config: any = { max_questions: 3 };
      if (eventData?.personality) {
        try {
          config = { ...config, ...JSON.parse(eventData.personality) };
        } catch (e) {
          console.error(e);
        }
      }
      
      if (config.pairing_code) {
        setPairingId(config.pairing_code);
        setEventConfig(config);
      } else {
        const newCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        setPairingId(newCode);
        const updatedConfig = { ...config, pairing_code: newCode };
        setEventConfig(updatedConfig);
        await supabase.from('events').update({ personality: JSON.stringify(updatedConfig) }).eq('id', eventId);
      }
      
      // Fetch Speakers via sessions
      const { data: sessionsData, error: sessionsError } = await supabase.from('sessions').select('*, speakers(*)').eq('event_id', eventId).order('created_at', { ascending: true });
      if (sessionsError) {
         console.error("Erro ao buscar oradores:", sessionsError);
      }
      if (sessionsData) {
         setSessionsList(sessionsData);
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, (payload: any) => {
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
    const newConfig = { ...eventConfig, current_phase: phase, target_screen_id: pairingId || null };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(`Fase alterada para: ${phase}`);
  };

  const updateMacroState = async (state: string) => {
    const predefinedText = eventConfig?.macro_texts?.[state];
    const alertUpdate = predefinedText ? { 
      teleprompter_alert: predefinedText, 
      teleprompter_alert_time: Date.now(),
      ai_force_speak: { text: predefinedText, time: Date.now() }
    } : {};
    
    const newConfig = { ...eventConfig, macro_state: state, ...alertUpdate, target_screen_id: pairingId || null };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    
    addLog(`Macro-Estado disparado: ${state}`);
    if (predefinedText) {
      addLog(`Mensagem da IA enviada: ${state}`);
    }
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [closingRemark, setClosingRemark] = useState("");

  const triggerNextQuestion = async () => {
    const activeSession = sessionsList.find(s => s.status === 'live');
    if (!activeSession) {
      addLog("Nenhuma sessão ativa.");
      return;
    }
    
    // Fetch fresh approved questions
    const { data: qs } = await supabase.from('questions').select('*').eq('session_id', activeSession.id).eq('status', 'approved').order('created_at', { ascending: true });

    if (qs && qs.length > 0) {
       const nextQ = qs[0];
       let speech = nextQ.content;
       if (qs.length === 1) {
         speech += " " + (closingRemark || "Muito obrigado pelas tuas respostas. Foi um prazer contar contigo.");
       }

       const newConfig = { ...eventConfig, kill_audio: false, pause_audio: false, target_screen_id: pairingId || null, ai_force_speak: { text: speech, time: Date.now() } };
       setEventConfig(newConfig);
       await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
       
       await supabase.from('questions').update({ status: 'answered' }).eq('id', nextQ.id);
       addLog(`Pergunta ativada: "${nextQ.content.substring(0, 30)}..."`);
       fetchQuestions(); // Refresh UI
    } else {
       addLog("Fila vazia: não há perguntas aprovadas na fila.");
    }
  };

  const triggerIntroQA = async () => {
    addLog("Comando: Iniciar Bloco Q&A!");
    setIsProcessing(true);
    addLog("A processar perguntas via OpenAI...");

    try {
      const activeSession = sessionsList.find(s => s.status === 'live');
      if (!activeSession) {
         addLog("ERRO: Nenhuma sessão ativa encontrada.");
         setIsProcessing(false);
         return;
      }
      const speakerObj = activeSession.speakers || activeSession.speaker;

      const res = await fetch('/api/ai/qa-moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          maxPerguntas: eventConfig.max_questions || 3,
          speakerName: speakerObj?.name || 'Orador',
          theme: speakerObj?.bio || ''
        })
      });

      const data = await res.json();
      setIsProcessing(false);

      if (data.success) {
         addLog(`IA Processou ${data.processed} perguntas: ${data.approved} aprovadas, ${data.rejected} rejeitadas.`);
         if (data.closing_remark) setClosingRemark(data.closing_remark);

         const introText = `Muito bem. Recebi várias perguntas fantásticas do público. Vamos começar.`;
         const newConfig = { ...eventConfig, kill_audio: false, pause_audio: false, target_screen_id: pairingId || null, ai_force_speak: { text: introText, time: Date.now() } };
         setEventConfig(newConfig);
         await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
         fetchQuestions();
      } else {
         addLog("ERRO no processamento de IA.");
      }
    } catch (e) {
      setIsProcessing(false);
      addLog("ERRO de execução de comando.");
    }
  };

  const toggleAiMode = async () => {
    const newMode = eventConfig?.ai_mode === 'auto' ? 'manual' : 'auto';
    const newConfig = { ...eventConfig, ai_mode: newMode, target_screen_id: pairingId || null };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(`Modo de Q&A alterado para: ${newMode.toUpperCase()}`);
  };

  const killAudio = async () => {
    addLog("EMERGÊNCIA: Comando de Mutar IA enviado!");
    const newConfig = { ...eventConfig, kill_audio: true, target_screen_id: pairingId || null };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const pauseAudio = async () => {
    addLog("Comando: Pausar IA");
    const newConfig = { ...eventConfig, pause_audio: true, target_screen_id: pairingId || null };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const resumeAudio = async () => {
    addLog("Comando: Continuar IA");
    const newConfig = { ...eventConfig, pause_audio: false, kill_audio: false, target_screen_id: pairingId || null };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const changeSlideIndex = async (increment: boolean) => {
    const currentIndex = eventConfig.current_slide_index || 0;
    const newIndex = increment ? currentIndex + 1 : Math.max(0, currentIndex - 1);
    
    const newConfig = { ...eventConfig, current_slide_index: newIndex, target_screen_id: pairingId || null };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(`Slide alterado manualmente para: ${newIndex + 1}`);
  };

  const toggleSliderMode = async () => {
    const newState = !eventConfig?.slider_mode_active;
    const newConfig = { ...eventConfig, slider_mode_active: newState, target_screen_id: pairingId || null };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(`Modo Slider alterado para: ${newState ? 'ATIVO' : 'INATIVO'}`);
  };

  const updateMaxQuestions = async (val: number) => {
    const newConfig = { ...eventConfig, max_questions: val };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(`Limite de perguntas da IA alterado para: ${val}`);
  };

  const activateSession = async (sessionId: string) => {
    await supabase.from('sessions').update({ status: 'waiting' }).eq('event_id', eventId).eq('status', 'live');
    await supabase.from('sessions').update({ status: 'live' }).eq('id', sessionId);
    setSessionsList(prev => prev.map(s => ({
       ...s, 
       status: s.id === sessionId ? 'live' : (s.status === 'live' ? 'waiting' : s.status)
    })));
    addLog(`Orador ativado no ecrã principal.`);
  };

  const sendTeleprompterAlert = async () => {
    if(!teleprompterMsg.trim()) return;
    try {
      const newConfig = { ...eventConfig, teleprompter_alert: teleprompterMsg, teleprompter_alert_time: Date.now(), target_screen_id: pairingId || null };
      setEventConfig(newConfig);
      
      const { error } = await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
      
      if (error) {
        console.error("Supabase Error:", error);
        alert("Erro ao enviar para a base de dados: " + error.message);
        addLog("Erro ao enviar alerta.");
        return;
      }
      
      addLog(`Alerta de Palco Enviado: ${teleprompterMsg}`);
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

        <div className="flex gap-3 items-center relative">
          <div className="flex items-center bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-xs text-slate-400 mr-2 font-bold uppercase">Pareamento:</span>
            <input 
              type="text" 
              value={pairingId} 
              onChange={async (e) => {
                const val = e.target.value.toUpperCase();
                setPairingId(val);
                if (val.length >= 4) {
                   const newConfig = { ...eventConfig, pairing_code: val };
                   setEventConfig(newConfig);
                   await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
                }
              }}
              placeholder="Ex: A7B2"
              className="w-16 bg-transparent text-emerald-400 text-sm font-black focus:outline-none placeholder-slate-600 text-center uppercase"
              maxLength={6}
            />
          </div>

          <button 
             onClick={() => window.location.reload()}
             className="bg-transparent border border-slate-600 hover:bg-slate-800 text-slate-200 font-medium py-2 px-3 rounded-xl transition-colors flex items-center gap-2 text-sm"
          >
             Reiniciar
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-white hover:bg-slate-200 text-slate-900 font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 shadow-sm text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir Ecrã
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
                <a href={`/event/${eventId}/live`} target="_blank" rel="noopener noreferrer" className="px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors border-b border-slate-700/50 font-medium flex justify-between items-center" onClick={() => setIsDropdownOpen(false)}>
                  Ecrã Padrão
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
                <a href={`/event/${eventId}/live-qa`} target="_blank" rel="noopener noreferrer" className="px-4 py-3 text-sm text-indigo-400 hover:bg-slate-700 transition-colors font-medium flex justify-between items-center" onClick={() => setIsDropdownOpen(false)}>
                  Painel Q&A
                  <ExternalLink className="w-3 h-3 text-indigo-500" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* COLUNA 1: SEQUÊNCIA E VOZ IA */}
        <div className="space-y-4 flex flex-col h-full">
          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-sm flex flex-col h-[300px]">
            <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Sequência Oradores
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">Orador atual destacado</p>
            
            <div className="space-y-2 flex-1 overflow-y-auto pr-2">
               {sessionsList.length === 0 ? (
                 <div className="text-xs text-slate-500 p-4 text-center border border-dashed border-slate-700/50 rounded-lg">Nenhum orador cadastrado</div>
               ) : (
                 sessionsList.map((sess, idx) => {
                   const spk = sess.speakers || sess.speaker;
                   if (!spk) return null;
                   const isActive = sess.status === 'live';
                   return (
                     <div key={spk.id} className="flex gap-3 items-center">
                       <span className="font-black text-xl text-slate-500 w-6">{idx + 1}</span>
                       <button 
                         onClick={() => activateSession(sess.id)}
                         className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold text-left truncate transition-all border shadow-sm ${isActive ? 'bg-emerald-500/80 border-emerald-400 text-white' : 'bg-orange-500/80 border-orange-400 text-white hover:opacity-90'}`}>
                         {spk.name}
                       </button>
                     </div>
                   );
                 })
               )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-sm">
               <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2 text-[11px]">
                 <Bot className="w-4 h-4 text-indigo-400" /> Configura Voz IA
               </h3>
               <p className="text-[9px] text-slate-500 mb-4">Qtd. de Perguntas para IA e colunas</p>
               <div className="flex items-center gap-2">
                 <input 
                   type="range" min="1" max="10" step="1" 
                   value={eventConfig.max_questions || 3} 
                   onChange={(e) => updateMaxQuestions(parseInt(e.target.value))}
                   className="flex-1 accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" 
                 />
                 <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded text-xs">{eventConfig.max_questions || 3}</span>
               </div>
            </div>

            <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
               <h3 className="font-semibold text-slate-100 flex items-center gap-2 text-[11px]">
                 <Bot className="w-4 h-4 text-indigo-400" /> Configura Voz IA
               </h3>
               <select className="w-full bg-slate-800/50 border border-slate-700/50 text-slate-200 font-medium rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500">
                 <option>Nova (Feminina)</option>
                 <option>Onyx (Masculina)</option>
                 <option>Shimmer (Feminina)</option>
               </select>
            </div>
          </div>

          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-sm text-xs text-slate-400 flex justify-between items-center cursor-pointer hover:text-slate-200 transition-colors">
             <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Configuração Avançada da Voz</span> <ArrowLeft className="w-4 h-4 rotate-180" />
          </div>
        </div>

        {/* COLUNA 2: GESTÃO DA PALESTRA E FILA */}
        <div className="space-y-4 flex flex-col h-full">
          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-sm flex flex-col relative overflow-hidden flex-1 min-h-[300px]">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none"><Activity className="w-40 h-40" /></div>
            
            <h3 className="font-semibold text-slate-100 mb-6 flex items-center gap-2 relative z-10">
              <Mic className="w-5 h-5 text-indigo-400" /> Gestão da Palestra
            </h3>
            
            <div className="mb-6 relative z-10">
               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">1. Fase do Evento</h4>
               
               <button className="w-full bg-white text-slate-900 font-bold py-2.5 rounded-xl mb-3 text-sm shadow-sm hover:bg-slate-200 transition-colors">
                 Play List Musicas
               </button>

               <div className="grid grid-cols-4 gap-2">
                 {["Abertura", "Intervalo", "Q&A", "Fim"].map((phase) => {
                   const isActive = eventConfig?.current_phase === phase || (!eventConfig?.current_phase && phase === "Abertura");
                   return (
                     <button 
                       key={phase} onClick={() => updatePhase(phase)}
                       className={`py-2 rounded-xl text-xs font-bold transition-all ${
                         isActive ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm hover:bg-slate-50"
                       }`}
                     >
                       {phase}
                     </button>
                   )
                 })}
               </div>
            </div>

            <div className="flex-1 space-y-3 relative z-10">
               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">2. Comandos de Áudio da IA</h4>
               
               <button onClick={toggleAiMode} className={`w-full p-2 rounded-xl text-xs font-bold transition-all mb-3 border shadow-sm ${eventConfig?.ai_mode === 'auto' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                 Modo de Q&A: {eventConfig?.ai_mode === 'auto' ? 'Automático (Voz + Manual)' : 'Manual (Apenas Painel)'}
               </button>

               <button disabled={isProcessing} onClick={triggerIntroQA} className="w-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 p-3 rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-50">
                 <PlayCircle className="w-5 h-5 text-indigo-600" />
                 <span className="font-bold">{isProcessing ? "A processar..." : "Iniciar Bloco Q&A"}</span>
               </button>

               <button onClick={triggerNextQuestion} className="w-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 p-3 rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm">
                 <FastForward className="w-5 h-5 text-emerald-600" />
                 <span className="font-bold">Próxima Pergunta IA</span>
               </button>

               <div className="grid grid-cols-2 gap-3">
                 <button onClick={pauseAudio} className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 p-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                   <Pause className="w-4 h-4 text-amber-500" />
                   <span className="text-xs font-bold">Pausar Voz</span>
                 </button>
                 <button onClick={resumeAudio} className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 p-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                   <Play className="w-4 h-4 text-sky-500" />
                   <span className="text-xs font-bold">Continuar</span>
                 </button>
               </div>

               <button onClick={killAudio} className="w-full bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 p-3 rounded-xl flex items-center justify-center gap-2 transition-all text-red-200 group mt-4">
                 <MicOff className="w-4 h-4 group-hover:animate-pulse" />
                 <span className="font-bold text-xs uppercase tracking-wider">Mutar IA (Stop)</span>
               </button>
            </div>

            <div className="relative z-10 pt-4 mt-4 border-t border-slate-700/50">
               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                 3. Controlo Manual de Slides
               </h4>
               <button onClick={toggleSliderMode} className={`w-full p-3 mb-3 rounded-xl flex items-center justify-center gap-2 transition-all group border shadow-sm ${eventConfig?.slider_mode_active ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800'}`}>
                 <span className="font-bold text-xs uppercase tracking-wider">
                   {eventConfig?.slider_mode_active ? 'Modo Slider: ATIVO' : 'Ativar Modo Slider'}
                 </span>
               </button>
               <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => changeSlideIndex(false)} className="bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white p-2 rounded-xl text-xs font-bold uppercase transition-colors">&larr; Slide Anterior</button>
                 <button onClick={() => changeSlideIndex(true)} className="bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white p-2 rounded-xl text-xs font-bold uppercase transition-colors">Próximo Slide &rarr;</button>
               </div>
            </div>
          </div>

          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-sm flex items-center justify-between">
             <div>
                <div className="flex items-center gap-2 mb-1">
                   <LinkIcon className="w-4 h-4 text-slate-400" />
                   <h4 className="text-sm font-semibold text-slate-100">Perguntas ao Orador</h4>
                </div>
                <p className="text-xs text-slate-500">Acesso via QR Code</p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/event/${eventId}/pergunta`);
                    addLog("Link da Sala copiado para a área de transferência!");
                    alert("Link copiado!");
                  }}
                  className="mt-3 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 border border-slate-700/50 px-3 py-1.5 rounded-lg transition-colors"
                >
                   Copiar Link para Sala
                </button>
             </div>
             <div className="bg-white p-2 rounded-xl shadow-sm">
                {typeof window !== 'undefined' && <QRCode value={`${window.location.origin}/event/${eventId}/pergunta`} size={40} />}
             </div>
          </div>
        </div>

        {/* COLUNA 3: FILA ATIVA, LOGS E TELEPROMPTER */}
        <div className="space-y-4 flex flex-col h-full">
          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-sm flex flex-col h-[250px]">
            <h3 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Fila em Palco
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 bg-slate-900/50 rounded-xl border border-slate-700/50 p-2">
              {activeQueue.length === 0 ? (
                <div className="text-xs text-slate-500 h-full flex items-center justify-center text-center">
                  Fila vazia. Aprove no Curador.
                </div>
              ) : (
                activeQueue.map((q) => (
                  <div key={q.id} className={`p-2 mb-2 rounded-xl border flex flex-col gap-1 ${q.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/80 border-slate-700/50'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold ${q.status === 'active' ? 'text-emerald-400' : 'text-slate-300'}`}>{q.author_name}</span>
                      {q.status === 'active' && <span className="flex items-center gap-1 text-[8px] text-emerald-400 uppercase bg-emerald-500/20 px-1.5 py-0.5 rounded-full"><Radio className="w-2 h-2"/> Active</span>}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">{q.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-sm flex flex-col flex-1 min-h-[200px]">
            <h3 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <TerminalSquare className="w-4 h-4 text-slate-500" /> System Logs
            </h3>
            <div className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 overflow-y-auto space-y-2 text-[10px] font-mono scrollbar-thin scrollbar-thumb-slate-700">
              {logs.map((log, i) => (
                <div key={i} className="flex flex-col gap-0.5 border-l-2 border-slate-700 pl-2 py-0.5">
                  <span className="text-slate-600">[{log.time}]</span>
                  <span className={
                    log.msg.includes("EMERGÊNCIA") ? "text-red-400" :
                    log.msg.includes("Comando") ? "text-indigo-400" : 
                    "text-emerald-400"
                  }>
                    {log.msg}
                  </span>
                </div>
              ))}
              <div className="animate-pulse flex gap-2 text-emerald-500/50 pt-1">
                 <TerminalSquare className="w-3 h-3" /> <span>Idle...</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-sm">
            <h4 className="text-[11px] text-slate-100 mb-2 font-medium">Alerta de Teleprompter (Emergência)</h4>
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-2 relative">
               <textarea 
                  rows={2} 
                  value={teleprompterMsg}
                  onChange={(e) => setTeleprompterMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendTeleprompterAlert();
                    }
                  }}
                  className="w-full bg-transparent text-slate-200 text-xs resize-none focus:outline-none placeholder-slate-600" 
                  placeholder="Mensagem rápida (Enter para enviar)"
               />
               <div className="flex justify-end mt-2">
                 <button onClick={sendTeleprompterAlert} className="bg-white hover:bg-slate-200 text-slate-900 text-xs font-bold px-4 py-1.5 rounded-lg transition-colors shadow-sm">
                   Enviar Alerta
                 </button>
               </div>
            </div>
          </div>
        </div>

        {/* COLUNA 4: ESTATÍSTICAS E MENSAGENS IA */}
        <div className="space-y-4 flex flex-col h-full">
           {/* Monitorização (Novo Bloco) */}
           <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-emerald-400" /> Monitorização
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Active Users</p>
                  <p className="text-2xl font-black text-white flex items-center gap-2">
                    15 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Q&A Velocity</p>
                  <p className="text-2xl font-black text-emerald-400">8.4s</p>
                </div>
              </div>
              <div className="border-t border-slate-700/50 pt-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">System Health</span>
                  <span className="text-emerald-400 font-bold">99%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '99%' }}></div>
                </div>
              </div>
           </div>

           <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-sm">
             <h3 className="font-semibold text-slate-100 mb-4 text-sm">Mensagens da IA</h3>
             
             <div className="space-y-2">
                {["Abertura", "Apresentação Equipa", "Cordenadores", "Encerramento"].map((macro) => {
                  const isActiveMacro = eventConfig?.macro_state === macro;
                  return (
                    <button 
                      key={macro} 
                      onClick={() => updateMacroState(macro)}
                      className={`w-full hover:opacity-90 font-bold py-2 px-4 rounded-xl text-sm text-center transition-all shadow-sm border ${isActiveMacro ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-300'}`}
                    >
                      {macro}
                    </button>
                  );
                })}
             </div>
           </div>

           <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-sm flex-1 overflow-hidden relative group cursor-pointer flex items-center justify-center min-h-[150px]">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-emerald-500/10"></div>
              <div className="relative z-10 text-center">
                 <MonitorPlay className="w-8 h-8 text-slate-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                 <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Preview Palco</span>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
