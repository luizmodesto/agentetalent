"use client";

import { useState, useEffect, useRef, use } from "react";
import { Mic, Settings, X, Volume2, Gauge, Activity, AlertCircle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import WordCloud from "wordcloud";

export default function SpeakerTeleprompter({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [aiState, setAiState] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [currentText, setCurrentText] = useState("Pressione a barra de espaço ou clique na tela para começar a falar com a DIGITALENT.");
  const [displayedText, setDisplayedText] = useState("");
  const [bars, setBars] = useState<number[]>(Array(9).fill(20));

  // Voice Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [rate, setRate] = useState<number>(1.05);
  const [pitch, setPitch] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [language, setLanguage] = useState<string>("pt-PT");

  const recognitionRef = useRef<any>(null);
  const isContinuousRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");

  // Slider Mode State
  const [isSliderMode, setIsSliderMode] = useState(false);
  const isSliderModeRef = useRef(false);

  // Slide & Sponsors & Names State
  const [slideUrl, setSlideUrl] = useState<string>("");
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [voiceCommands, setVoiceCommands] = useState({ next: "próxima página", prev: "retorna" });
  const [authorsData, setAuthorsData] = useState<{text: string, value: number}[]>([]);
  const [highlightedName, setHighlightedName] = useState<string | null>(null);
  
  // Custom colors for word cloud
  const colors = ["#818cf8", "#c084fc", "#f472b6", "#34d399", "#facc15", "#60a5fa", "#ffffff"];
  
  const containerRef = useRef<HTMLDivElement>(null);
  const personalityRef = useRef<any>({});
  
  // Teleprompter Alert State
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const lastAlertTime = useRef<number>(0);
  const [forceSpeakData, setForceSpeakData] = useState<{text: string, time: number} | null>(null);
  const lastSpeakTime = useRef<number>(0);

  // Carrega configurações iniciais do Admin (BD)
  useEffect(() => {
    const fetchConfig = async () => {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await supabase.from('events').select('personality, voice_settings, language').eq('id', eventId).single();
      
      // Fetch names from questions
      const { data: questionsData } = await supabase.from('questions').select('author_name').eq('status', 'approved');
      let usedData = questionsData;

      // Hack para simulação caso o script tenha deixado as perguntas como pending sem sessão
      if (!usedData || usedData.length === 0) {
         const { data: pendingData } = await supabase.from('questions').select('author_name').eq('status', 'pending');
         usedData = pendingData;
      }

      if (usedData) {
        const counts: Record<string, number> = {};
        usedData.forEach(q => {
          if (q.author_name) counts[q.author_name] = (counts[q.author_name] || 0) + 1;
        });
        const mappedData = Object.entries(counts).map(([text, count]) => ({
          text,
          value: count * 5 + 10 // Tamanho ajustado para caber bem no SVG
        }));
        setAuthorsData(mappedData);
      }

      if (data) {
        if (data.language) setLanguage(data.language);
        if (data.personality) {
          try {
            const config = JSON.parse(data.personality);
            personalityRef.current = config;
            
            // Prioriza voice_settings
            let voiceConfig = data.voice_settings || {};
            if (Object.keys(voiceConfig).length === 0) {
               voiceConfig = config; // fallback to personality
            }
            
            if (voiceConfig.speed) setRate(voiceConfig.speed);
            if (voiceConfig.pitch) setPitch(voiceConfig.pitch);
            if (voiceConfig.tts_provider === 'native' && voiceConfig.voice_id) {
               setVoiceURI(voiceConfig.voice_id);
            }
            
            if (config.sponsors && Array.isArray(config.sponsors)) setSponsors(config.sponsors);
            if (config.voice_commands) setVoiceCommands(config.voice_commands);
            
            // Resolução do Slide Atual
            if (config.slide_decks && config.active_speaker_id) {
              const speakerSlides = config.slide_decks[config.active_speaker_id] || [];
              const idx = config.current_slide_index || 0;
              if (speakerSlides[idx]) setSlideUrl(speakerSlides[idx]);
              setSlideIndex(idx);
            } else if (config.current_slide) {
              setSlideUrl(config.current_slide);
              setSlideIndex(config.current_slide_index || 0);
            }
          } catch (e) {
            console.error("Error parsing personality JSON", e);
          }
        }
        
        if (data.personality) {
          try {
             const config = JSON.parse(data.personality);
             if (config.teleprompter_alert && config.teleprompter_alert_time) {
             lastAlertTime.current = config.teleprompter_alert_time;
             const timeSinceAlert = Date.now() - config.teleprompter_alert_time;
             if (timeSinceAlert < 15000) {
               setAlertMessage(config.teleprompter_alert);
               setTimeout(() => setAlertMessage(null), 15000 - timeSinceAlert);
             }
          }
          
          if (config.ai_force_speak && config.ai_force_speak.time) {
             lastSpeakTime.current = config.ai_force_speak.time;
             const timeSinceSpeak = Date.now() - config.ai_force_speak.time;
             if (timeSinceSpeak < 5000) {
               setForceSpeakData(config.ai_force_speak);
             }
          }
        } catch (e) { }
        }
      }
    };
    fetchConfig();

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const channel = supabase.channel('event_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, (payload) => {
        if (payload.new) {
          if (payload.new.language) setLanguage(payload.new.language);
          
          let voiceConfig = payload.new.voice_settings || {};

          if (payload.new.personality) {
            try {
              const config = JSON.parse(payload.new.personality);
              personalityRef.current = config;
              
              if (config.sponsors) setSponsors(config.sponsors);
              if (config.voice_commands) setVoiceCommands(config.voice_commands);
              
              if (config.slider_mode_active !== undefined && config.slider_mode_active !== isSliderModeRef.current) {
                isSliderModeRef.current = config.slider_mode_active;
                setIsSliderMode(config.slider_mode_active);
              }

              if (Object.keys(voiceConfig).length === 0) {
                voiceConfig = config; // fallback to personality
              }
              
              if (voiceConfig.speed) setRate(voiceConfig.speed);
              if (voiceConfig.pitch) setPitch(voiceConfig.pitch);
              if (voiceConfig.tts_provider === 'native' && voiceConfig.voice_id) {
                 setVoiceURI(voiceConfig.voice_id);
              }
              
              // Resolução do Slide Atual
              if (config.slide_decks && config.active_speaker_id) {
                const speakerSlides = config.slide_decks[config.active_speaker_id] || [];
                const idx = config.current_slide_index || 0;
                if (speakerSlides[idx]) setSlideUrl(speakerSlides[idx]);
                setSlideIndex(idx);
              } else if (config.current_slide !== undefined) {
                setSlideUrl(config.current_slide);
                setSlideIndex(config.current_slide_index || 0);
              }
              
              // Verifica se há um novo alerta do Teleprompter
              if (config.teleprompter_alert && config.teleprompter_alert_time && config.teleprompter_alert_time !== lastAlertTime.current) {
                 lastAlertTime.current = config.teleprompter_alert_time;
                 setAlertMessage(config.teleprompter_alert);
                 // Oculta o alerta após 15 segundos
                 setTimeout(() => setAlertMessage(null), 15000);
              }

              // Verifica comando forçado de fala
              if (config.ai_force_speak && config.ai_force_speak.time && config.ai_force_speak.time !== lastSpeakTime.current) {
                 lastSpeakTime.current = config.ai_force_speak.time;
                 setForceSpeakData(config.ai_force_speak);
              }
            } catch(e) {}
          }
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Teleprompter Typing Effect
  useEffect(() => {
    if (aiState === "speaking") {
      const words = currentText.split(" ");
      let currentIndex = 0;
      setDisplayedText("");
      
      // Média de fala: ~150 palavras por minuto (400ms por palavra), ajustado pela velocidade (rate)
      const delayPerWord = 400 / rate; 
      
      const interval = setInterval(() => {
        if (currentIndex < words.length) {
          setDisplayedText(prev => prev + (prev ? " " : "") + words[currentIndex]);
          currentIndex++;
          
          // Auto-scroll para baixo
          const container = document.getElementById("teleprompter-container");
          if (container) container.scrollTop = container.scrollHeight;
        } else {
          clearInterval(interval);
        }
      }, delayPerWord);
      
      return () => clearInterval(interval);
    } else {
      setDisplayedText(currentText);
    }
  }, [currentText, aiState, rate]);

  // Carrega as vozes disponíveis
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

  // Inicializa o Reconhecimento de Voz (Web Speech API)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true; // Mostra o texto em tempo real!
        recognitionRef.current.lang = language;

        recognitionRef.current.onstart = () => {
          isContinuousRef.current = true;
          setAiState("listening");
          setCurrentText(isSliderModeRef.current ? "📺 Apresentação Ativa: Fale o seu comando." : "DIGITALENT em escuta contínua. Fale a sua pergunta e aguarde 1.5 segundos...");
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

          // Verifica Comandos de Slide
          const conf = personalityRef.current || {};
          const vNext = conf.voice_commands?.next?.toLowerCase() || 'próxima página';
          const vPrev = conf.voice_commands?.prev?.toLowerCase() || 'retorna';
          let newIndex = conf.current_slide_index || 0;
          let changed = false;

            const matchCommand = (spoken: string, expected: string, fallbacks: string[]) => {
               if (fallbacks.some(f => spoken.includes(f))) return true;
               if (!expected) return false;
               if (spoken.includes(expected)) return true;
               const mainWord = expected.split(' ')[0];
               if (mainWord.length > 3 && spoken.includes(mainWord)) return true;
               return false;
            };

            // Triggers do Modo Slider
            if (!isSliderModeRef.current && matchCommand(transcript, "", ['iniciar slider', 'inicia slider', 'iniciar o slider', 'inicia o slider', 'iniciar slide', 'inicia slide', 'iniciar apresentação', 'iniciar a apresentação', 'começar apresentação', 'começar a apresentação'])) {
               isSliderModeRef.current = true;
               setIsSliderMode(true);
               if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
               setCurrentText("📺 Modo Apresentação Iniciado! Fale 'próxima' para avançar.");
               try { recognitionRef.current.abort(); } catch(e) {}
               
               // Sync with DB so Admin Panel sees it
               conf.slider_mode_active = true;
               const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
               supabase.from('events').update({ personality: JSON.stringify(conf) }).eq('id', eventId).then(() => {});
               return;
            }

            if (isSliderModeRef.current && matchCommand(transcript, "", ['terminar slider', 'termina slider', 'terminar o slider', 'termina o slider', 'terminar slide', 'termina slide', 'terminar apresentação', 'termina apresentação', 'terminar a apresentação'])) {
               isSliderModeRef.current = false;
               setIsSliderMode(false);
               if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
               setCurrentText("📺 Modo Apresentação Terminado. Comandos de slides bloqueados.");
               try { recognitionRef.current.abort(); } catch(e) {}
               
               // Sync with DB so Admin Panel sees it
               conf.slider_mode_active = false;
               const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
               supabase.from('events').update({ personality: JSON.stringify(conf) }).eq('id', eventId).then(() => {});
               return;
            }

            // Comandos de Slide (Apenas funcionam se o Modo Slider estiver ativo)
            if (isSliderModeRef.current) {
               let newIndex = conf.current_slide_index || 0;
               let changed = false;

               // Comando de Página Específica (ex: "retorna página 5" ou "vai para página 12")
               const pageMatch = transcript.match(/(?:página|slide|pagina)\s+(\d+)/i);
               
               if (pageMatch && pageMatch[1]) {
                  newIndex = parseInt(pageMatch[1], 10) - 1; // 0-indexed
                  changed = true;
               } else if (matchCommand(transcript, vNext, ['próxima', 'proxima', 'seguinte', 'avança', 'passar', 'passa'])) {
                  newIndex++;
                  changed = true;
               } else if (matchCommand(transcript, vPrev, ['anterior', 'volta', 'retrocede', 'retorna'])) {
                  newIndex = Math.max(0, newIndex - 1);
                  changed = true;
               }

               if (changed) {
                  if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                  setCurrentText(`📺 Comando de Slide Detetado! Alterando para página ${newIndex + 1}...`);
                  
                  // Atualiza UI instantaneamente para zero delay
                  setSlideIndex(newIndex);
                  if (conf.slide_decks && conf.active_speaker_id) {
                     const speakerSlides = conf.slide_decks[conf.active_speaker_id] || [];
                     if (speakerSlides[newIndex]) setSlideUrl(speakerSlides[newIndex]);
                  }

                  // Limpa o reconhecimento para não repetir o trigger com a mesma frase
                  try { recognitionRef.current.abort(); } catch(e) {}
                  
                  // Atualiza DB silenciosamente
                  conf.current_slide_index = newIndex;
                  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
                  supabase.from('events').update({ personality: JSON.stringify(conf) }).eq('id', eventId).then(() => {});
                  return; // Skip normal processing
               }
            }

          // Verifica se tem o Wake Word imediatamente para atalho (opcional)
          if (transcript.includes("digitalent") || transcript.includes("talent") || transcript.includes("olá digitalent") || transcript.includes("agente")) {
             if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
             setCurrentText(`✨ Processando comando...`);
             processAICommand(transcript);
             return;
          }

          // Configura o novo timer de 1.5 segundos de silêncio
          silenceTimerRef.current = setTimeout(() => {
            const finalSpeech = lastTranscriptRef.current;
            if (finalSpeech.length > 3 && isContinuousRef.current && aiState !== "processing") {
               setCurrentText(`✨ Silêncio detectado. Processando: "${finalSpeech}"`);
               processAICommand(finalSpeech);
            }
          }, 1500);
        };

        recognitionRef.current.onerror = (event: any) => {
          if (event.error === 'aborted' || event.error === 'no-speech') {
            // Ignorar erros normais de aborto de slide ou silêncio para não matar a escuta contínua.
            return;
          }
          console.error("Speech recognition error", event.error);
          isContinuousRef.current = false;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          setAiState("idle");
          setCurrentText(`Erro do Navegador (${event.error}): Verifique o microfone e se usa HTTPS.`);
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

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [eventId, language]);

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
      
      utterance.lang = language;
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

  const forceAISpeak = async (text: string) => {
    try {
      isContinuousRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
      lastTranscriptRef.current = ""; 

      setAiState("speaking");
      setCurrentText(text);

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
        audio.preservesPitch = false;
        
        audio.onended = () => {
          isContinuousRef.current = true;
          try { recognitionRef.current?.start(); } catch (e) {}
        };
        
        audio.onerror = () => fallbackToNativeTTS(text);
        audio.play().catch(() => fallbackToNativeTTS(text));
      } else {
        fallbackToNativeTTS(text);
      }
    } catch (e) {
      fallbackToNativeTTS(text);
    }
  };

  useEffect(() => {
    if (forceSpeakData) {
       forceAISpeak(forceSpeakData.text);
    }
  }, [forceSpeakData]);

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
        
        // Se a API retornou áudio (ElevenLabs, Fish Audio, OpenAI), nós o tocamos primeiro
        if (data.audioBase64) {
          const audio = new Audio("data:audio/mp3;base64," + data.audioBase64);
          audio.volume = volume;
          audio.playbackRate = rate; // Aplica a velocidade da UI (0.5 a 2.0)
          audio.preservesPitch = false; // Emulando 'pitch' da voz baseada em tempo
          
          audio.onended = () => {
            isContinuousRef.current = true;
            try { recognitionRef.current?.start(); } catch (e) {}
          };

          audio.onerror = (e) => {
            console.error("Erro no áudio remoto:", e);
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

  // Word Cloud Initialization
  useEffect(() => {
    if (containerRef.current && authorsData.length > 0) {
       // Atraso pequeno para garantir que o container já tem width/height reais aplicados pelo flex
       setTimeout(() => {
         if (!containerRef.current) return;
         WordCloud(containerRef.current, {
           list: authorsData.map(a => [a.text, a.value]),
           fontFamily: 'Impact, sans-serif',
           weight: 'bold',
           color: (word: string, weight: number, fontSize: number, distance: number, theta: number) => {
             // Seta uma variavel CSS para o angulo no span
             // A lib WordCloud.js não suporta injetar variáveis CSS diretamente pelo color, mas podemos fazê-lo num timeout
             return colors[Math.floor(Math.random() * colors.length)];
           },
           rotateRatio: 0.5,
           rotationSteps: 2,
           backgroundColor: 'transparent',
           shape: 'square',
           gridSize: 8,
           drawOutOfBound: false,
           shrinkToFit: true,
           hover: (item: any) => {
             if (item && item[0]) setHighlightedName(item[0]);
             else setHighlightedName(null);
           }
         });
         
         // Inject the custom rotation into the spans after they are rendered
         setTimeout(() => {
           if (containerRef.current) {
             const spans = containerRef.current.querySelectorAll('span');
             spans.forEach(span => {
               const transform = span.style.transform;
               const match = transform.match(/rotate\(([^)]+)\)/);
               if (match) {
                 span.style.setProperty('--rot', match[1]);
               } else {
                 span.style.setProperty('--rot', '0deg');
               }
             });
           }
         }, 500);

       }, 200);
    }
  }, [authorsData]);

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

  // Highlight Name Logic
  useEffect(() => {
    if (aiState === "speaking" || aiState === "listening") {
      const lowerText = currentText.toLowerCase();
      // Try to find if any author is mentioned in the current text
      const found = authorsData.find(a => lowerText.includes(a.text.toLowerCase()));
      if (found) setHighlightedName(found.text);
      else setHighlightedName(null);
    } else {
      setHighlightedName(null);
    }
  }, [currentText, aiState, authorsData]);


  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col p-4 md:p-6 overflow-hidden selection:bg-purple-500/30 font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatJump {
          0% { transform: scale(1) translateY(0) rotate(var(--rot)); }
          50% { transform: scale(1.08) translateY(-3px) rotate(var(--rot)); }
          100% { transform: scale(1) translateY(0) rotate(var(--rot)); }
        }
        .animated-wordcloud span {
          animation: floatJump 4s ease-in-out infinite;
          transform-origin: center !important;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .animated-wordcloud span:nth-child(even) {
          animation-delay: 1.5s;
          animation-duration: 5s;
        }
        .animated-wordcloud span:nth-child(3n) {
          animation-delay: 0.5s;
          animation-duration: 3.5s;
        }
        .animated-wordcloud span:hover {
          transform: scale(1.2) rotate(var(--rot)) !important;
          z-index: 100 !important;
          opacity: 1 !important;
        }
      `}} />
      
      {/* BOTÃO INVISÍVEL GIGANTE PARA TOUCH NO CELULAR */}
      <button 
        onClick={toggleListening}
        onTouchStart={(e) => { 
          if (isSettingsOpen) return;
          e.preventDefault(); 
          toggleListening(); 
        }}
        className={`fixed inset-0 w-full h-full z-40 cursor-pointer bg-transparent outline-none ${isSettingsOpen ? 'pointer-events-none' : ''}`}
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        aria-label="Pressione em qualquer lugar para falar"
      />

      {/* HEADER BAR */}
      <header className="flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity relative z-50 shrink-0 h-16 border-b border-neutral-800/50 pb-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-bold text-sm">AI</span>
          </div>
          <div className="pointer-events-none flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white/90">DIGITALENT</h1>
            <div className="w-px h-6 bg-neutral-700"></div>
            <p className="text-neutral-400 font-medium text-sm">Tech Summit 2026</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 border px-4 py-1.5 rounded-full pointer-events-none transition-colors duration-500 ${aiState === "speaking" || aiState === "processing" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${aiState === "speaking" || aiState === "processing" ? "bg-emerald-500" : "bg-red-500"}`}></div>
            <span className="font-bold uppercase tracking-widest text-xs hidden sm:inline-block">No Ar</span>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 text-neutral-400 hover:text-white pointer-events-auto relative z-50"
            title="Configurações de Voz"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (SPLIT SCREEN: 65% Esquerda, 35% Direita) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative z-10 pointer-events-none">
        
        {/* COLUNA ESQUERDA - SLIDE & APOIADORES */}
        <div className="flex-[2] flex flex-col gap-4">
          
          {/* SLIDE */}
          <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] rounded-2xl overflow-hidden relative p-0 pointer-events-auto">
            <div className="w-full aspect-video relative flex items-center justify-center rounded-xl overflow-hidden">
              <div className="absolute top-4 left-4 bg-black/60 text-white/80 text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm z-50">
                pagina {(slideIndex + 1).toString().padStart(2, '0')}
              </div>
              {slideUrl ? (
                slideUrl.toLowerCase().includes('.pdf') ? (
                   <iframe scrolling="no" key={slideIndex} src={`${slideUrl}#page=${slideIndex + 1}&toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=Fit`} className="absolute inset-0 w-full h-full border-none overflow-hidden" title="PDF Slide" />
                ) : slideUrl.toLowerCase().includes('.ppt') || slideUrl.toLowerCase().includes('.pptx') ? (
                   <iframe scrolling="no" src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(slideUrl)}`} className="absolute inset-0 w-full h-full border-none overflow-hidden" title="PowerPoint Slide" />
                ) : (
                   <img src={slideUrl} alt="Slide Atual" className="absolute inset-0 w-full h-full object-contain" />
                )
              ) : (
                <div className="text-neutral-600 font-medium flex flex-col items-center justify-center gap-3 w-full h-full border border-neutral-800 rounded-2xl">
                   <div className="w-16 h-16 border-2 border-dashed border-neutral-700 rounded-xl flex items-center justify-center">
                     <span className="text-neutral-700 font-bold text-sm">SLIDE</span>
                   </div>
                   <span className="text-sm">Aguardando Slide...</span>
                </div>
              )}
            </div>
          </div>

          {/* APOIADORES */}
          <div className="h-28 shrink-0 bg-[#0a0a0a] border border-neutral-800 rounded-2xl overflow-hidden flex items-center justify-center pointer-events-auto shadow-inner relative">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes colorPulse {
                0%, 100% { filter: grayscale(100%); transform: scale(1); opacity: 0.5; }
                50% { filter: grayscale(0%); transform: scale(1.2); opacity: 1; }
              }
              .animate-sponsor {
                animation: colorPulse 6s infinite ease-in-out;
              }
            `}} />
            {sponsors.length > 0 ? (
              <div className="flex items-center gap-10 px-6 animate-marquee whitespace-nowrap min-w-full justify-around">
                {sponsors.map((url, i) => (
                  <img key={i} src={url} alt={`Sponsor ${i}`} className="h-10 object-contain animate-sponsor" style={{ animationDelay: \`${i * 1.2}s\` }} />
                ))}
                {sponsors.map((url, i) => (
                  <img key={`clone-${i}`} src={url} alt={`Sponsor Clone ${i}`} className="h-10 object-contain animate-sponsor" style={{ animationDelay: \`${i * 1.2}s\` }} />
                ))}
              </div>
            ) : (
              <h3 className="text-white/60 text-xl lg:text-3xl font-bold tracking-widest uppercase">
                AQUI VAI PASSAR O CARROCEL DOS APOIADORES
              </h3>
            )}
          </div>
        </div>

        {/* ALERTA DE TELEPROMPTER OVERLAY */}
        {alertMessage && (
          <div className="absolute inset-0 z-[100] bg-red-600/95 backdrop-blur-md flex flex-col items-center justify-center p-12 rounded-2xl border-4 border-red-500 animate-pulse pointer-events-auto shadow-[0_0_100px_rgba(220,38,38,0.5)]">
             <AlertCircle className="w-24 h-24 text-white mb-6" />
             <h2 className="text-white text-6xl md:text-7xl font-black text-center uppercase tracking-tight leading-tight">
               {alertMessage}
             </h2>
             <button 
               onClick={() => setAlertMessage(null)}
               className="mt-12 bg-black/20 hover:bg-black/40 text-white px-6 py-3 rounded-xl font-bold transition-colors border border-white/20"
             >
               DISPENSAR ALERTA
             </button>
          </div>
        )}

        {/* COLUNA DIREITA - AI & WORDCLOUD */}
        <div className="flex-1 flex flex-col gap-4 min-w-[320px]">
          
          {/* TOPO: NUVEM DE NOMES (WORD CLOUD) */}
          <div className="flex-[2] relative flex items-center justify-center bg-[#0a0a0a] border border-neutral-800 rounded-2xl animated-wordcloud overflow-hidden p-2" style={{ minHeight: '400px' }}>
                 <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}></div>
                 
                 {highlightedName && (
                   <div className="absolute inset-0 m-auto flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl z-50 pointer-events-none">
                     <span className="text-white text-6xl font-black italic drop-shadow-2xl scale-110 transition-transform">
                       {highlightedName}
                     </span>
                   </div>
                 )}
               </div>

          {/* MEIO: LEGENDA / TELEPROMPTER COMPACTO */}
          <div className="h-28 shrink-0 bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 flex items-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
             <p className={`text-lg md:text-xl font-medium leading-snug w-full truncate whitespace-normal line-clamp-3 ${
                aiState === "listening" ? "text-neutral-500" : 
                aiState === "processing" ? "text-indigo-400 animate-pulse" :
                "text-white"
             }`}>
               {displayedText}
             </p>
          </div>

          {/* FUNDO: VISUALIZADOR DA IA */}
          <div className="h-24 shrink-0 bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 flex items-center justify-between pointer-events-auto cursor-pointer group" onClick={(e) => { e.stopPropagation(); toggleListening(); }}>
             <div className="flex flex-col justify-center">
                <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Status da IA</span>
                <span className={`text-sm font-semibold transition-colors ${
                  isSliderMode ? "text-green-400" :
                  aiState === "speaking" ? "text-purple-400" : 
                  aiState === "listening" ? "text-red-500" :
                  aiState === "processing" ? "text-indigo-400" :
                  "text-neutral-600"
                }`}>
                  {isSliderMode ? "📺 Apresentação Ativa" :
                   aiState === "speaking" ? "A DIGITALENT está a falar" : 
                   aiState === "listening" ? "A DIGITALENT está a ouvir" : 
                   aiState === "processing" ? "A pensar..." : 
                   "Modo de Espera"}
                </span>
             </div>
             
             {/* Barras de Áudio */}
             <div className="flex items-end gap-1 h-10 w-24">
                {aiState === "listening" ? (
                  <div className="w-full flex items-center justify-end pr-2">
                     <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                  </div>
                ) : aiState === "speaking" ? (
                  bars.slice(0, 7).map((height, i) => (
                    <div 
                      key={i} 
                      className="w-2 bg-gradient-to-t from-purple-600 to-indigo-400 rounded-t-sm transition-all duration-150"
                      style={{ height: `${height}%` }}
                    ></div>
                  ))
                ) : (
                  <div className="w-full h-full flex items-center justify-end text-neutral-700 group-hover:text-neutral-500 transition-colors">
                     <Mic className="w-6 h-6" />
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>

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
