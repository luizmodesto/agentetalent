"use client";

import { useEffect, useState, use, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

type Question = {
  id: string;
  author_name: string;
  content: string;
  status: string;
  ai_score: number | null;
  context: string | null;
  suggested_answer: string | null;
  transition: string | null;
  created_at: string;
};

type EventFlow = {
  next_question: string;
  queue: string[];
  event_state: string;
  engagement_tip: string;
};

export default function LiveControlPanel({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  
  const [eventData, setEventData] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [speakerData, setSpeakerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<string | null>(null);
  const [speed, setSpeed] = useState<number>(0.95);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});

  const [eventFlow, setEventFlow] = useState<EventFlow | null>(null);
  const [isFlowLoading, setIsFlowLoading] = useState(false);

  // JARVIS State
  const [isListening, setIsListening] = useState(false);
  const [jarvisProcessing, setJarvisProcessing] = useState(false);
  const [jarvisTranscript, setJarvisTranscript] = useState("");
  const [jarvisResponse, setJarvisResponse] = useState("");
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
        };

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setJarvisTranscript(transcript);
          processJarvisCommand(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, [eventId]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setJarvisTranscript("");
      setJarvisResponse("");
      recognitionRef.current?.start();
    }
  };

  const processJarvisCommand = async (transcript: string) => {
    try {
      setJarvisProcessing(true);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, speakerId: speakerData?.id, command: transcript })
      });
      const data = await res.json();
      if (data.reply) {
        setJarvisResponse(data.reply);
        // Opcional: já falar automaticamente a resposta
        // playVoice('jarvis_global', data.reply);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setJarvisProcessing(false);
    }
  };

  const playVoice = async (id: string, defaultText: string) => {
    try {
      setIsLoadingAudio(id);
      const textToSpeak = editedTexts[id] || defaultText;
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak, voice_id: eventData?.voice_id || 'onyx', speed })
      });
      
      if (!response.ok) throw new Error("Erro ao gerar áudio");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.onplay = () => {
        setPlayingId(id);
        setIsLoadingAudio(null);
      };
      
      audio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };
      
      audio.play();
    } catch (err) {
      console.error(err);
      setIsLoadingAudio(null);
      alert("Falha ao tocar o áudio da IA.");
    }
  };

  const generateEventFlow = async () => {
    if (!activeSession) return;
    setIsFlowLoading(true);
    try {
      const res = await fetch('/api/event-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.id })
      });
      if (!res.ok) throw new Error('Falha ao gerar direcionamento');
      const data = await res.json();
      if (data.message) {
        alert(data.message);
      } else {
        setEventFlow(data);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar direção da IA.');
    } finally {
      setIsFlowLoading(false);
    }
  };

  const supabase = createClient();

  // Busca Inicial
  useEffect(() => {
    const fetchEventArchitecture = async () => {
      const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (event) setEventData(event);

      const { data: session } = await supabase
        .from("sessions")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (session) {
        setActiveSession(session);
        
        if (session.speaker_id) {
          const { data: speaker } = await supabase.from("speakers").select("*").eq("id", session.speaker_id).single();
          if (speaker) setSpeakerData(speaker);
        }

        const { data: qData } = await supabase
          .from("questions")
          .select("*")
          .eq("session_id", session.id)
          .order("created_at", { ascending: false });

        if (qData) setQuestions(qData);
      }
      setIsLoading(false);
    };

    fetchEventArchitecture();
  }, [eventId, supabase]);

  // Inscrição Realtime (Agora escuta todas as mudanças passivamente, sem polling)
  useEffect(() => {
    if (!activeSession) return;

    const channel = supabase
      .channel(`live-questions-${activeSession.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `session_id=eq.${activeSession.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setQuestions((prev) => [payload.new as Question, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setQuestions((prev) => prev.map((q) => (q.id === payload.new.id ? (payload.new as Question) : q)));
          } else if (payload.eventType === "DELETE") {
            setQuestions((prev) => prev.filter((q) => q.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeSession, supabase]);


  if (isLoading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Carregando painel ao vivo...</div>;
  }

  // O Painel agora mostra: 'pending' (novas), 'processing' (IA capturou), e 'approved' (IA terminou)
  const displayQuestions = questions.filter(q => ['pending', 'processing', 'approved'].includes(q.status));

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-6">
      <div className="mb-6">
        <Link href="/admin" className="text-neutral-500 hover:text-white transition-colors text-sm font-medium flex items-center gap-1 w-fit">
          ← Voltar para Painel Global
        </Link>
      </div>
      
      <header className="mb-8 flex justify-between items-center bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {eventData?.title || "Painel de Controle"}
            <span className="bg-purple-500/20 text-purple-400 border border-purple-500/50 text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
              AI Cloud Batch Ativo
            </span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-neutral-400">Status das Perguntas:</span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${questionsOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              <div className={`w-2 h-2 rounded-full ${questionsOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
              {questionsOpen ? 'Abertas' : 'Fechadas'}
            </div>
          </div>
        </div>
      </header>

      {!activeSession ? (
        <div className="bg-neutral-900 p-12 text-center rounded-2xl border border-neutral-800">
          <h2 className="text-xl text-red-400 mb-2">Nenhuma sessão ativa</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
              <h2 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-2">Resumo da IA</h2>
              
              <div className="space-y-4 mb-6 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <h3 className="font-medium text-sm text-neutral-300">Configuração da voz</h3>
                
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Velocidade: {speed.toFixed(2)}x</label>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="2.0" 
                    step="0.05"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <p className="text-[10px] text-neutral-500 mt-2">As alterações valem para o próximo clique em Falar.</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-xl font-bold">
                  {speakerData?.name?.charAt(0) || "P"}
                </div>
                <div>
                  <p className="font-medium text-lg">{speakerData?.name || "Indefinido"}</p>
                  <p className="text-sm text-neutral-400">{activeSession.title}</p>
                </div>
              </div>
            </div>

            {/* J.A.R.V.I.S Walkie-Talkie Panel */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-indigo-500/30 relative overflow-hidden">
              <h2 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-2 flex justify-between items-center text-indigo-400">
                J.A.R.V.I.S
                {isListening && (
                  <span className="flex items-center gap-2 text-[10px] px-2 py-1 bg-red-500/20 text-red-300 rounded-full uppercase tracking-widest animate-pulse">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div> ESCUTANDO
                  </span>
                )}
              </h2>
              
              <button 
                onClick={toggleListening}
                className={`w-full h-32 mb-6 rounded-2xl font-bold transition-all flex flex-col justify-center items-center gap-3 shadow-lg border-2 
                  ${isListening ? 'bg-red-600 border-red-400 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse' : 
                    jarvisProcessing ? 'bg-blue-600/50 border-blue-400 text-blue-200' : 
                    'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-neutral-300'}`}
              >
                {jarvisProcessing ? (
                  <><svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span className="text-sm">PROCESSANDO...</span></>
                ) : isListening ? (
                  <><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg> <span className="text-sm">FALE AGORA (OU CLIQUE PARA PARAR)</span></>
                ) : (
                  <><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg> <span className="text-sm">CLIQUE PARA FALAR</span></>
                )}
              </button>

              <div className="space-y-4 relative z-10">
                {jarvisTranscript && (
                  <div>
                    <h3 className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Você disse:</h3>
                    <p className="text-sm text-neutral-300 italic">&quot;{jarvisTranscript}&quot;</p>
                  </div>
                )}
                
                {jarvisResponse && (
                  <div className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-xl">
                    <h3 className="text-xs text-indigo-400 uppercase tracking-wider mb-2 font-bold">Resposta do J.A.R.V.I.S:</h3>
                    <p className="text-white text-sm leading-relaxed mb-4">
                      {jarvisResponse}
                    </p>
                    <button 
                      onClick={() => playVoice('jarvis_global', jarvisResponse)}
                      disabled={isLoadingAudio === 'jarvis_global' || playingId === 'jarvis_global'}
                      className={`w-full py-2 rounded-lg font-bold transition-all flex justify-center items-center gap-2 text-sm
                        ${playingId === 'jarvis_global' ? 'bg-purple-600 text-white animate-pulse' : 
                        isLoadingAudio === 'jarvis_global' ? 'bg-blue-500/20 text-blue-400' : 
                        'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                    >
                      {isLoadingAudio === 'jarvis_global' ? 'Gerando Áudio...' : playingId === 'jarvis_global' ? '🔊 Falando...' : '🗣️ Falar Resposta'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex flex-col h-[calc(100vh-160px)]">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                Feed Inteligente (AI)
                <span className="bg-neutral-800 text-xs py-1 px-2 rounded-full">{displayQuestions.length}</span>
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {displayQuestions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                  <p>Aguardando perguntas da audiência...</p>
                </div>
              ) : (
                displayQuestions.map((q) => (
                  <div key={q.id} className={`p-5 rounded-xl border transition-colors ${
                    q.status === 'approved' ? 'bg-purple-500/5 border-purple-500/30' : 
                    q.status === 'processing' ? 'bg-blue-500/5 border-blue-500/30 opacity-70' :
                    'bg-neutral-950 border-neutral-800'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-semibold flex items-center gap-2 ${
                        q.status === 'approved' ? 'text-purple-400' : 
                        q.status === 'processing' ? 'text-blue-400' : 
                        'text-emerald-400'
                      }`}>
                        {q.status === 'approved' && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>}
                        {q.status === 'processing' && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {q.author_name}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {new Date(q.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-lg mb-4 ${q.status === 'approved' ? 'text-white' : 'text-neutral-300'}`}>{q.content}</p>
                    
                    {q.status === 'approved' && q.suggested_answer && (
                      <div className="mt-4 bg-neutral-950/50 rounded-lg p-4 border border-purple-500/20 space-y-3">
                        <div className="flex flex-col gap-3">
                          <label className="text-sm font-medium text-neutral-300">Texto que a IA vai falar</label>
                          <textarea
                            className="w-full h-24 bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            value={editedTexts[q.id] !== undefined ? editedTexts[q.id] : `${q.transition} ${q.suggested_answer}`}
                            onChange={(e) => setEditedTexts({ ...editedTexts, [q.id]: e.target.value })}
                          />
                          
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <button
                              onClick={() => processPendingAI()}
                              className="bg-neutral-800 hover:bg-neutral-700 text-blue-400 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                            >
                              Gerar roteiro IA
                            </button>
                            <button
                              className="bg-neutral-800 hover:bg-neutral-700 text-blue-400 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                            >
                              Voltar
                            </button>
                            <button
                              className="bg-neutral-800 hover:bg-neutral-700 text-blue-400 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                            >
                              Próxima
                            </button>
                            <button
                              onClick={() => playVoice(q.id, `${q.transition} ${q.suggested_answer}`)}
                              disabled={isLoadingAudio === q.id || playingId === q.id}
                              className={`font-bold py-2 px-4 rounded-lg transition-all text-sm flex justify-center items-center gap-2
                                ${playingId === q.id ? 'bg-purple-600 text-white animate-pulse' : 
                                  isLoadingAudio === q.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
                                  'bg-neutral-800 hover:bg-neutral-700 text-blue-400'}`}
                            >
                              {isLoadingAudio === q.id ? (
                                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Gerando...</>
                              ) : playingId === q.id ? (
                                <>🔊 Falando...</>
                              ) : (
                                <>🗣️ Falar</>
                              )}
                            </button>
                          </div>
                          
                          <div className="flex flex-col gap-2 mt-2">
                            <button
                              className="bg-neutral-800 hover:bg-neutral-700 text-blue-400 font-bold py-2 px-4 rounded-lg transition-colors text-sm w-fit"
                            >
                              Reiniciar IA
                            </button>
                            <button
                              className="bg-neutral-800 hover:bg-neutral-700 text-blue-400 font-bold py-2 px-4 rounded-lg transition-colors text-sm w-fit"
                            >
                              Limpar perguntas
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-neutral-800/50">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium uppercase tracking-wider px-2 py-1 rounded ${
                          q.status === 'approved' ? 'text-purple-400 bg-purple-400/10' : 
                          q.status === 'processing' ? 'text-blue-400 bg-blue-400/10' :
                          'text-amber-500 bg-amber-500/10'
                        }`}>
                          {q.status === 'approved' ? 'Aprovado pela IA' : 
                           q.status === 'processing' ? 'A IA está lendo...' : 
                           'Na fila'}
                        </span>
                        {q.ai_score && q.ai_score > 1 && (
                          <span className="text-xs text-neutral-400 bg-neutral-800 px-2 py-1 rounded-full">
                            Agrupou {q.ai_score} perguntas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
