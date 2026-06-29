"use client";

import { useState, useEffect, useRef, use } from "react";
import { Mic, Activity, User, QrCode } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

import QRCode from "react-qr-code";

export default function LiveQAPanel({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [enteredCode, setEnteredCode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [screenId, setScreenId] = useState("");
  const [eventName, setEventName] = useState("DIGITALENT");
  const [logoUrl, setLogoUrl] = useState("");
  
  const [aiState, setAiState] = useState<"idle" | "processing" | "speaking">("idle");
  const [currentText, setCurrentText] = useState("A aguardar interação...");
  const [displayedText, setDisplayedText] = useState("");
  const [isEventOpen, setIsEventOpen] = useState(false);
  
  const [authorsData, setAuthorsData] = useState<{text: string, value: number}[]>([]);
  const [activeParticipants, setActiveParticipants] = useState<string[]>([]);
  const [speaker, setSpeaker] = useState<{name: string, bio: string, image_url: string} | null>(null);
  const [sponsors, setSponsors] = useState<string[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const colors = ["#818cf8", "#c084fc", "#f472b6", "#34d399", "#facc15", "#60a5fa", "#ffffff"];
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

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

      // fetchQuestions removido
    };

    fetchConfig();
  }, [eventId, isAuthenticated]);

  // Remover fetchQuestions já que vamos usar apenas Presence para a Nuvem de Palavras

  // Realtime Subscriptions
  useEffect(() => {
    if (!screenId || !isAuthenticated) return;

    const channel = supabase.channel('qa_panel_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, (payload) => {
        if (payload.new && payload.new.personality) {
           try {
             const config = JSON.parse(payload.new.personality);
             
             setIsEventOpen(config.is_event_open === true);
             
             // PAIRING LOCK: Only execute commands if target_screen_id matches!
             if (config.target_screen_id === screenId) {
                if (config.ai_force_speak && config.ai_force_speak.time) {
                   const timeSinceSpeak = Date.now() - config.ai_force_speak.time;
                   if (timeSinceSpeak < 5000) {
                     forceAISpeak(config.ai_force_speak.text);
                   }
                }
                
                if (config.teleprompter_alert && config.teleprompter_alert_time) {
                   const timeSinceAlert = Date.now() - config.teleprompter_alert_time;
                   if (timeSinceAlert < 5000) {
                     forceAISpeak(config.teleprompter_alert);
                   }
                }

                if (config.kill_audio) {
                   setAiState("idle");
                   setCurrentText("Áudio interrompido.");
                   window.speechSynthesis.cancel();
                }
             }
           } catch(e) {}
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
         // Não fazemos re-fetch do wordcloud por questões, apenas por presence
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
       
       // Alimentar o WordCloud com os nomes dos participantes (tamanhos aleatórios pseudo-determinísticos para não saltar muito)
       const mappedData = namesArray.map(name => {
          let hash = 0;
          for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
          }
          const size = (Math.abs(hash) % 25) + 18; 
          return { text: name, value: size };
       });
       setAuthorsData(mappedData);
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  const forceAISpeak = async (text: string) => {
    try {
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
        audio.volume = volume;
        audio.playbackRate = rate;
        
        audio.onended = () => setAiState("idle");
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

  // Teleprompter Typewriter Effect
  useEffect(() => {
    if (aiState === "speaking") {
      const words = currentText.split(" ");
      let currentIndex = 0;
      setDisplayedText("");
      
      const delayPerWord = 400 / rate; 
      
      const interval = setInterval(() => {
        if (currentIndex < words.length) {
          setDisplayedText(prev => prev + (prev ? " " : "") + words[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, delayPerWord);
      
      return () => clearInterval(interval);
    } else {
      setDisplayedText(currentText);
    }
  }, [currentText, aiState, rate]);


  // Word Cloud Render
  useEffect(() => {
    if (containerRef.current) {
       containerRef.current.innerHTML = ''; // Limpar o canvas/div antigo sempre!
       
       if (authorsData.length > 0) {
         setTimeout(async () => {
           if (!containerRef.current) return;
           const WordCloud = (await import("wordcloud")).default;
           WordCloud(containerRef.current, {
             list: authorsData.map(a => [a.text, a.value]),
             fontFamily: 'Inter, sans-serif',
             weight: 'bold',
             color: () => colors[Math.floor(Math.random() * colors.length)],
             rotateRatio: 0.3,
             rotationSteps: 2,
             backgroundColor: 'transparent',
             shape: 'circle',
             gridSize: 12,
             drawOutOfBound: false,
             shrinkToFit: true,
           });
         }, 300); // Dar tempo para a DOM assentar
       }
    }
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
            type="text" 
            value={enteredCode}
            onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="EX: A7B2"
            className="w-full bg-slate-800/80 border border-slate-600 rounded-xl px-4 py-4 text-center text-3xl font-black tracking-widest text-emerald-400 mb-6 focus:outline-none focus:border-indigo-500"
          />
          <button 
            onClick={() => {
               if (enteredCode.length >= 4) {
                 setScreenId(enteredCode);
                 setIsAuthenticated(true);
               }
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors tracking-widest"
          >
            CONECTAR ECRÃ
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
      
      {/* HEADER */}
      <header className="flex justify-between items-center h-20 shrink-0 border-b border-slate-700/50 pb-4 mb-6">
        <div className="flex items-center gap-4 w-1/3">
          <img src="https://i.imgur.com/EpDGrzT.png" alt="Logo" className="h-12 object-contain" />
          <h1 className="text-2xl font-bold tracking-tight text-white/90">{eventName}</h1>
        </div>
        
        <div className="w-1/3 text-center flex flex-col items-center">
          <h2 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
             Painel de Perguntas
          </h2>
        </div>

        <div className="w-1/3 flex justify-end items-center gap-6">
          <div className="text-right">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID do Ecrã</div>
             <div className="text-2xl font-black text-white tracking-widest bg-slate-800/50 px-3 py-1 rounded-xl border border-slate-700">{screenId}</div>
          </div>

          <div className={`flex items-center gap-3 border-2 px-5 py-2 rounded-2xl transition-colors duration-500 bg-slate-900/50 backdrop-blur-md shadow-lg
            ${aiState === "idle" ? "border-red-500/30" : 
              aiState === "processing" ? "border-amber-500/50" : "border-emerald-500/50"}`}>
            <div className={`w-3 h-3 rounded-full ${
              aiState === "idle" ? "bg-red-500" : 
              aiState === "processing" ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]"
            }`}></div>
            <div className="flex flex-col">
               <span className="font-black text-sm uppercase tracking-widest text-slate-200">DIGITALENT</span>
               <span className={`text-[10px] uppercase font-bold tracking-widest ${
                 aiState === "idle" ? "text-red-400" : 
                 aiState === "processing" ? "text-amber-400" : "text-emerald-400"
               }`}>
                 {aiState === "idle" ? "Inativa" : aiState === "processing" ? "A Processar..." : "A Falar"}
               </span>
            </div>
          </div>
        </div>
      </header>

      {/* CENTER ROW */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* LEGENDA IA */}
        <div className="flex-[3] bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-12 flex items-center justify-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5"></div>
          
          <div className="relative z-10 w-full text-center">
             {aiState === "idle" && (
                <div className="text-slate-500 text-3xl font-light mb-4">
                   Aguardando perguntas...
                </div>
             )}
             <p className={`text-5xl lg:text-6xl font-black leading-tight tracking-tight transition-all duration-500 ${aiState === "speaking" ? "text-white" : "text-slate-400"}`}>
               {displayedText}
             </p>
          </div>
        </div>

        {/* NUVEM E ORADOR */}
        <div className="flex-[2] flex flex-col gap-6">
           <div className="flex-[2] bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 relative overflow-hidden flex flex-col shadow-lg">
              <h3 className="text-center font-bold text-slate-400 uppercase tracking-widest text-xs mb-4">Participantes Ativos</h3>
              <div className="flex-1 w-full h-full relative min-h-[150px]">
                 <div ref={containerRef} className="absolute inset-0 w-full h-full"></div>
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
