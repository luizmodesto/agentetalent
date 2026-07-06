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

export function VoiceSettingsModule({ eventId, supabase }: { eventId: string | null, supabase: any }) {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [ttsProvider, setTtsProvider] = useState<"elevenlabs" | "fishaudio" | "native" | "openai">("native");
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [voiceId, setVoiceId] = useState(""); // ElevenLabs Voice ID ou Native Voice Name
  const [fishApiKey, setFishApiKey] = useState("");
  const [fishReferenceId, setFishReferenceId] = useState("");
  const [language, setLanguage] = useState("pt-PT");
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [gender, setGender] = useState("male");
  const [openaiVoice, setOpenaiVoice] = useState("onyx");
  const [openaiTone, setOpenaiTone] = useState("Corporativo Premium");
  const [openaiRhythm, setOpenaiRhythm] = useState("Cadenciado com Pausas (Formal)");
  const [openaiStorytelling, setOpenaiStorytelling] = useState(5);
  const [localAudioFiles, setLocalAudioFiles] = useState<string[]>([]);
  const [selectedCloneFile, setSelectedCloneFile] = useState("");
  const [isCloning, setIsCloning] = useState(false);

  useEffect(() => {
    fetch('/api/ai/audio-files').then(res => res.json()).then(data => {
      if (data.files) setLocalAudioFiles(data.files);
    }).catch(() => {});
  }, []);

  // Carrega os eventos para o dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('id, title').order('created_at', { ascending: false });
      if (data) {
        setEvents(data);
        if (!selectedEventId && data.length > 0) setSelectedEventId(data[0].id);
      }
    };
    fetchEvents();
  }, [supabase]);

  // Carrega as definições quando o evento muda
  useEffect(() => {
    if (!selectedEventId) return;
    const fetchConfig = async () => {
      const { data } = await supabase.from('events').select('*').eq('id', selectedEventId).single();
      if (data) {
        setLanguage(data.language || "pt-PT");
        // Prioriza a nova coluna voice_settings, caso não exista usa o legacy personality
        let config: any = {};
        if (data.voice_settings && Object.keys(data.voice_settings).length > 0) {
           config = data.voice_settings;
        } else if (data.personality) {
           try { config = JSON.parse(data.personality); } catch(e) {}
        }
        
        if (config.tts_provider) setTtsProvider(config.tts_provider);
        if (config.elevenlabs_api_key) setElevenLabsApiKey(config.elevenlabs_api_key);
        if (config.voice_id) setVoiceId(config.voice_id);
        if (config.fish_api_key) setFishApiKey(config.fish_api_key);
        if (config.fish_reference_id) setFishReferenceId(config.fish_reference_id);
        if (config.openai_voice) setOpenaiVoice(config.openai_voice);
        if (config.openai_tone) setOpenaiTone(config.openai_tone);
        if (config.openai_rhythm) setOpenaiRhythm(config.openai_rhythm);
        if (config.openai_storytelling) setOpenaiStorytelling(config.openai_storytelling);
        if (config.speed) setSpeed(config.speed);
        if (config.pitch) setPitch(config.pitch);
        if (config.gender) setGender(config.gender);
      }
    };
    fetchConfig();
  }, [selectedEventId, supabase]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    
    // --- 1. CHECAGEM (CHECK) DO PROVEDOR ATIVO ANTES DE SALVAR ---
    try {
        if (ttsProvider === "openai" && language === "pt-PT") {
           alert("Regra de Sistema: A OpenAI (TTS-1) não suporta Português de Portugal nativo (gera sotaque do Brasil). Como exigiu 'Português de Portugal', não é possível usar a OpenAI. Mude o Provedor Principal para 'Nativo (Browser)' ou 'ElevenLabs' para garantir o sotaque exigido.");
           setIsLoading(false);
           return;
        }

        const apiKey = (ttsProvider === "fishaudio" ? fishApiKey : (ttsProvider === "openai" ? "dummy" : elevenLabsApiKey))?.trim() || "";
        const vId = (ttsProvider === "fishaudio" ? fishReferenceId : (ttsProvider === "openai" ? openaiVoice : voiceId))?.trim() || "";
        
        if (!apiKey && ttsProvider !== "openai") {
          alert(`Por favor insira a API Key para o provedor ${ttsProvider}. A configuração NÃO foi salva.`);
          setIsLoading(false);
          return;
        }

        const testText = language === "en-US" ? "System check successful." : "Checagem de sistema concluída.";

        const testResponse = await fetch('/api/ai/test-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: ttsProvider,
            apiKey: apiKey,
            voiceId: vId,
            text: testText,
            speed: speed,
            pitch: pitch,
            tone: openaiTone,
            rhythm: openaiRhythm,
            storytelling: openaiStorytelling,
            language: language
          })
        });

        if (!testResponse.ok) {
           const data = await testResponse.json().catch(() => ({ error: "Erro desconhecido" }));
           alert("ERRO NA CHECAGEM ❌\nA API de voz rejeitou a configuração. Verifique as credenciais ou o ID da voz.\nErro: " + (data.error || "Desconhecido") + "\n\nA configuração NÃO foi salva.");
           setIsLoading(false);
           return;
        }
    } catch(err) {
        alert("Erro na conexão durante a checagem. A configuração não foi salva.");
        setIsLoading(false);
        return;
    }
    // -------------------------------------------------------------
    
    // --- 2. SE PASSAR NO TESTE, SALVA NO BANCO DE DADOS ---
    const { data: currentEvent } = await supabase.from('events').select('*').eq('id', selectedEventId).single();
    const currentVoiceSettings = currentEvent?.voice_settings || {};

    const newVoiceSettings = {
      ...currentVoiceSettings,
      tts_provider: ttsProvider,
      elevenlabs_api_key: elevenLabsApiKey,
      voice_id: voiceId,
      fish_api_key: fishApiKey,
      fish_reference_id: fishReferenceId,
      openai_voice: openaiVoice,
      openai_tone: openaiTone,
      openai_rhythm: openaiRhythm,
      openai_storytelling: openaiStorytelling,
      speed: speed,
      pitch: pitch,
      gender: gender
    };

    const { error } = await supabase.from('events').update({
      language: language,
      voice_settings: newVoiceSettings
    }).eq('id', selectedEventId);

    setIsLoading(false);
    if (!error) {
      alert("✅ Configurações validadas e gravadas com sucesso para este evento!");
    } else {
      alert("Erro ao gravar no banco: " + error.message);
    }
  };

  const handleCloneVoice = async () => {
    if (!selectedCloneFile) {
      alert("Selecione um ficheiro de áudio primeiro.");
      return;
    }
    const apiKey = ttsProvider === "elevenlabs" ? elevenLabsApiKey : fishApiKey;
    if (!apiKey) {
      alert(`Insira a API Key para ${ttsProvider} antes de clonar.`);
      return;
    }

    setIsCloning(true);
    try {
      const response = await fetch('/api/ai/clone-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: ttsProvider,
          apiKey: apiKey,
          fileName: selectedCloneFile,
          voiceName: `Cloned - ${selectedCloneFile}`
        })
      });
      const data = await response.json();
      if (data.success && data.voice_id) {
        if (ttsProvider === "elevenlabs") setVoiceId(data.voice_id);
        if (ttsProvider === "fishaudio") setFishReferenceId(data.voice_id);
        
        // Auto-gravar na base de dados para garantir que vai para o Painel Live
        const { data: currentEvent } = await supabase.from('events').select('personality').eq('id', selectedEventId).single();
        let currentConfig = {};
        if (currentEvent?.personality) {
          try { currentConfig = JSON.parse(currentEvent.personality); } catch(e) {}
        }
        const newConfig = {
          ...currentConfig,
          tts_provider: ttsProvider,
          voice_id: ttsProvider === "elevenlabs" ? data.voice_id : voiceId,
          fish_reference_id: ttsProvider === "fishaudio" ? data.voice_id : fishReferenceId,
          elevenlabs_api_key: elevenLabsApiKey,
          fish_api_key: fishApiKey
        };
        await supabase.from('events').update({
          personality: JSON.stringify(newConfig)
        }).eq('id', selectedEventId);

        alert("Voz clonada com sucesso! O ID foi preenchido e as configurações foram gravadas automaticamente. Já pode ir ao Painel do Palestrante testar!");
      } else {
        alert(data.error || "Erro ao clonar voz.");
      }
    } catch (e) {
      alert("Erro ao conectar com a API de clonagem.");
    }
    setIsCloning(false);
  };

  const handleTestVoice = async () => {
    setIsTesting(true);
    let testText = "";
    
    // As sentenças foram otimizadas com fonética indutiva rígida para garantir o sotaque em modelos como TTS-1
    if (language === "pt-PT") {
      testText = "Com certeza! O sistema de som está totalmente operacional no ecrã. Estou a postos para iniciar a mediação dos oradores e das equipas no palco do Digitalent’26.";
    } else if (language === "en-US") {
      testText = "Hello! Testing the sound system for Digitalent’26. The stage is ready.";
    } else {
      testText = "Com certeza! O sistema de som está totalmente operacional. Estou pronto para iniciar a mediação dos palestrantes no palco do Digitalent’26.";
    }
    
    // Personalização de tom para o OpenAI (Inglês)
    if (ttsProvider === "openai" && language === "en-US") {
        if (openaiTone === "Energético de Palco") {
          testText = openaiRhythm === "Cadenciado com Pausas (Formal)" 
            ? "Ladies... and gentlemen! Get ready... for an absolutely spectacular demonstration!"
            : "Hello everyone! What fantastic energy! This is the perfect demonstration of your new voice!";
        } else if (openaiTone === "Descontraído/Interativo") {
          testText = "Hey guys, how are we doing today? Ready to hear this incredible voice in action?";
        } else {
          testText = openaiRhythm === "Cadenciado com Pausas (Formal)"
            ? "Welcome everyone... This is the premium voice demonstration... configured for our event."
            : "Hello. This is a demonstration of the corporate voice configured for your event.";
        }
    } else if (ttsProvider === "openai" && language === "pt-BR") {
        if (openaiTone === "Energético de Palco") {
          testText = openaiRhythm === "Cadenciado com Pausas (Formal)" 
            ? "Senhoras... e senhores! Preparem-se... para uma demonstração absolutamente espetacular!"
            : "Olá a todos! Que energia fantástica! Esta é a demonstração perfeita da vossa nova voz!";
        } else if (openaiTone === "Descontraído/Interativo") {
          testText = "Olá pessoal, como estamos hoje? Prontos para ouvir esta voz incrível a funcionar?";
        }
        // Se for corporativo, mantém a string base indutiva definida acima.
    } else if (ttsProvider === "openai" && language === "pt-PT") {
        if (openaiTone === "Energético de Palco") {
          testText = openaiRhythm === "Cadenciado com Pausas (Formal)" 
            ? "Senhoras... e senhores! O ecrã está a postos... Preparem-se para os oradores!"
            : "Olá a todos! Que energia fantástica! Esta é a demonstração perfeita da vossa nova voz no ecrã!";
        } else if (openaiTone === "Descontraído/Interativo") {
          testText = "Olá malta, como estamos hoje? Prontos para ouvir os oradores e as equipas no palco do Digitalent?";
        }
        // Se for corporativo, mantém a string base indutiva do pt-PT para forçar a pronúncia correta.
    }
    
    if (ttsProvider === "fishaudio" || ttsProvider === "elevenlabs" || ttsProvider === "openai") {
      try {
        const apiKey = ttsProvider === "fishaudio" ? fishApiKey : (ttsProvider === "openai" ? "dummy" : elevenLabsApiKey);
        const vId = ttsProvider === "fishaudio" ? fishReferenceId : (ttsProvider === "openai" ? openaiVoice : voiceId);
        
        if (!apiKey && ttsProvider !== "openai") {
          alert(`Por favor insira a API Key para ${ttsProvider}.`);
          setIsTesting(false);
          return;
        }

        const response = await fetch('/api/ai/test-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: ttsProvider,
            apiKey: apiKey,
            voiceId: vId,
            text: testText,
            speed: speed,
            pitch: pitch,
            tone: openaiTone,
            rhythm: openaiRhythm,
            storytelling: openaiStorytelling,
            language: language
          })
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.playbackRate = speed;
          audio.onended = () => setIsTesting(false);
          audio.onerror = () => setIsTesting(false);
          audio.play();
          return;
        } else {
          const data = await response.json().catch(() => ({ error: "Erro desconhecido" }));
          alert(data.error || "Falha ao gerar o áudio.");
        }
      } catch (e) {
        alert("Falha de conexão com o servidor interno.");
      }
    } else {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(testText);
        utterance.lang = language;
        utterance.rate = speed;
        utterance.pitch = pitch;
        utterance.onend = () => setIsTesting(false);
        utterance.onerror = () => setIsTesting(false);
        window.speechSynthesis.speak(utterance);
        return;
      }
    }
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6 md:p-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-500/10 rounded-xl">
            <Mic className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Configuração da Voz da IA</h2>
            <p className="text-sm text-neutral-500">Ajuste o tom e conecte vozes realistas (ElevenLabs) para os seus eventos.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* SELEÇÃO DO EVENTO */}
          <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl">
            <label className="block text-sm font-medium text-neutral-400 mb-2">Evento a Configurar</label>
            <select 
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="" disabled>Selecione um evento...</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 mt-2">Cada evento possui a sua própria identidade vocal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Provedor Principal</label>
              <select value={ttsProvider} onChange={e => setTtsProvider(e.target.value as any)} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500">
                <option value="native">Nativo (Browser Livre)</option>
                <option value="openai">OpenAI (TTS-1)</option>
                <option value="elevenlabs">ElevenLabs</option>
                <option value="fishaudio">Fish Audio</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Idioma / Sotaque</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white">
                <option value="pt-BR">Português do Brasil</option>
                <option value="pt-PT">Português de Portugal</option>
                <option value="en-US">Inglês (Estados Unidos)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Género da Voz</label>
              <select value={gender} onChange={e => {
                const newGender = e.target.value;
                setGender(newGender);
                if (newGender === "female") setOpenaiVoice("shimmer");
                else setOpenaiVoice("onyx");
              }} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white">
                <option value="female">Feminino</option>
                <option value="male">Masculino</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-white border-b border-neutral-800 pb-2">Configurações Avançadas de Fala</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex justify-between items-center text-sm font-medium text-neutral-400 mb-2">
                  <span>Velocidade</span>
                  <span className="text-indigo-400">{speed}x</span>
                </label>
                <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="flex justify-between items-center text-sm font-medium text-neutral-400 mb-2">
                  <span>Tom (Pitch)</span>
                  <span className="text-indigo-400">{pitch}</span>
                </label>
                <input type="range" min="0.5" max="2.0" step="0.1" value={pitch} onChange={e => setPitch(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-neutral-800">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="font-semibold text-white mb-1">Configurações de Provedores de Voz</h3>
                <p className="text-xs text-neutral-500 mb-4">Pode configurar as chaves de todos e trocar entre eles no Provedor Principal acima.</p>
              </div>
            </div>

            {/* OPENAI */}
            <div className={`p-4 rounded-xl border transition-colors duration-300 ${ttsProvider === "openai" ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "bg-neutral-900/30 border-neutral-800"}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h4 className="font-medium text-white flex items-center gap-2">🤖 OpenAI (TTS-1)</h4>
                  {ttsProvider === "openai" ? (
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/30">ATIVO</span>
                  ) : (
                    <button type="button" onClick={() => setTtsProvider("openai")} className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-full transition-colors border border-neutral-700">Ativar</button>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-400">
                  <p>A OpenAI utiliza a chave padrão do sistema. O modelo de ultra-baixa latência <b>tts-1</b> será utilizado. Clonagem desativada para a OpenAI (vozes restritas à plataforma).</p>
                  {language === "pt-PT" && (
                     <p className="mt-2 text-red-400 font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> 
                        Incompatível com Português de Portugal (Sotaque BR). Escolha Nativo ou ElevenLabs.
                     </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Vozes de Palco</label>
                  <select 
                    value={openaiVoice} 
                    onChange={e => {
                      const v = e.target.value;
                      setOpenaiVoice(v);
                      if (["shimmer", "alloy", "nova"].includes(v)) setGender("female");
                      else setGender("male");
                    }}
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="onyx">Onyx (Masculino Profundo / Recomendado)</option>
                    <option value="echo">Echo (Masculino Suave)</option>
                    <option value="fable">Fable (Masculino Jovem)</option>
                    <option value="shimmer">Shimmer (Feminino Envolvente / Recomendado)</option>
                    <option value="alloy">Alloy (Feminino Neutro)</option>
                    <option value="nova">Nova (Feminino Jovem)</option>
                  </select>
                </div>
                

                {ttsProvider === "openai" && (
                  <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-800 mt-4">
                    <h5 className="text-sm font-medium text-white mb-3">Ajuste de Características da Persona (Prompt Vocálico)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Tom do Evento</label>
                        <select 
                          value={openaiTone} 
                          onChange={e => setOpenaiTone(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Corporativo Premium">Corporativo Premium</option>
                          <option value="Energético de Palco">Energético de Palco</option>
                          <option value="Descontraído/Interativo">Descontraído/Interativo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Ritmo de Fala</label>
                        <select 
                          value={openaiRhythm} 
                          onChange={e => setOpenaiRhythm(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Cadenciado com Pausas (Formal)">Cadenciado com Pausas (Formal)</option>
                          <option value="Fluido e Rápido (Dinâmico)">Fluido e Rápido (Dinâmico)</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs text-neutral-400">Nível de Storytelling</label>
                        <span className="text-xs font-bold text-indigo-400">{openaiStorytelling}/10</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        step="1" 
                        value={openaiStorytelling} 
                        onChange={e => setOpenaiStorytelling(parseInt(e.target.value))} 
                        className="w-full accent-indigo-500" 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FISH AUDIO */}
            <div className={`p-4 rounded-xl border transition-colors duration-300 ${ttsProvider === "fishaudio" ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "bg-neutral-900/30 border-neutral-800"}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h4 className="font-medium text-white flex items-center gap-2">🐠 Fish Audio</h4>
                  {ttsProvider === "fishaudio" ? (
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/30">ATIVO</span>
                  ) : (
                    <button type="button" onClick={() => setTtsProvider("fishaudio")} className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-full transition-colors border border-neutral-700">Ativar</button>
                  )}
                </div>
                <div className="group relative">
                  <button type="button" className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Como configurar?
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[#111] border border-neutral-800 p-4 rounded-xl shadow-2xl z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <p className="text-xs text-neutral-300 mb-2 font-semibold">Passo a passo Fish Audio:</p>
                    <ol className="text-xs text-neutral-400 space-y-1 list-decimal pl-4">
                      <li>Crie conta em <a href="https://fish.audio" target="_blank" className="text-indigo-400 hover:underline">fish.audio</a></li>
                      <li>Vá ao seu Dashboard e clique em <b>API Keys</b>.</li>
                      <li>Gere uma nova chave e cole-a no campo abaixo.</li>
                      <li><i>Opcional:</i> Para usar uma voz sua, vá a <b>My Voices</b> e copie o ID da voz (Reference ID).</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Fish Audio API Key</label>
                  <input 
                    type="password" 
                    value={fishApiKey} 
                    onChange={e => setFishApiKey(e.target.value)} 
                    placeholder="Cole a sua chave aqui..."
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Reference ID (Opcional - Voz Clonada)</label>
                  <input 
                    type="text" 
                    value={fishReferenceId} 
                    onChange={e => setFishReferenceId(e.target.value)} 
                    placeholder="ex: 1234abcd..."
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" 
                  />
                </div>

                {/* Clone Block Fish Audio */}
                <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-800 mt-4">
                  <h5 className="text-sm font-medium text-white mb-3">Clonagem Dinâmica de Voz</h5>
                  <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-xs text-neutral-400 mb-1">Selecionar Ficheiro Local (Pasta /audio)</label>
                      <select 
                        value={selectedCloneFile} 
                        onChange={e => setSelectedCloneFile(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Nenhum...</option>
                        {localAudioFiles.map(file => (
                          <option key={file} value={file}>{file}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      type="button"
                      disabled={isCloning || !selectedCloneFile || ttsProvider !== "fishaudio"}
                      onClick={handleCloneVoice}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      {isCloning ? "A Clonar..." : "Clonar Voz"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ELEVEN LABS */}
            <div className={`p-4 rounded-xl border transition-colors duration-300 ${ttsProvider === "elevenlabs" ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "bg-neutral-900/30 border-neutral-800"}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h4 className="font-medium text-white flex items-center gap-2">🎙️ ElevenLabs</h4>
                  {ttsProvider === "elevenlabs" ? (
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/30">ATIVO</span>
                  ) : (
                    <button type="button" onClick={() => setTtsProvider("elevenlabs")} className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-full transition-colors border border-neutral-700">Ativar</button>
                  )}
                </div>
                <div className="group relative">
                  <button type="button" className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Como configurar?
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[#111] border border-neutral-800 p-4 rounded-xl shadow-2xl z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <p className="text-xs text-neutral-300 mb-2 font-semibold">Passo a passo ElevenLabs:</p>
                    <ol className="text-xs text-neutral-400 space-y-1 list-decimal pl-4">
                      <li>Crie conta em <a href="https://elevenlabs.io" target="_blank" className="text-indigo-400 hover:underline">elevenlabs.io</a></li>
                      <li>Clique no seu Perfil (canto inferior esquerdo) e vá a <b>Profile & API key</b>.</li>
                      <li>Copie a chave de API e cole-a no campo abaixo.</li>
                      <li>Vá à secção <b>Voices</b>, escolha a voz desejada, clique nos 3 pontos e selecione <b>Copy Voice ID</b>.</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">ElevenLabs API Key</label>
                  <input 
                    type="password" 
                    value={elevenLabsApiKey} 
                    onChange={e => setElevenLabsApiKey(e.target.value)} 
                    placeholder="sk_..."
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">ElevenLabs Voice ID</label>
                  <input 
                    type="text" 
                    value={voiceId} 
                    onChange={e => setVoiceId(e.target.value)} 
                    placeholder="ex: pNInz6obpgDQGcFmaJcg"
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" 
                  />
                </div>

                {/* Clone Block ElevenLabs */}
                <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-800 mt-4">
                  <h5 className="text-sm font-medium text-white mb-3">Clonagem Dinâmica de Voz</h5>
                  <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-xs text-neutral-400 mb-1">Selecionar Ficheiro Local (Pasta /audio)</label>
                      <select 
                        value={selectedCloneFile} 
                        onChange={e => setSelectedCloneFile(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Nenhum...</option>
                        {localAudioFiles.map(file => (
                          <option key={file} value={file}>{file}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      type="button"
                      disabled={isCloning || !selectedCloneFile || ttsProvider !== "elevenlabs"}
                      onClick={handleCloneVoice}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      {isCloning ? "A Clonar..." : "Clonar Voz"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button 
              type="button" 
              onClick={handleTestVoice}
              disabled={isTesting}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-neutral-900/20"
            >
              {isTesting ? "A Tocar..." : "Testar Voz"}
            </button>
              <button 
                type="submit" 
                disabled={!selectedEventId || isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
              >
                {isLoading ? "A Checar e Gravar..." : "Validar e Gravar Configuração"}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- MODULE C: EVENT SETTINGS (LEGACY) ---