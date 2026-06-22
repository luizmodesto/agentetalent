"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/utils/supabase/client";
import QRCode from "react-qr-code";

export default function JoinEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [eventData, setEventData] = useState<any>(null);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [questionsCount, setQuestionsCount] = useState<Record<string, number>>({});
  
  // Participant state
  const [participantName, setParticipantName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form states per speaker
  const [inputs, setInputs] = useState<Record<string, { name: string, question: string }>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const supabase = createClient();

  // 1. Check LocalStorage for participant name
  useEffect(() => {
    const savedName = localStorage.getItem(`talent_participant_${eventId}`);
    if (savedName) {
      setParticipantName(savedName);
      setHasJoined(true);
    }
  }, [eventId]);

  // 2. Fetch Initial Data & Setup Realtime
  useEffect(() => {
    const fetchEventData = async () => {
      // Fetch Event
      const { data: ev } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (ev) setEventData(ev);

      // Fetch Sessions for the event
      const { data: allSessions } = await supabase.from("sessions").select("id, speaker_id").eq("event_id", eventId);
      
      if (allSessions && allSessions.length > 0) {
         // Fetch Speakers
         const speakerIds = allSessions.map((s: any) => s.speaker_id).filter(Boolean);
         if (speakerIds.length > 0) {
            const { data: spks } = await supabase.from("speakers").select("*").in("id", speakerIds);
            if (spks) setSpeakers(spks);
         }
      }

      // Fetch Active Session
      const { data: session } = await supabase
        .from("sessions")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (session) setActiveSession(session);

      // Fetch Initial Questions to count per session
      const { data: allSessionsRes } = await supabase.from("sessions").select("id, speaker_id").eq("event_id", eventId);
      
      if (allSessionsRes && allSessionsRes.length > 0) {
         const sessionIds = allSessionsRes.map((s: any) => s.id);
         const { data: questions } = await supabase.from("questions").select("session_id").in("session_id", sessionIds);
         
         const counts: Record<string, number> = {};
         if (questions) {
            questions.forEach(q => {
               const s = allSessionsRes.find((sess: any) => sess.id === q.session_id);
               if (s && s.speaker_id) {
                  counts[s.speaker_id] = (counts[s.speaker_id] || 0) + 1;
               }
            });
         }
         setQuestionsCount(counts);
      }

      setIsLoading(false);
    };

    fetchEventData();

    // Subscribe to Sessions (to toggle Red/Green instantly)
    const sessionChannel = supabase.channel('public:sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `event_id=eq.${eventId}` }, () => {
        fetchEventData(); 
      }).subscribe();

    // Subscribe to Questions (to update footer counts instantly)
    const questionsChannel = supabase.channel('public:questions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'questions' }, () => {
        // Simple re-fetch of counts
        fetchEventData();
      }).subscribe();

    return () => { 
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(questionsChannel);
    };
  }, [eventId, supabase]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (participantName.trim()) {
      localStorage.setItem(`talent_participant_${eventId}`, participantName.trim());
      setHasJoined(true);
    }
  };

  const handleInputChange = (speakerId: string, field: 'name' | 'question', value: string) => {
    setInputs(prev => ({
      ...prev,
      [speakerId]: {
        ...prev[speakerId],
        name: field === 'name' ? value : (prev[speakerId]?.name ?? participantName),
        question: field === 'question' ? value : (prev[speakerId]?.question ?? "")
      }
    }));
  };

  const handleSubmitQuestion = async (e: React.FormEvent, speakerId: string) => {
    e.preventDefault();
    
    // We can only submit if this speaker is the active session
    if (!activeSession || activeSession.speaker_id !== speakerId) return;

    const data = inputs[speakerId] || { name: participantName, question: "" };
    const finalName = data.name.trim() || participantName || "Anônimo";
    const finalQuestion = data.question.trim();

    if (!finalQuestion) return;

    setSubmitting(prev => ({ ...prev, [speakerId]: true }));

    const { error } = await supabase.from("questions").insert([{
      session_id: activeSession.id,
      content: finalQuestion,
      author_name: finalName,
      status: "pending",
    }]);

    setSubmitting(prev => ({ ...prev, [speakerId]: false }));

    if (error) {
      alert("Erro ao enviar pergunta.");
      console.error(error);
    } else {
      // Clear question, keep name
      handleInputChange(speakerId, 'question', '');
      alert("Pergunta enviada com sucesso!");
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">Carregando portal...</div>;
  }

  // --- WELCOME GATE ---
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-8 text-center border-t-4 border-emerald-500">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo(a)!</h1>
          <p className="text-sm text-slate-500 mb-8">
            Para participar e enviar perguntas aos oradores, por favor identifique-se.
          </p>
          <form onSubmit={handleJoin} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Como devemos chamá-lo(a)?</label>
              <input 
                type="text" 
                required
                placeholder="Ex: João Silva"
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={participantName}
                onChange={e => setParticipantName(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-[#0A192F] text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors shadow-lg">
              Entrar no Evento
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN LAYOUT ---
  const activeSpeaker = speakers.find(s => s.id === activeSession?.speaker_id);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* HEADER DINÂMICO */}
      <div className="bg-[#0A192F] text-white border-b-4 border-[#081324] shadow-md px-4 md:px-8 py-6 pb-8">
         <div className="max-w-5xl mx-auto flex justify-between items-start gap-4">
            <div className="flex-1">
               <h1 className="text-2xl md:text-3xl font-bold mb-2">
                 Perguntas abertas para {activeSpeaker?.name || "..."}
               </h1>
               <p className="text-sm text-slate-400">
                 Tema: {activeSpeaker?.role || "Geral"}. Envie sua pergunta pelo celular enquanto a sessao estiver verde.
               </p>
            </div>
            {/* MINI QR CODE */}
            <div className="bg-white p-2 rounded-xl flex flex-col items-center shadow-lg shrink-0 w-[90px] md:w-[110px]">
               {typeof window !== 'undefined' && <QRCode value={window.location.href} size={256} className="w-full h-auto" />}
               <span className="text-[7px] md:text-[9px] text-slate-500 mt-1 break-all text-center leading-tight">
                 {typeof window !== 'undefined' ? window.location.origin : ''}
               </span>
            </div>
         </div>
      </div>

      {/* GRID DE CARDS DOS ORADORES */}
      <div className="max-w-5xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {speakers.map(speaker => {
          const isActive = activeSession?.speaker_id === speaker.id;
          const currentInput = inputs[speaker.id] || { name: participantName, question: "" };
          const qCount = questionsCount[speaker.id] || 0;
          
          return (
            <div key={speaker.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all">
              
              <div className="p-5 flex flex-col gap-4">
                {/* TOPO: Nome e Badge */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 leading-tight">{speaker.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{speaker.role}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                    isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"
                  }`}>
                    {isActive ? "Aberto" : "Fechado"}
                  </div>
                </div>

                {/* AVISO COLORIDO */}
                <div className={`px-4 py-2.5 rounded-lg text-sm font-semibold ${
                  isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                }`}>
                  {isActive ? "Sessao verde: escreva sua pergunta." : "Sessao vermelha: aguarde este orador abrir."}
                </div>

                {/* FORMULÁRIO */}
                <form onSubmit={(e) => handleSubmitQuestion(e, speaker.id)} className="space-y-4 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Seu nome</label>
                    <input 
                      type="text" 
                      placeholder="Opcional"
                      disabled={!isActive}
                      value={currentInput.name}
                      onChange={(e) => handleInputChange(speaker.id, 'name', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pergunta</label>
                    <textarea 
                      required
                      placeholder={`Digite sua pergunta para ${speaker.name.split(' ')[0]}`}
                      disabled={!isActive}
                      value={currentInput.question}
                      onChange={(e) => handleInputChange(speaker.id, 'question', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-colors resize-none h-24"
                    />
                  </div>

                  {/* BOTÃO */}
                  <button 
                    type="submit" 
                    disabled={!isActive || submitting[speaker.id]}
                    className={`w-full font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      isActive 
                        ? "bg-[#1E824C] hover:bg-[#15673a] text-white shadow-md shadow-[#1E824C]/20" 
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {submitting[speaker.id] ? "Enviando..." : "Enviar pergunta"}
                  </button>
                </form>
              </div>

              {/* RODAPÉ: Contador */}
              <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                {qCount} pergunta(s) recebida(s) para este orador.
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
