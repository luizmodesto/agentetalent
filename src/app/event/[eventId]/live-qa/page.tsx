"use client";

import { useState, useEffect, useRef, use } from "react";
import { Mic, Activity, User, QrCode, Settings } from "lucide-react";
import { VoiceSettingsModule } from '@/components/admin/VoiceSettingsModule';
import { supabase } from "@/utils/supabase/client";
import QRCode from "react-qr-code";

export default function LiveQAPanel({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [enteredCode, setEnteredCode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [screenId, setScreenId] = useState("");
  const [eventName, setEventName] = useState("DIGITALENT");
  const [logoUrl, setLogoUrl] = useState("");
  const [buttonText, setButtonText] = useState("CONECTAR ECRÃ");
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [aiState, setAiState] = useState<"idle" | "processing" | "speaking" | "paused">("idle");
  const [currentText, setCurrentText] = useState("A aguardar interação...");
  const [persistentText, setPersistentText] = useState("");
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("Abertura");
  const [aiMode, setAiMode] = useState("auto");
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const lastAlertTimeRef = useRef<number>(0);
  const lastSpokenTextRef = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [authorsData, setAuthorsData] = useState<{text: string, value: number}[]>([]);
  const [activeParticipants, setActiveParticipants] = useState<string[]>([]);
  const [questionAuthors, setQuestionAuthors] = useState<string[]>([]);
  const [speaker, setSpeaker] = useState<{name: string, bio: string, image_url: string} | null>(null);
  const [sponsors, setSponsors] = useState<string[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const colors = ["#818cf8", "#c084fc", "#f472b6", "#34d399", "#facc15", "#60a5fa", "#ffffff"];

  // Voice setup
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [rate, setRate] = useState<number>(1.05);
  const [pitch, setPitch] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [language, setLanguage] = useState<string>("pt-PT");

  // Initial load
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchConfig = async () => {
      // Fetch Event details
      const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).single();
      if (eventData) {
        setEventName(eventData.title || "DIGITALENT");
        if (eventData.logo_url) setLogoUrl(eventData.logo_url);
        if (eventData.language) setLanguage(eventData.language);
        
        if (eventData.personality) {
           try {
             const config = JSON.parse(eventData.personality);
             if (config.sponsors) setSponsors(config.sponsors);
             
             let voiceConfig = eventData.voice_settings || {};
             if (Object.keys(voiceConfig).length === 0) voiceConfig = config;
             if (voiceConfig.speed) setRate(voiceConfig.speed);
             if (voiceConfig.pitch) setPitch(voiceConfig.pitch);
             if (voiceConfig.tts_provider === 'native' && voiceConfig.voice_id) setVoiceURI(voiceConfig.voice_id);
             
             setIsEventOpen(config.is_event_open === true);
             if (config.current_phase) setCurrentPhase(config.current_phase);
             if (config.ai_mode) setAiMode(config.ai_mode);
             if (config.ai_force_speak?.time) lastAlertTimeRef.current = config.ai_force_speak.time;
           } catch(e) {}
        }
      }

      // Fetch Active Speaker
      const { data: sessionData } = await supabase.from('sessions').select('*, speakers(id, name, bio, photo_url)').eq('event_id', eventId).eq('status', 'live').maybeSingle();
      if (sessionData && sessionData.speakers) {
         setSpeaker({
           name: sessionData.speakers.name,
           bio: sessionData.speakers.bio,
           image_url: sessionData.speakers.photo_url
         });
      }

      // Fetch all question authors for the event
      const { data: sessions } = await supabase.from('sessions').select('id').eq('event_id', eventId);
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s: any) => s.id);
        const { data: qData } = await supabase.from('questions').select('author_name').in('session_id', sessionIds);
        if (qData) {
           const names = new Set<string>();
           qData.forEach((q: any) => {
              if (q.author_name) names.add(q.author_name);
           });
           setQuestionAuthors(Array.from(names));
        }
      }
    };

    fetchConfig();
  }, [eventId, isAuthenticated]);

  // Combine presence and questions for Word Cloud
  useEffect(() => {
     const allNames = new Set([...activeParticipants, ...questionAuthors]);
     const namesArray = Array.from(allNames);
     
     const mappedData = namesArray.map(name => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
          hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const size = (Math.abs(hash) % 25) + 18; 
        return { text: name, value: size };
     });
     setAuthorsData(mappedData);
  }, [activeParticipants, questionAuthors]);

  // Realtime Subscriptions
  useEffect(() => {
    if (!screenId || !isAuthenticated) return;

    const channel = supabase.channel('qa_panel_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, (payload) => {
        if (payload.new && payload.new.personality) {
           try {
             const config = JSON.parse(payload.new.personality);
             setIsEventOpen(config.is_event_open === true);
             if (config.current_phase) setCurrentPhase(config.current_phase);
             if (config.ai_mode) setAiMode(config.ai_mode);
             
             if (config.ai_force_speak && config.ai_force_speak.time && config.ai_force_speak.time > lastAlertTimeRef.current) {
                lastAlertTimeRef.current = config.ai_force_speak.time;
                forceAISpeak(config.ai_force_speak.text, config.ai_force_speak.questionText);
             }
           } catch(e) {}
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, async (payload) => {
         // Re-fetch all question authors when a new question arrives to ensure we capture all event participants
         const { data: sessions } = await supabase.from('sessions').select('id').eq('event_id', eventId);
         if (sessions && sessions.length > 0) {
            const sessionIds = sessions.map((s: any) => s.id);
            const { data: qData } = await supabase.from('questions').select('author_name').in('session_id', sessionIds);
            if (qData) {
               const names = new Set<string>();
               qData.forEach((q: any) => {
                  if (q.author_name) names.add(q.author_name);
               });
               setQuestionAuthors(Array.from(names));
            }
         }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions' }, async (payload) => {
         if (payload.new.status === 'live') {
            const { data } = await supabase.from('speakers').select('name, bio, photo_url').eq('id', payload.new.speaker_id).single();
            if (data) {
               setSpeaker({
                 name: data.name,
                 bio: data.bio,
                 image_url: data.photo_url
               });
            }
         }
      })
      .subscribe();

    const commandChannel = supabase.channel('live_screen_commands')
      .on('broadcast', { event: 'audio_command' }, (payload) => {
         const data = payload.payload;
         // PAIRING LOCK: Only execute commands if target_screen_id matches!
         if (data.target_screen_id === screenId) {
            switch(data.command) {
              case 'intro':
              case 'play_question':
                 if (data.text) {
                   forceAISpeak(data.text, data.questionText);
                   lastSpokenTextRef.current = data.text;
                 }
                 break;
              case 'repeat_question':
                 if (lastSpokenTextRef.current) {
                    forceAISpeak("Claro, vou repetir o que disse: " + lastSpokenTextRef.current);
                 }
                 break;
              case 'kill':
                 setAiState("idle");
                 setCurrentText("Áudio interrompido.");
                 if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    audioRef.current = null;
                 }
                 if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                 break;
              case 'pause':
                 setAiState("paused");
                 if (audioRef.current) audioRef.current.pause();
                 if ('speechSynthesis' in window) window.speechSynthesis.pause();
                 break;
              case 'resume':
                 setAiState("speaking");
                 if (audioRef.current) audioRef.current.play().catch(()=>{});
                 if ('speechSynthesis' in window) window.speechSynthesis.resume();
                 break;
            }
         }
      }).subscribe();

    const presenceChannel = supabase.channel(`presence_${eventId}`);
    presenceChannel.on('presence', { event: 'sync' }, () => {
       const state = presenceChannel.presenceState();
       const names = new Set<string>();
       for (const key in state) {
          state[key].forEach((p: any) => {
             if (p.name) names.add(p.name);
          });
       }
       const namesArray = Array.from(names);
       setActiveParticipants(namesArray);
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(commandChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [eventId, screenId, language, rate, pitch, voiceURI]);

  const fallbackToNativeTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      
      if (voiceURI) {
        const selectedVoice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
        if (selectedVoice) utterance.voice = selectedVoice;
      }
      
      utterance.onend = () => setAiState("idle");
      utterance.onerror = () => setAiState("idle");
      
      setAiState("speaking");
      setCurrentText(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const forceAISpeak = async (text: string, questionText?: string) => {
    try {
      if (questionText) {
         setPersistentText(questionText);
      } else if (text && !persistentText) {
         setPersistentText("");
      }
      
      setAiState("processing");
      
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, eventId })
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.volume = volume;
        audio.playbackRate = rate;
        
        audio.onended = () => {
           setAiState("idle");
           audioRef.current = null;
        };
        audio.onerror = () => fallbackToNativeTTS(text);
        
        setAiState("speaking");
        setCurrentText(text);
        audio.play().catch(() => fallbackToNativeTTS(text));
      } else {
        fallbackToNativeTTS(text);
      }
    } catch (e) {
      fallbackToNativeTTS(text);
    }
  };

  // Teleprompter Karaoke Effect
  useEffect(() => {
    if (aiState === "speaking") {
      const activeText = currentText;
      const words = activeText.split(" ");
      setCurrentWordIndex(0);
      
      const delayPerWord = 400 / rate; 
      
      const interval = setInterval(() => {
        setCurrentWordIndex(prev => {
          if (prev < words.length - 1) return prev + 1;
          clearInterval(interval);
          return prev;
        });
      }, delayPerWord);
      
      return () => clearInterval(interval);
    } else {
      setCurrentWordIndex(-1);
    }
  }, [currentText, aiState, rate]);


  const wordCloudStyles = `
    @keyframes wordFade {
      0% { opacity: 0; filter: blur(3px); }
      15% { opacity: 1; filter: blur(0px); }
      85% { opacity: 1; filter: blur(0px); }
      100% { opacity: 0; filter: blur(3px); }
    }
    
    .wordcloud-container span {
      animation: wordFade 8s ease-in-out infinite;
      will-change: opacity, filter;
      text-shadow: 0 0 15px rgba(255,255,255,0.1);
    }
    
    .wordcloud-container span:nth-child(2n) {
      animation-duration: 12s;
      animation-delay: -3s;
    }
    .wordcloud-container span:nth-child(3n) {
      animation-duration: 10s;
      animation-delay: -7s;
    }
    .wordcloud-container span:nth-child(5n) {
      animation-duration: 15s;
      animation-delay: -2s;
    }
    .wordcloud-container span:nth-child(7n) {
      animation-duration: 18s;
      animation-delay: -11s;
    }
  `;

  // Draw WordCloud using wordcloud2.js
  useEffect(() => {
    if (typeof window === 'undefined' || authorsData.length === 0 || !containerRef.current) return;
    
    let isCancelled = false;
    
    import('wordcloud').then((mod) => {
      if (isCancelled || !containerRef.current) return;
      const WordCloud = mod.default || mod;
      
      const list = authorsData.map(a => [a.text, Math.min(Math.max(a.value, 15), 45)]);
      
      const container = containerRef.current;
      Array.from(container.children).forEach(child => {
         if (child.tagName.toUpperCase() === 'SPAN') {
            container.removeChild(child);
         }
      });
      
      WordCloud(container, {
        list: list,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        color: () => colors[Math.floor(Math.random() * colors.length)],
        rotateRatio: 0.3,
        rotationSteps: 2,
        backgroundColor: 'transparent',
        gridSize: 12,
        weightFactor: (size: number) => size * 1.5,
        shrinkToFit: true,
        drawOutOfBound: false,
      });
    });
    
    return () => { isCancelled = true; };
  }, [authorsData]);

  // Load Voices
  useEffect(() => {
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const langFilter = language === "en-US" ? "en" : "pt";
        const availableVoices = window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().includes(langFilter));
        setVoices(availableVoices);
        if (availableVoices.length > 0 && !voiceURI) {
          setVoiceURI(availableVoices[0].voiceURI);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [voiceURI, language]);

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-full bg-[#1E222B] text-white flex items-center justify-center font-sans">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-10 rounded-3xl flex flex-col items-center shadow-2xl max-w-md w-full">
          <h2 className="text-2xl font-black mb-2 tracking-widest text-center uppercase">Ligar ao Evento</h2>
          <p className="text-slate-400 text-sm mb-8 text-center">Introduza o código de pareamento visível no Painel de Controlo.</p>
          <input 
            ref={inputRef}
            type="text" 
            defaultValue=""
            maxLength={6}
            placeholder="EX: A7B2"
            className="w-full bg-slate-800/80 border border-slate-600 rounded-xl px-4 py-4 text-center text-3xl font-black tracking-widest text-emerald-400 mb-6 focus:outline-none focus:border-indigo-500 uppercase"
          />
          <button 
            onClick={() => {
               setButtonText("A VERIFICAR...");
               const val = inputRef.current?.value || "";
               if (val.trim().length >= 4) {
                 setScreenId(val.trim().toUpperCase());
                 setIsAuthenticated(true);
               } else {
                 setButtonText("CÓDIGO INVÁLIDO!");
                 setTimeout(() => setButtonText("CONECTAR ECRÃ"), 2000);
               }
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors tracking-widest"
          >
            {buttonText}
          </button>
        </div>
      </div>
    );
  }

  // --- WAITING ROOM (Big Screen) ---
  if (!isEventOpen && isAuthenticated) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden bg-[#0A0F1C]">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen"
          style={{ backgroundImage: "url('/waiting-bg.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C] via-[#0A0F1C]/80 to-transparent" />
        
        <div className="relative z-10 flex flex-col items-center max-w-4xl w-full text-center">
          <img src={logoUrl || "https://i.imgur.com/EpDGrzT.png"} alt="Logo do Evento" className="h-32 md:h-48 object-contain mb-8 animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          
          <h1 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tight drop-shadow-lg">
            A sala vai abrir dia <br/><span className="text-emerald-400">09/07/2026</span>
          </h1>
          
          <p className="text-2xl md:text-3xl text-slate-300 mb-12 leading-relaxed max-w-3xl drop-shadow-md">
            Prepare-se para uma experiência incrível. Acesse o site <a href="https://digitalent.pt" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-bold hover:text-emerald-300 underline decoration-emerald-400/30 underline-offset-4 transition-colors">digitalent.pt</a> e fique sempre atento às novidades.
          </p>
          
          <div className="flex items-center justify-center gap-8 bg-slate-900/60 backdrop-blur-md p-6 rounded-[2rem] border border-slate-700 shadow-2xl">
             <div className="bg-white p-3 rounded-2xl">
               {typeof window !== 'undefined' && <QRCode value={`${window.location.origin}/event/${eventId}/pergunta`} size={120} />}
             </div>
             <div className="text-left">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Junte-se à fila</p>
               <p className="font-black text-emerald-400 text-3xl uppercase">Aponte a Câmera</p>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#1E222B] text-white flex flex-col p-6 overflow-hidden font-sans">
      
      <style>{wordCloudStyles}</style>

      {/* HEADER */}
      <header className="flex justify-between items-center h-20 shrink-0 border-b border-slate-700/50 pb-4 mb-6">
        <div className="flex items-center gap-4 w-1/3">
          <img src="https://i.imgur.com/EpDGrzT.png" alt="Logo" className="h-12 object-contain" />
          <h1 className="text-2xl font-bold tracking-tight text-white/90">{eventName}</h1>
          {/* Modal Configuração de Voz */}
          {isVoiceSettingsOpen && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
              <div className="bg-[#0F172A] w-full max-w-4xl rounded-3xl border border-slate-700/50 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                 <button onClick={() => setIsVoiceSettingsOpen(false)} className="absolute top-4 right-4 bg-slate-800 text-white p-2 rounded-full hover:bg-slate-700">
                    ✕
                 </button>
                 <div className="p-8">
                   <VoiceSettingsModule eventId={eventId} supabase={supabase} />
                 </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="w-1/3 text-center flex flex-col items-center">
          <h2 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
             Painel de Perguntas
          </h2>
          <div className="flex gap-2 mt-2">
             <span className="bg-slate-800/80 border border-slate-700/50 px-3 py-1 text-[10px] font-bold uppercase rounded-full text-indigo-300 tracking-wider">Fase: {currentPhase}</span>
             <span className="bg-slate-800/80 border border-slate-700/50 px-3 py-1 text-[10px] font-bold uppercase rounded-full text-emerald-300 tracking-wider">Modo IA: {aiMode}</span>
          </div>
        </div>

        <div className="w-1/3 flex justify-end items-center gap-6">
          <button onClick={() => setIsVoiceSettingsOpen(true)} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800">
             <Settings className="w-4 h-4" /> Voz
          </button>
          <div className="text-right">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID do Ecrã</div>
             <div className="text-2xl font-black text-white tracking-widest bg-slate-800/50 px-3 py-1 rounded-xl border border-slate-700">{screenId}</div>
          </div>

          <div className={`flex items-center gap-3 border-2 px-5 py-2 rounded-2xl transition-colors duration-500 bg-slate-900/50 backdrop-blur-md shadow-lg
            ${aiState === "processing" ? "border-amber-500/50" : "border-emerald-500/30"}`}>
            <div className={`w-3 h-3 rounded-full ${
              aiState === "processing" ? "bg-amber-500 animate-pulse" : 
              aiState === "speaking" ? "bg-emerald-400 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]" :
              "bg-emerald-500"
            }`}></div>
            <div className="flex flex-col">
               <span className="font-black text-sm uppercase tracking-widest text-slate-200">DIGITALENT</span>
               <span className={`text-[10px] uppercase font-bold tracking-widest ${
                 aiState === "processing" ? "text-amber-400" : "text-emerald-400"
               }`}>
                 {aiState === "idle" ? "Ativa (Online)" : 
                  aiState === "processing" ? "A Processar..." : 
                  aiState === "paused" ? "Pausada" : "A Falar"}
               </span>
            </div>
          </div>
        </div>
      </header>

      {/* CENTER ROW */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* LEGENDA IA E PERGUNTA */}
        <div className="flex-[3] bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5"></div>
          
          <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center text-center">
             {aiState === "idle" && currentText === "A aguardar interação..." && (
                <div className="text-slate-500 text-3xl font-light mb-4">
                   Aguardando perguntas...
                </div>
             )}
             
             {/* THE MAIN ASSEMBLED QUESTION */}
             <p className={`${(persistentText || currentText).length > 250 ? 'text-2xl lg:text-3xl' : (persistentText || currentText).length > 150 ? 'text-3xl lg:text-4xl' : (persistentText || currentText).length > 80 ? 'text-4xl lg:text-5xl' : 'text-5xl lg:text-6xl'} font-black leading-tight tracking-tight text-white mb-8 transition-opacity duration-500`}>
               {persistentText || currentText}
             </p>
          </div>

          {/* THE SUBTITLE / KARAOKE */}
          {aiState === "speaking" && currentText && (
             <div className="relative z-10 w-full bg-slate-950/80 border border-slate-700/50 p-6 rounded-2xl mt-auto shadow-inner">
               <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                     IA a Falar:
                  </span>
               </div>
               <p className="text-xl lg:text-2xl leading-relaxed text-slate-500 font-medium">
                 {currentText.split(" ").map((word, i) => (
                   <span key={i} className={`transition-colors duration-150 ${i <= currentWordIndex ? "text-emerald-400 underline decoration-emerald-400/50 underline-offset-4" : ""}`}>
                      {word}{" "}
                   </span>
                 ))}
               </p>
             </div>
          )}
        </div>

        {/* NUVEM E ORADOR */}
        <div className="flex-[2] flex flex-col gap-6">
           <div className="flex-[2] bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 relative overflow-hidden flex flex-col shadow-lg">
              <h3 className="text-center font-bold text-slate-400 uppercase tracking-widest text-xs mb-4 z-10">Participantes Ativos</h3>
              <div ref={containerRef} className="wordcloud-container flex-1 w-full h-full relative overflow-hidden">
                 {authorsData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-light text-sm italic">Nenhum participante...</div>
                 )}
              </div>
           </div>

           {/* SPEAKER CARD */}
           <div className="shrink-0 h-48 bg-gradient-to-br from-indigo-900/40 to-slate-900/80 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex items-center gap-6 relative overflow-hidden">
              {speaker?.image_url ? (
                <>
                  <div 
                    className="absolute inset-0 opacity-40 bg-cover bg-top blur-sm scale-105 pointer-events-none" 
                    style={{ backgroundImage: `url(${speaker.image_url})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-900/60 to-slate-900/90 pointer-events-none" />
                </>
              ) : (
                <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                   <User className="w-64 h-64 text-indigo-400" />
                </div>
              )}
              <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-indigo-400 shadow-xl relative z-10 bg-slate-800">
                 {speaker?.image_url ? (
                   <img src={speaker.image_url} alt={speaker.name} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center"><User className="w-12 h-12 text-slate-500" /></div>
                 )}
              </div>
              <div className="relative z-10 flex-1">
                 <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-1">Em Palco</p>
                 <h3 className="text-3xl font-black text-white mb-2 leading-none line-clamp-1">{speaker?.name || "Nenhum Orador"}</h3>
                 <p className="text-slate-300 font-medium text-sm line-clamp-2">{speaker?.bio || "Aguardando próxima sessão..."}</p>
              </div>
           </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="shrink-0 h-28 mt-6 flex gap-6">
         {/* QR CODE */}
         <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 shadow-lg shrink-0">
            <div className="bg-white p-2 rounded-xl relative flex items-center justify-center">
               {typeof window !== 'undefined' && (
                 <QRCode 
                   value={`${window.location.origin}/event/${eventId}/pergunta`} 
                   size={130} 
                   level="H"
                 />
               )}
               {/* Logo no centro do QR Code */}
               <div className="absolute flex items-center justify-center">
                 <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
                   <img src="https://i.imgur.com/EpDGrzT.png" alt="Logo" className="h-6 object-contain" />
                 </div>
               </div>
            </div>
            <div className="pr-4">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Envie a sua</p>
               <p className="font-black text-emerald-400 text-lg leading-tight uppercase">Pergunta</p>
            </div>
         </div>

         {/* MARQUEE SPONSORS */}
         <div className="flex-1 bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden flex items-center shadow-lg relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#1E222B] to-transparent z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#1E222B] to-transparent z-10"></div>
            
            {sponsors.length > 0 ? (
              <div className="flex items-center gap-16 px-6 animate-marquee whitespace-nowrap min-w-full justify-around h-full">
                {sponsors.map((url, i) => (
                  <img key={i} src={url} alt={`Sponsor ${i}`} className="h-12 object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all" />
                ))}
                {sponsors.map((url, i) => (
                  <img key={`clone-${i}`} src={url} alt={`Sponsor Clone ${i}`} className="h-12 object-contain grayscale opacity-70" />
                ))}
              </div>
            ) : (
              <div className="w-full text-center text-slate-500 font-bold uppercase tracking-widest text-lg">
                 Parceiros do Evento
              </div>
            )}
         </div>
      </footer>

    </div>
  );
}
