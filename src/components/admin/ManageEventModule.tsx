"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, ExternalLink, User, Bot, Settings, Activity, Mic, PlayCircle, FastForward, Pause, Play, MicOff, MonitorPlay, LinkIcon, UserCheck, Radio, TerminalSquare, ChevronUp, ChevronDown, MessageSquare, AlertCircle, Monitor, RotateCcw, RefreshCw } from "lucide-react";
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
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const liveCommandChannelRef = React.useRef<any>(null);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, (payload: any) => {
         fetchQuestions();
         if (payload.eventType === 'INSERT') {
           runSilentCuration();
         }
      }).subscribe();

    const presenceChannel = supabase.channel(`presence_${eventId}_manage`);
    presenceChannel.on('presence', { event: 'sync' }, () => {
       const state = presenceChannel.presenceState();
       let count = 0;
       for (const key in state) {
          count += state[key].length;
       }
       setActiveUsersCount(count);
    }).subscribe();

    return () => {
      supabase.removeChannel(eventSub);
      supabase.removeChannel(questionsSub);
      supabase.removeChannel(presenceChannel);
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

  const triggerAIProcessing = async () => {
    const activeSession = sessionsList.find(s => s.status === 'live');
    if (!activeSession) {
      addLog("ERRO: Nenhuma sessão ativa para Curadoria.");
      return;
    }
    const speakerObj = activeSession.speakers || activeSession.speaker;
    
    setIsProcessing(true);
    addLog("A preparar perguntas em background (Curadoria IA)...");
    try {
      const res = await fetch('/api/ai/qa-curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          maxPerguntas: eventConfig?.max_questions || 5,
          speakerName: speakerObj?.name || 'Orador',
          theme: speakerObj?.bio || ''
        })
      });
      const data = await res.json();
      if (data.success) {
         addLog(`Curadoria Concluída: ${data.processed} processadas, ${data.approved} aprovadas.`);
         fetchQuestions();
      } else {
         addLog("ERRO na Curadoria IA.");
      }
    } catch (e) {
      addLog("ERRO de rede na Curadoria IA.");
    }
    setIsProcessing(false);
  };

  const toggleEventOpen = async () => {
    const newState = !eventConfig?.is_event_open;
    const newConfig = { ...eventConfig, is_event_open: newState, target_screen_id: pairingId || null };
    setEventConfig(newConfig);
    const { error } = await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    if (error) {
      alert("Erro ao atualizar o evento: " + error.message);
      addLog("ERRO: Falha ao abrir/fechar evento: " + error.message);
      return;
    }
    addLog(`Evento ${newState ? 'ABERTO' : 'FECHADO'} para o Público.`);
    
    if (!newState) {
      triggerAIProcessing();
    } else {
      addLog("Modo Curadoria Silenciosa ATIVADO. Novas perguntas serão processadas em background.");
      runSilentCuration(); // Run immediately once when opened
    }
  };

  const runSilentCuration = async () => {
     if (!eventConfig?.is_event_open) return;
     const activeSession = sessionsList.find(s => s.status === 'live');
     if (!activeSession) return;
     
     const speakerObj = activeSession.speakers || activeSession.speaker;
     try {
       await fetch('/api/ai/qa-curation', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           sessionId: activeSession.id,
           maxPerguntas: eventConfig.speaker_questions?.[activeSession.id] || eventConfig.max_questions || 3,
           speakerName: speakerObj?.name || 'Orador',
           theme: speakerObj?.bio || ''
         })
       });
       fetchQuestions(); // update UI after curation
     } catch (e) {
       console.error("Erro na curadoria silenciosa", e);
     }
  };

  const sortedSessions = [...sessionsList].sort((a, b) => {
    const seq = eventConfig?.speaker_sequence || [];
    const indexA = seq.indexOf(a.id);
    const indexB = seq.indexOf(b.id);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return 0; // fallback to original order
  });

  const moveSpeaker = async (index: number, direction: 'up' | 'down') => {
    const newSessions = [...sortedSessions];
    if (direction === 'up' && index > 0) {
      [newSessions[index - 1], newSessions[index]] = [newSessions[index], newSessions[index - 1]];
    } else if (direction === 'down' && index < newSessions.length - 1) {
      [newSessions[index + 1], newSessions[index]] = [newSessions[index], newSessions[index + 1]];
    } else {
      return;
    }
    
    const newSequence = newSessions.map(s => s.id);
    const newConfig = { ...eventConfig, speaker_sequence: newSequence, target_screen_id: pairingId || null };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const updateSpeakerQuestions = async (sessionId: string, val: number) => {
    if (isNaN(val) || val < 1) val = 1;
    const currentMap = eventConfig.speaker_questions || {};
    const newConfig = { 
      ...eventConfig, 
      speaker_questions: { ...currentMap, [sessionId]: val },
      target_screen_id: pairingId || null
    };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(`Perguntas para orador atualizadas para ${val}.`);
  };

  const triggerAISpeak = async (text: string, questionText: string | null = null, extraConfig: any = {}) => {
    const newConfig = { 
       ...eventConfig, 
       ...extraConfig,
       ai_force_speak: { 
         text: text, 
         questionText: questionText,
         time: Date.now() 
       },
       target_screen_id: pairingId || null 
    };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
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
      alert("ERRO: Nenhuma sessão ativa no momento. Active um orador primeiro na Sequência de Oradores.");
      return;
    }
    
    const answeredCount = eventConfig?.current_block_count || 0;
      
    const limit = (eventConfig.speaker_questions && eventConfig.speaker_questions[activeSession.id]) || eventConfig.max_questions || 3;
    const isLimitReached = (answeredCount || 0) >= limit;

    if (isLimitReached) {
       addLog("Limite de perguntas para este bloco atingido.");
       alert("O limite de perguntas definido para este orador já foi atingido neste bloco.");
       return;
    }
    
    // Fetch fresh approved questions
    const { data: qs } = await supabase.from('questions').select('*').eq('session_id', activeSession.id).eq('status', 'approved').order('created_at', { ascending: true });

    if (qs && qs.length > 0) {
       const nextQ = qs[0];
       let speech = nextQ.content;
       
      if (isLastQuestion) {
         // Generate last question of the block phrase
         setIsProcessing(true);
         const speakerObj = activeSession.speakers || activeSession.speaker;

         try {
           const res = await fetch('/api/ai/qa-moderation', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               managerName: managerName,
               speakerName: speakerObj?.name || 'Orador',
               action: 'last_question',
               firstQuestion: speech,
               aiGender: eventConfig?.tts_config?.gender || 'male'
             })
           });
           if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
           const data = await res.json();
           if (data.success && data.text) {
              speech = data.text;
           }
         } catch (e: any) {
           console.error("Erro a gerar última pergunta:", e);
           addLog(`ERRO IA Last Q: ${e.message}`);
         } finally {
           setIsProcessing(false);
         }
       } else {
         // Not the last question, generate a brief transition (next_question)
         setIsProcessing(true);
         const speakerObj = activeSession.speakers || activeSession.speaker;
         try {
           const res = await fetch('/api/ai/qa-moderation', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               managerName: managerName,
               speakerName: speakerObj?.name || 'Orador',
               action: 'next_question',
               firstQuestion: speech,
               aiGender: eventConfig?.tts_config?.gender || 'male'
             })
           });
           if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
           const data = await res.json();
           if (data.success && data.text) {
              speech = data.text;
           }
         } catch (e: any) {
           console.error("Erro a gerar próxima pergunta:", e);
           addLog(`ERRO IA Next Q: ${e.message}`);
         } finally {
           setIsProcessing(false);
         }
       }
       
       await triggerAISpeak(speech, nextQ.content, { current_block_count: answeredCount + 1 });
       
       await supabase.from('questions').update({ status: 'answered' }).eq('id', nextQ.id);
       addLog(`Pergunta avançada.`);
       fetchQuestions(); // Refresh UI
    } else {
       addLog("Fila vazia: não há perguntas aprovadas na fila.");
       alert("Fila vazia! Não existem perguntas aprovadas pelo sistema para este orador.");
    }
  };

  const repeatCurrentQuestion = async () => {
    const questionText = eventConfig?.ai_force_speak?.questionText;
    if (questionText) {
      setIsProcessing(true);
      const activeSession = sessionsList.find(s => s.status === 'live');
      const speakerObj = activeSession?.speakers || activeSession?.speaker;
      
      try {
        const res = await fetch('/api/ai/qa-moderation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            managerName: managerName,
            speakerName: speakerObj?.name || 'Orador',
            action: 'repeat_question',
            firstQuestion: questionText,
            aiGender: eventConfig?.tts_config?.gender || 'male'
          })
        });
        const data = await res.json();
        if (data.success && data.text) {
          await triggerAISpeak(data.text, questionText);
          addLog("Comando: Repetir Pergunta enviado com nova introdução!");
        }
      } catch (e) {
        addLog("Erro ao repetir pergunta.");
      }
      setIsProcessing(false);
    } else {
      addLog("Nenhuma pergunta anterior para repetir.");
      alert("Ainda não houve nenhuma fala da IA para repetir.");
    }
  };

  const triggerIntroQA = async () => {
    addLog("Comando: Iniciar Bloco Q&A!");
    setIsProcessing(true);
    addLog("A gerar introdução de palco...");

    try {
      const activeSessionIndex = sessionsList.findIndex(s => s.status === 'live');
      const activeSession = sessionsList[activeSessionIndex];
      if (!activeSession) {
         addLog("ERRO: Nenhuma sessão ativa encontrada.");
         setIsProcessing(false);
         return;
      }
      
      const speakerObj = activeSession.speakers || activeSession.speaker;

      const { data: qs } = await supabase.from('questions').select('*').eq('session_id', activeSession.id).eq('status', 'approved').order('created_at', { ascending: true });
      let firstQuestion = null;
      let firstQuestionId = null;
      if (qs && qs.length > 0) {
         firstQuestion = qs[0].content;
         firstQuestionId = qs[0].id;
      }

      try {
        const res = await fetch('/api/ai/qa-moderation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            managerName: managerName,
            speakerName: speakerObj?.name || 'Orador',
            action: 'intro',
            firstQuestion: firstQuestion,
            isFirstSpeaker: activeSessionIndex === 0,
            aiGender: eventConfig?.tts_config?.gender || 'male'
          })
        });

        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const data = await res.json();
        
        if (data.success && data.text) {
           addLog(`Introdução gerada com sucesso!`);
           await triggerAISpeak(data.text, firstQuestion, { current_block_count: firstQuestionId ? 1 : 0 });
           
           if (firstQuestionId) {
              await supabase.from('questions').update({ status: 'answered' }).eq('id', firstQuestionId);
              addLog(`Primeira pergunta ativada na introdução.`);
              fetchQuestions();
           }
        } else {
           addLog("ERRO no processamento de IA (Intro).");
        }
      } catch (err: any) {
        addLog(`ERRO IA Intro: ${err.message}`);
      } finally {
        setIsProcessing(false);
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="border-l border-slate-700/50 pl-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
               Live Controller (ID: {eventId.substring(0, 8)}...)
            </h2>
            <p className="text-sm text-slate-400">Gestão ao vivo da palestra e interação com a Inteligência Artificial.</p>
          </div>
        </div>
        
        <div className="flex gap-4 items-center mt-4 md:mt-0">
          <div className="flex items-center gap-2 mr-2">
             <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold border border-amber-500/30">TS</div>
             <span className="font-bold text-slate-200 text-sm tracking-wide hidden md:block">{managerName}</span>
          </div>
          <div className="flex items-center bg-[#0F172A] border border-slate-800 rounded-full px-4 py-1.5 shadow-sm">
            <span className="text-xs text-slate-400 mr-2 font-bold uppercase tracking-widest">PAREAMENTO:</span>
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
              placeholder="Ex: 8TTE"
              className="w-12 bg-transparent text-[#10B981] text-xs font-black focus:outline-none placeholder-slate-600 text-center uppercase"
              maxLength={4}
            />
          </div>

          <button 
             onClick={() => window.location.reload()}
             className="bg-transparent border border-slate-700/50 hover:bg-slate-800 text-slate-300 py-2 px-3 rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
             <RotateCcw className="w-4 h-4" />
             Reiniciar
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-[#F59E0B] hover:bg-amber-400 text-amber-950 font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-sm text-sm"
            >
              <Monitor className="w-4 h-4" />
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
        
        {/* COLUNA 1: SEQUÊNCIA ORADORES E CONFIGURAÇÃO VOZ */}
        <div className="space-y-4 flex flex-col h-full col-span-1">

          {/* Sequência Oradores */}
          <div className="bg-[#111827] border border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col flex-1 min-h-[300px]">
            <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" /> Sequência Oradores
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">Orador atual destacado</p>
            
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
               {sessionsList.length === 0 ? (
                 <div className="text-xs text-slate-500 p-4 text-center border border-dashed border-slate-700/50 rounded-lg">Nenhum orador cadastrado</div>
               ) : (
                 sortedSessions.map((sess, idx) => {
                   const spk = sess.speakers || sess.speaker;
                   if (!spk) return null;
                   const isActive = sess.status === 'live';
                   return (
                     <div key={spk.id} className="flex flex-col gap-1 mb-3">
                       <div className="flex gap-3 items-center">
                         <div className="flex flex-col items-center">
                           <button onClick={() => moveSpeaker(idx, 'up')} className="text-slate-500 hover:text-white pb-1"><ChevronUp className="w-4 h-4" /></button>
                           <span className="font-black text-sm text-slate-400 w-6 text-center">{idx + 1}</span>
                           <button onClick={() => moveSpeaker(idx, 'down')} className="text-slate-500 hover:text-white pt-1"><ChevronDown className="w-4 h-4" /></button>
                         </div>
                         <div className="flex-1 flex flex-col gap-2">
                           <button 
                             onClick={() => activateSession(sess.id)}
                             className={`w-full py-3 px-4 rounded-xl text-sm font-bold text-left truncate transition-all shadow-sm ${isActive ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-[#1E293B] border border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                             {spk.name}
                           </button>
                           <div className="flex items-center gap-2 justify-between px-1">
                             <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Qtd. Perguntas IA:</span>
                             <input 
                               type="number" 
                               min="1" max="10" 
                               value={(eventConfig.speaker_questions && eventConfig.speaker_questions[sess.id]) || eventConfig.max_questions || 3}
                               onChange={(e) => updateSpeakerQuestions(sess.id, parseInt(e.target.value))}
                               className="w-12 bg-[#0F172A] border border-slate-700/50 text-[#10B981] text-xs font-bold px-1 py-1 rounded-lg text-center focus:outline-none focus:border-indigo-500"
                             />
                           </div>
                         </div>
                       </div>
                     </div>
                   );
                 })
               )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#111827] border border-slate-800/80 rounded-3xl p-5 shadow-sm">
               <h3 className="font-semibold text-slate-100 mb-2 flex flex-col items-center justify-center text-center gap-2 text-sm">
                 <Settings className="w-5 h-5 text-[#10B981]" /> Configurar Voz IA
               </h3>
               <p className="text-[10px] text-slate-400 mb-4 text-center leading-tight mt-3">Qtd. de perguntas para IA continuas</p>
               <div className="flex items-center gap-2 mt-2">
                 <input 
                   type="range" min="1" max="10" step="1" 
                   value={eventConfig.max_questions || 3} 
                   onChange={(e) => updateMaxQuestions(parseInt(e.target.value))}
                   className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" 
                 />
                 <span className="text-white font-bold bg-slate-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">{eventConfig.max_questions || 3}</span>
               </div>
            </div>

            <div className="bg-[#111827] border border-slate-800/80 rounded-3xl p-5 shadow-sm flex flex-col">
               <h3 className="font-semibold text-slate-100 flex flex-col items-center justify-center text-center gap-2 text-sm mb-3">
                 <Settings className="w-5 h-5 text-[#10B981]" /> Configurar Voz IA
               </h3>
               <p className="text-[10px] text-slate-400 text-center leading-tight mb-4 flex-1">Tom de voz da IA</p>
               <div className="flex gap-2">
                   <select className="flex-1 bg-slate-900 border border-slate-700 text-indigo-400 font-medium rounded-xl px-2 py-1.5 text-xs focus:outline-none shadow-inner text-center">
                     <option>Natural</option>
                     <option>Formal</option>
                     <option>Casual</option>
                   </select>
                   <div className="w-8 flex items-center justify-center text-slate-400"><Mic className="w-4 h-4"/></div>
               </div>
            </div>
          </div>
          
          <button className="w-full mt-2 bg-slate-800/80 text-slate-300 hover:text-white p-4 rounded-2xl flex items-center justify-between transition-all shadow-sm">
             <div className="flex items-center gap-2">
                 <Settings className="w-4 h-4" />
                 <span className="text-xs font-bold">Configuração Avançada da Voz</span>
             </div>
             <ChevronDown className="w-4 h-4 -rotate-90" />
          </button>
        </div>

        {/* COLUNA 2: GESTÃO DA PALESTRA E IA */}
        <div className="space-y-4 flex flex-col h-full col-span-1">
          <div className="bg-[#111827] border border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col relative overflow-hidden flex-1">
            <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none"><Activity className="w-40 h-40" /></div>
            
            <h3 className="font-semibold text-slate-100 mb-6 flex items-center gap-2 relative z-10">
              <Mic className="w-5 h-5 text-[#10B981]" /> Gestão da Palestra
            </h3>
            
            <div className="mb-8 relative z-10">
               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">1. Fase do Evento</h4>
               
               <button 
                 onClick={toggleEventOpen}
                 className={`w-full font-bold py-3.5 rounded-2xl mb-4 text-sm shadow-sm transition-colors border ${
                   !eventConfig?.is_event_open 
                     ? "bg-amber-500/10 text-[#F59E0B] border-amber-500/30 hover:bg-amber-500/20" 
                     : "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/20"
                 }`}
               >
                 {!eventConfig?.is_event_open ? '🛑 Sala de Espera (Evento Fechado)' : '✅ Evento Aberto (Recebendo Perguntas +)'}
               </button>

               <div className="flex items-center justify-between mb-4 mt-2">
                 <span className="text-sm text-slate-300">Nº de Perguntas por Bloco:</span>
                 <input 
                   type="number" 
                   min="1" max="20"
                   value={eventConfig.max_questions || 3}
                   onChange={(e) => updateMaxQuestions(parseInt(e.target.value) || 1)}
                   className="w-16 bg-[#0F172A] border border-slate-700 rounded-lg px-2 py-1.5 text-[#10B981] font-bold text-sm text-center focus:outline-none focus:border-indigo-500"
                 />
               </div>

               <div className="grid grid-cols-4 gap-2">
                 {["Abertura", "Intervalo", "Q&A", "Fim"].map((phase) => {
                   const isActive = eventConfig?.current_phase === phase || (!eventConfig?.current_phase && phase === "Abertura");
                   return (
                     <button 
                       key={phase} onClick={() => updatePhase(phase)}
                       className={`py-3 rounded-xl text-xs font-bold transition-all shadow-sm ${
                         isActive && phase === "Q&A" ? "bg-emerald-600 text-white shadow-emerald-500/20" : 
                         isActive ? "bg-slate-700 text-white" : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700/50"
                       }`}
                     >
                       {phase}
                     </button>
                   )
                 })}
               </div>
            </div>

            <div className="mb-8 relative z-10">
               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">2. Comandos de Áudio da IA</h4>
               
               <button onClick={toggleAiMode} className={`w-full p-4 rounded-2xl text-sm font-bold transition-all mb-4 shadow-sm border ${eventConfig?.ai_mode === 'auto' ? 'bg-[#10B981] text-white border-emerald-400/30' : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-800'}`}>
                 <div className="flex items-center justify-center gap-2">
                    Modo de Q&A {eventConfig?.ai_mode === 'auto' ? 'Automático' : 'Manual'} (Voz + Manual) 
                 </div>
               </button>

               <button disabled={isProcessing} onClick={triggerIntroQA} className="w-full bg-white text-slate-900 hover:bg-slate-200 p-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-50 mb-3">
                 <PlayCircle className="w-5 h-5 text-slate-900" />
                 <span className="font-bold text-sm">{isProcessing ? "A processar..." : "Iniciar Bloco Q&A"}</span>
               </button>

               <button onClick={triggerNextQuestion} className="w-full bg-white text-slate-900 hover:bg-slate-200 p-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm mb-3">
                 <FastForward className="w-5 h-5 text-slate-900" />
                 <span className="font-bold text-sm">Próxima Pergunta IA</span>
               </button>

               <button onClick={repeatCurrentQuestion} className="w-full bg-slate-200 text-slate-900 hover:bg-slate-300 p-3 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm mb-4">
                 <RefreshCw className="w-4 h-4 text-slate-900" />
                 <span className="font-bold text-sm">Repetir Pergunta</span>
               </button>
            </div>

            <div className="relative z-10 pt-4 border-t border-slate-700/30">
               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                 3. CONTROLE MANUAL DE SLIDES
               </h4>
               <button onClick={toggleSliderMode} className={`w-full p-4 mb-3 rounded-2xl flex items-center justify-center gap-2 transition-all group border shadow-sm ${eventConfig?.slider_mode_active ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                 <span className="font-bold text-sm uppercase tracking-wider">
                   {eventConfig?.slider_mode_active ? 'MODO SLIDER ATIVO' : 'ATIVAR MODO SLIDER'}
                 </span>
               </button>
               <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => changeSlideIndex(false)} className="bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white p-3.5 rounded-xl text-xs font-bold uppercase transition-colors">&larr; SLIDE ANTERIOR</button>
                 <button onClick={() => changeSlideIndex(true)} className="bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white p-3.5 rounded-xl text-xs font-bold uppercase transition-colors">PRÓXIMO SLIDE &rarr;</button>
               </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-700/30 flex items-center justify-between group">
               <div>
                  <div className="flex items-center gap-2 mb-1">
                     <LinkIcon className="w-4 h-4 text-indigo-400" />
                     <h4 className="text-sm font-bold text-slate-100">Perguntas ao Orador</h4>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-3">Acesso via QR Code</p>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/event/${eventId}/pergunta`);
                      addLog("Link copiado!");
                    }}
                    className="bg-slate-200 hover:bg-white text-slate-900 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm text-xs"
                  >
                     Copiar Link para Sala
                  </button>
               </div>
               <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-105 transition-transform">
                  {typeof window !== 'undefined' && <QRCode value={`${window.location.origin}/event/${eventId}/pergunta`} size={56} />}
               </div>
            </div>
          </div>

        </div>

        {/* COLUNA 3: DIREITA LARGA COM 2 COLUNAS INTERNAS */}
        <div className="col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
          
          {/* Subcoluna Esquerda: Fila, Logs, Alerta */}
          <div className="space-y-4 flex flex-col h-full">
            <div className="bg-[#111827] border border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col h-[340px]">
              <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" /> Fila em Palco
              </h3>
              <div className="flex-1 overflow-y-auto pr-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                {activeQueue.length === 0 ? (
                  <div className="text-xs text-slate-500 h-full flex items-center justify-center text-center font-medium italic bg-[#0F172A] rounded-xl border border-slate-800">
                    Fila vazia.
                  </div>
                ) : (
                  <>
                    {activeQueue.slice(0, 2).map((q) => (
                      <div key={q.id} className="p-4 rounded-2xl border bg-[#1E293B] border-slate-700 flex flex-col gap-1 shadow-sm">
                        <span className="text-sm font-bold text-slate-200">{q.author_name}</span>
                        <p className="text-xs text-slate-400 truncate leading-relaxed">{q.content}</p>
                      </div>
                    ))}
                  {activeQueue.length > 2 && (
                    <div className="p-3 rounded-xl border bg-slate-800/30 border-slate-700/50 flex justify-center text-xs font-bold text-slate-500">
                       + {activeQueue.length - 2} Adicional
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col flex-1 min-h-[260px]">
            <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <TerminalSquare className="w-5 h-5 text-slate-400" /> System Logs
            </h3>
            <div className="flex-1 bg-[#090E17] border border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-3 text-[11px] font-mono scrollbar-thin scrollbar-thumb-slate-700 shadow-inner">
              {logs.map((log, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span className="text-slate-600 font-bold">[{log.time}]</span>
                  <span className={
                    log.msg.includes("EMERGÊNCIA") ? "text-red-400 font-semibold" :
                    "text-emerald-400"
                  }>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
            <button className="mt-4 flex justify-center items-center gap-2 text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors">
               Ver todos os logs <ChevronDown className="w-4 h-4 -rotate-90"/>
            </button>
          </div>

          <div className="bg-[#111827] border border-slate-800/80 rounded-3xl p-6 shadow-sm">
             <h4 className="text-[13px] text-slate-300 mb-3 font-semibold flex items-center gap-2">
               <AlertCircle className="w-4 h-4 text-slate-400" /> Alerta de Teleprompter (Emergência)
             </h4>
             <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 relative shadow-inner h-28">
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
                   className="w-full bg-transparent text-slate-200 text-sm resize-none focus:outline-none placeholder-slate-600 font-medium h-full" 
                   placeholder="Mensagem rápida (Enter para enviar)"
                />
                <div className="absolute bottom-3 right-3">
                  <button onClick={sendTeleprompterAlert} className="bg-amber-700/20 text-amber-500 hover:bg-amber-700/40 text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-2 border border-amber-500/30">
                    Enviar Alerta <Play className="w-3 h-3" />
                  </button>
                </div>
             </div>
          </div>

        </div>

        {/* Subcoluna Direita: Monitorização, Mensagens IA, Preview */}
        <div className="space-y-4 flex flex-col h-full">
           {/* Monitorização */}
           <div className="bg-[#111827] border border-slate-800/80 rounded-3xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-100 mb-6 flex items-center gap-2 text-sm">
                <Activity className="w-5 h-5 text-emerald-400" /> Monitorização
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">ACTIVE USERS</p>
                  <p className="text-4xl font-light text-white leading-none">
                    {activeUsersCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Q&A VELOCITY</p>
                  <p className="text-4xl font-light text-emerald-400 leading-none">8.4s</p>
                </div>
              </div>
              <div className="pt-2">
                <div className="flex justify-between items-center text-[10px] mb-2 uppercase tracking-wider font-bold">
                  <span className="text-slate-400">System Health</span>
                  <span className="text-emerald-400">99%</span>
                </div>
                <div className="w-full bg-[#0F172A] rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '99%' }}></div>
                </div>
              </div>
           </div>

           <div className="bg-[#111827] border border-slate-800/80 rounded-3xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-100 mb-5 text-sm flex items-center gap-2"><Bot className="w-5 h-5 text-slate-400" /> Mensagens da IA</h3>
              <div className="space-y-3">
                 {["Abertura", "Apresentação Equipa", "Cordenadores", "Encerramento"].map((macro) => {
                   const isActiveMacro = eventConfig?.macro_state === macro;
                   return (
                     <button 
                       key={macro} 
                       onClick={() => updateMacroState(macro)}
                       className={`w-full hover:opacity-90 font-bold py-3.5 px-4 rounded-xl text-xs flex items-center gap-3 transition-all shadow-sm border ${isActiveMacro ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#1E293B] border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                     >
                       <User className="w-4 h-4 opacity-50" />
                       {macro}
                     </button>
                   );
                 })}
              </div>
           </div>

           <div className="bg-gradient-to-b from-indigo-900/40 to-[#0F172A] border border-slate-700/30 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[220px]">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
                 <MonitorPlay className="w-8 h-8 text-indigo-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider">PREVIEW PALCO</h4>
              
              <button 
                onClick={() => window.open(`/event/${eventId}/live`, '_blank')}
                className="w-full bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/30 text-[#10B981] text-xs font-bold py-3.5 rounded-xl transition-all shadow-sm flex justify-center items-center gap-2"
              >
                 Abrir Preview <ExternalLink className="w-3.5 h-3.5" />
              </button>
           </div>
        </div>

      </div>
    </div>
    </div>
  );
}
