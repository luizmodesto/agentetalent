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

  const [supabase] = useState(() => createClient());

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
        .eq("status", "live")
        .maybeSingle();
      
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

    // Subscribe to Sessions
    const sessionChannel = supabase.channel('public:sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `event_id=eq.${eventId}` }, () => {
        fetchEventData(); 
      }).subscribe();

    // Subscribe to Questions
    const questionsChannel = supabase.channel('public:questions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'questions' }, () => {
        fetchEventData();
      }).subscribe();

    return () => { 
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(questionsChannel);
    };
  }, [eventId, supabase]);

  // 3. Presence Realtime
  useEffect(() => {
    if (!hasJoined || !participantName) return;

    const presenceChannel = supabase.channel(`presence_${eventId}`, {
      config: { presence: { key: participantName } }
    });

    presenceChannel.on('presence', { event: 'sync' }, () => {}).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ name: participantName, online_at: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [eventId, hasJoined, participantName, supabase]);

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
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Carregando portal...</div>;
  }

  // --- WELCOME GATE ---
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white max-w-md w-full rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 text-center border border-slate-100">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
             <span className="font-bold text-2xl">Olá</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo(a)</h1>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Para participar e enviar perguntas aos oradores, por favor identifique-se.
          </p>
          <form onSubmit={handleJoin} className="space-y-5 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Como devemos chamá-lo(a)?</label>
              <input 
                type="text" 
                required
                placeholder="O seu nome..."
                className="w-full border-0 bg-slate-100/50 rounded-xl px-4 py-3.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 font-medium"
                value={participantName}
                onChange={e => setParticipantName(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white font-medium py-3.5 rounded-xl hover:bg-slate-800 transition-colors shadow-md shadow-slate-900/10">
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* HEADER DINÂMICO */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
         <div className="max-w-5xl mx-auto px-4 md:px-8 py-5 flex justify-between items-center gap-4">
            <div className="flex-1">
               <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                 {activeSpeaker ? "Sessão Aberta" : "Aguardando"}
               </p>
               <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">
                 {activeSpeaker?.name || "Nenhum orador em palco"}
               </h1>
            </div>
            {/* LOGOTIPO DO EVENTO */}
            <div className="shrink-0 flex items-center justify-center">
               <img src="https://i.imgur.com/EpDGrzT.png" alt="Logo do Evento" className="h-10 md:h-12 object-contain" />
            </div>
         </div>
      </div>

      {/* GRID DE CARDS DOS ORADORES */}
      <div className="max-w-5xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-start pb-20">
        {speakers.map(speaker => {
          const isActive = activeSession?.speaker_id === speaker.id;
          const currentInput = inputs[speaker.id] || { name: participantName, question: "" };
          const qCount = questionsCount[speaker.id] || 0;
          
          return (
            <div key={speaker.id} className={`bg-white rounded-3xl overflow-hidden transition-all duration-300 ${isActive ? 'shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-blue-100/50 scale-[1.01]' : 'shadow-sm border border-slate-100 opacity-70 scale-100 grayscale-[20%]'}`}>
              
              <div className="p-6 md:p-8 flex flex-col gap-5">
                {/* TOPO: Nome e Badge */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 leading-tight">{speaker.name}</h2>
                    <p className="text-sm text-slate-500 mt-1">{speaker.role}</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold shrink-0 ${
                    isActive ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    {isActive ? "Em Palco" : "Aguardando"}
                  </div>
                </div>

                {/* FORMULÁRIO */}
                <form onSubmit={(e) => handleSubmitQuestion(e, speaker.id)} className="space-y-4 mt-2">
                  <div>
                    <input 
                      type="text" 
                      disabled
                      value={participantName}
                      className="w-full border-0 bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-400 font-medium cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <textarea 
                      required
                      placeholder={`Qual a sua pergunta para ${speaker.name.split(' ')[0]}?`}
                      disabled={!isActive}
                      value={currentInput.question}
                      onChange={(e) => handleInputChange(speaker.id, 'question', e.target.value)}
                      className="w-full border-0 bg-slate-50 rounded-xl px-4 py-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50/50 disabled:text-slate-400 transition-all resize-none h-28 placeholder:text-slate-400"
                    />
                  </div>

                  {/* BOTÃO */}
                  <button 
                    type="submit" 
                    disabled={!isActive || submitting[speaker.id]}
                    className={`w-full font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                      isActive 
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20" 
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {submitting[speaker.id] ? "Enviando..." : "Enviar Pergunta"}
                  </button>
                </form>
              </div>

              {/* RODAPÉ: Contador */}
              <div className="bg-slate-50/50 px-6 py-4 text-xs font-medium text-slate-400 flex justify-between items-center border-t border-slate-50">
                <span>Total de perguntas recebidas</span>
                <span className="bg-white shadow-sm px-2 py-0.5 rounded-md text-slate-600">{qCount}</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
