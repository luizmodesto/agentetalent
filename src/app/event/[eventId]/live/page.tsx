"use client";

import { useState, useEffect, useRef, use } from "react";
import { Mic, Settings, X, Volume2, Gauge, Activity } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export default function SpeakerTeleprompter({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [aiState, setAiState] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [currentText, setCurrentText] = useState("Pressione a barra de espaço ou clique na tela para começar a falar com a DIGITALENT.");
  const [bars, setBars] = useState<number[]>(Array(9).fill(20));

  // Voice Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [rate, setRate] = useState<number>(1.05);
  const [pitch, setPitch] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);

  const recognitionRef = useRef<any>(null);
  const isContinuousRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");

  // Carrega configurações iniciais do Admin (BD)
  useEffect(() => {
    const fetchConfig = async () => {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await supabase.from('events').select('personality').eq('id', eventId).single();
      if (data && data.personality) {
        try {
          const config = JSON.parse(data.personality);
          if (config.speed) setRate(config.speed);
          if (config.pitch) setPitch(config.pitch);
          // O volume e voiceURI locais ainda prevalecem se o usuário quiser sobrescrever durante a live
        } catch (e) { }
      }
    };
    fetchConfig();
  }, [eventId]);

  // Carrega as vozes disponíveis
  useEffect(() => {
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices().filter(v => v.lang.includes("pt") || v.lang.includes("PT"));
        setVoices(availableVoices);
        if (availableVoices.length > 0 && !voiceURI) {
          // Define a primeira voz PT como padrão
          setVoiceURI(availableVoices[0].voiceURI);
        }
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [voiceURI]);

  // Inicializa o Reconhecimento de Voz (Web Speech API)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true; // Mostra o texto em tempo real!
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onstart = () => {
          isContinuousRef.current = true;
          setAiState("listening");
          setCurrentText("DIGITALENT em escuta contínua.\nFale a sua pergunta e aguarde 4 segundos...");
        };

        recognitionRef.current.onresult = (event: any) => {
          // Captura o histórico completo da fala atual
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            fullTranscript += event.results[i][0].transcript;
          }
          
          const transcript = fullTranscript.toLowerCase().trim();
          lastTranscriptRef.current = transcript;
          
          // Dá um feedback visual na tela para o utilizador saber que o mic está a funcionar
          if (aiState === "listening" || isContinuousRef.current) {
            setCurrentText(`🗣️ "${transcript}..."`);
          }

          // Cancela o timer anterior se a pessoa continuar falando
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          // Verifica se tem o Wake Word imediatamente para atalho (opcional)
          if (transcript.includes("digitalent") || transcript.includes("talent") || transcript.includes("olá digitalent") || transcript.includes("agente")) {
             if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
             setCurrentText(`✨ Processando comando...`);
             processAICommand(transcript);
             return;
          }

          // Configura o novo timer de 4 segundos de silêncio
          silenceTimerRef.current = setTimeout(() => {
            const finalSpeech = lastTranscriptRef.current;
            if (finalSpeech.length > 3 && isContinuousRef.current && aiState !== "processing") {
               setCurrentText(`✨ Silêncio detectado. Processando: "${finalSpeech}"`);
               processAICommand(finalSpeech);
            }
          }, 4000);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          isContinuousRef.current = false;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          setAiState("idle");
          setCurrentText(`Erro do Navegador (${event.error}): O Microfone foi bloqueado. Certifique-se de usar o link com HTTPS!`);
        };

        recognitionRef.current.onend = () => {
          // Se o sistema estiver ativo mas a API caiu (timeout padrão do browser), reiniciamos imediatamente.
          if (isContinuousRef.current && aiState !== "processing" && aiState !== "speaking") {
            try {
              recognitionRef.current.start();
            } catch (e) {}
          }
        };
      } else {
        setCurrentText("O seu navegador não suporta a gravação de voz (Tente usar o Google Chrome).");
      }
    }
  }, [eventId]);

  const toggleListening = () => {
    if (aiState === "listening") {
      isContinuousRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
      setAiState("idle");
      setCurrentText("Microfone desligado. Toque para iniciar.");
    } else {
      try {
        if (!recognitionRef.current) {
           setCurrentText("O seu navegador não suporta a gravação de voz.");
           return;
        }
        recognitionRef.current.start();
      } catch (e: any) {
        console.error(e);
        setCurrentText("Erro ao iniciar o microfone: " + (e.message || "Bloqueado pelo celular. Tente usar o Computador."));
      }
    }
  };

  const fallbackToNativeTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.lang = 'pt-BR';
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      
      if (voiceURI) {
        const selectedVoice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
        if (selectedVoice) utterance.voice = selectedVoice;
      }
      
      utterance.onend = () => {
        isContinuousRef.current = true;
        try { recognitionRef.current?.start(); } catch (e) {}
      };
      
      utterance.onerror = (e) => {
        console.error("Erro no áudio:", e);
        isContinuousRef.current = true;
        try { recognitionRef.current?.start(); } catch (err) {}
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      const readingTime = Math.max(3000, text.length * 60);
      setTimeout(() => {
        isContinuousRef.current = true;
        try { recognitionRef.current?.start(); } catch (e) {}
      }, readingTime);
    }
  };

  const processAICommand = async (transcript: string) => {
    try {
      isContinuousRef.current = false; // Pausa a escuta contínua para não se ouvir a si mesma
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
      lastTranscriptRef.current = ""; // Limpa a memória

      setAiState("processing");
      setCurrentText("A processar a sua fala...");
      
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, command: transcript })
      });
      
      const data = await res.json();
      
      if (data.reply) {
        setAiState("speaking");
        setCurrentText(data.reply);
        
        // Se a API retornou áudio (via ElevenLabs), nós o tocamos primeiro
        if (data.audioBase64) {
          const audio = new Audio("data:audio/mp3;base64," + data.audioBase64);
          audio.volume = volume;
          
          audio.onended = () => {
            isContinuousRef.current = true;
            try { recognitionRef.current?.start(); } catch (e) {}
          };

          audio.onerror = (e) => {
            console.error("Erro no áudio ElevenLabs:", e);
            fallbackToNativeTTS(data.reply);
          };

          audio.play().catch((e) => {
             console.error("Falha ao dar play no áudio", e);
             fallbackToNativeTTS(data.reply);
          });
          return;
        }

        // Falar a resposta usando o sintetizador de voz do navegador (Native Fallback)
        fallbackToNativeTTS(data.reply);

      } else {
        isContinuousRef.current = true;
        try { recognitionRef.current?.start(); } catch (e) {}
        setCurrentText("Desculpe, não consegui obter uma resposta. Tente dizer 'Digitalent' novamente.");
      }
    } catch (e) {
      console.error(e);
      isContinuousRef.current = true;
      try { recognitionRef.current?.start(); } catch (e) {}
      setCurrentText("Erro ao conectar com a DIGITALENT.");
    }
  };

  // Animação das barras de áudio (Speaking)
  useEffect(() => {
    if (aiState !== "speaking") return;
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => 20 + Math.random() * 80));
    }, 150);
    return () => clearInterval(interval);
  }, [aiState]);

  // Atalho do teclado (Spacebar) para ligar/desligar o microfone
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // Evita rolar a página
        toggleListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aiState]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between p-8 md:p-16 overflow-hidden selection:bg-purple-500/30">
      
      {/* BOTÃO INVISÍVEL GIGANTE PARA TOUCH NO CELULAR */}
      <button 
        onClick={toggleListening}
        onTouchStart={(e) => { 
          if (isSettingsOpen) return; // Não ativa o microfone se estiver a mexer no menu
          e.preventDefault(); 
          toggleListening(); 
        }}
        className={`fixed inset-0 w-full h-full z-40 cursor-pointer bg-transparent outline-none ${isSettingsOpen ? 'pointer-events-none' : ''}`}
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        aria-label="Pressione em qualquer lugar para falar"
      />

      {/* HEADER BAR */}
      <header className="flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity relative z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
            <span className="font-bold text-lg">AI</span>
          </div>
          <div className="pointer-events-none">
            <h1 className="text-2xl font-bold tracking-tight">DIGITALENT Teleprompter</h1>
            <p className="text-neutral-500 font-medium">Tech Summit 2026</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 px-6 py-3 rounded-full pointer-events-none">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-400 font-bold uppercase tracking-widest hidden sm:inline-block">No Ar</span>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 text-neutral-300 hover:text-white pointer-events-auto"
            title="Configurações de Voz"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* MAIN TEXT AREA */}
      <main className="flex-1 flex items-center justify-center py-12 relative z-10 pointer-events-none">
        <h2 className={`text-5xl md:text-7xl font-bold leading-[1.2] text-center max-w-6xl transition-all duration-700 ${
          aiState === "listening" ? "text-neutral-600 scale-95" : 
          aiState === "processing" ? "text-indigo-400 animate-pulse" :
          "text-white scale-100"
        }`}>
          {currentText}
        </h2>
      </main>

      {/* AI VISUALIZER FOOTER */}
      <footer className="flex flex-col items-center justify-center gap-10 pb-8 relative z-10 pointer-events-none">
        <p className={`text-sm uppercase tracking-widest font-bold transition-colors ${
          aiState === "speaking" ? "text-purple-400" : 
          aiState === "listening" ? "text-red-500" :
          aiState === "processing" ? "text-indigo-400" :
          "text-neutral-600"
        }`}>
          {aiState === "speaking" ? "A DIGITALENT está a falar" : 
           aiState === "listening" ? "A DIGITALENT está a ouvir" : 
           aiState === "processing" ? "A DIGITALENT está a pensar..." : 
           "Sistema em modo de espera"}
          <span className="block text-center text-xs opacity-50 mt-3 text-neutral-500">
            (Toque em qualquer lugar da tela para falar)
          </span>
        </p>

        {/* AI CORE VISUALIZATION */}
        <div className="relative flex items-center justify-center h-32 w-full">
          {aiState === "listening" ? (
            // LISTENING MODE: Pulsing Red Microphone
            <div className="flex items-center justify-center relative">
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20 scale-150"></div>
              <div className="absolute inset-0 bg-red-500/30 rounded-full animate-pulse scale-125"></div>
              <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center z-10 shadow-[0_0_60px_rgba(220,38,38,0.6)]">
                <Mic className="w-10 h-10 text-white" />
              </div>
            </div>
          ) : aiState === "speaking" ? (
          <div className="flex items-end gap-1.5 h-16 pointer-events-auto cursor-pointer" onClick={toggleListening} title="Toque para parar a fala">
            {bars.map((height, i) => (
              <div 
                key={i} 
                className="w-2 md:w-3 bg-gradient-to-t from-purple-600 to-indigo-400 rounded-t-full transition-all duration-150"
                style={{ height: `${height}%` }}
              ></div>
            ))}
          </div>
        ) : (
          <div 
            onClick={toggleListening}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer pointer-events-auto shadow-2xl ${
              aiState === "listening" ? "bg-red-600 shadow-red-600/50 scale-110 animate-pulse" : 
              aiState === "processing" ? "bg-indigo-600 shadow-indigo-600/50 animate-bounce" :
              "bg-neutral-800 hover:bg-neutral-700 hover:scale-105"
            }`}
          >
            <Mic className={`w-10 h-10 ${aiState === "listening" ? "text-white" : "text-neutral-400"}`} />
          </div>
        )}
        </div>
      </footer>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-indigo-500/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                Voz da IA
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-neutral-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2 flex items-center gap-2">
                  <Mic className="w-4 h-4" /> Escolher Voz (Disponíveis no seu Celular/PC)
                </label>
                <select 
                  value={voiceURI} 
                  onChange={(e) => setVoiceURI(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {voices.length === 0 && <option value="">Nenhuma voz em PT encontrada</option>}
                  {voices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                  ))}
                </select>
                {voices.length === 0 && <p className="text-xs text-red-400 mt-2">Dica: No celular, certifique-se que o idioma Português está baixado nas definições de acessibilidade.</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2 flex justify-between items-center">
                  <span className="flex items-center gap-2"><Gauge className="w-4 h-4" /> Velocidade</span>
                  <span className="text-indigo-400">{rate}x</span>
                </label>
                <input type="range" min="0.5" max="2.0" step="0.1" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2 flex justify-between items-center">
                  <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> Tom (Pitch)</span>
                  <span className="text-indigo-400">{pitch}</span>
                </label>
                <input type="range" min="0.5" max="2.0" step="0.1" value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2 flex justify-between items-center">
                  <span className="flex items-center gap-2"><Volume2 className="w-4 h-4" /> Volume</span>
                  <span className="text-indigo-400">{Math.round(volume * 100)}%</span>
                </label>
                <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
              </div>

              <div className="pt-4 border-t border-neutral-800">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Confirmar Configurações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
