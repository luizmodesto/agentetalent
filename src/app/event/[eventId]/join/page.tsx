"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/utils/supabase/client";

export default function JoinEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [eventData, setEventData] = useState<any>(null);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  
  const [question, setQuestion] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    const fetchEventData = async () => {
      // 1. Fetch Event
      const { data: ev } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (ev) setEventData(ev);

      // 2. Fetch Speakers
      const { data: spks } = await supabase.from("speakers").select("*").eq("event_id", eventId);
      if (spks) setSpeakers(spks);

      // 3. Fetch Active Session
      const { data: session } = await supabase
        .from("sessions")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (session) {
        setActiveSession(session);
      }
      setIsLoading(false);
    };

    fetchEventData();
    
    // Realtime changes for sessions (e.g. if the admin switches the active speaker)
    const channel = supabase.channel('public:sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `event_id=eq.${eventId}` }, (payload) => {
        fetchEventData(); // refetch to get the latest active session
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, supabase]);

  const handleSubmit = async (e: React.FormEvent, sessionId: string) => {
    e.preventDefault();
    if (!question.trim() || !sessionId) return;

    setIsSubmitting(true);

    const { error } = await supabase.from("questions").insert([
      {
        session_id: sessionId,
        event_id: eventId,
        content: question,
        author_name: authorName.trim() || "Anônimo",
        status: "pending",
      },
    ]);

    setIsSubmitting(false);

    if (error) {
      alert("Erro ao enviar pergunta. Tente novamente.");
      console.error(error);
    } else {
      setIsSuccess(true);
      setQuestion("");
      setTimeout(() => setIsSuccess(false), 3000);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Carregando evento...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col p-4 md:p-8 text-white font-sans">
      
      <div className="max-w-2xl mx-auto w-full mb-8 text-center pt-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          {eventData?.title || "Talent Live"}
        </h1>
        <p className="text-neutral-400 text-sm">
          Acompanhe os palestrantes e envie suas perguntas ao vivo!
        </p>
      </div>

      <div className="max-w-2xl mx-auto w-full space-y-6">
        {speakers.length === 0 ? (
          <div className="text-center p-8 bg-neutral-900 rounded-2xl border border-neutral-800">
            <p className="text-neutral-500">Nenhum palestrante cadastrado ainda.</p>
          </div>
        ) : (
          speakers.map((speaker) => {
            const isActive = activeSession && activeSession.speaker_id === speaker.id;
            
            return (
              <div 
                key={speaker.id} 
                className={`transition-all duration-500 overflow-hidden rounded-2xl border ${
                  isActive 
                    ? "bg-neutral-900 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50" 
                    : "bg-neutral-900/50 border-neutral-800 opacity-70 scale-[0.98]"
                }`}
              >
                {/* Speaker Header */}
                <div className={`p-6 flex items-start gap-4 ${isActive ? 'bg-emerald-500/5' : ''}`}>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0 shadow-lg ${
                    isActive ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white" : "bg-neutral-800 text-neutral-500"
                  }`}>
                    {speaker.name.charAt(0)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h2 className={`text-xl font-bold ${isActive ? "text-emerald-400" : "text-neutral-300"}`}>
                        {speaker.name}
                      </h2>
                      {isActive && (
                        <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full animate-pulse">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                          No Palco
                        </span>
                      )}
                    </div>
                    <span className="text-xs uppercase tracking-wider text-neutral-500 mt-1 block">{speaker.role}</span>
                    <p className={`mt-3 text-sm line-clamp-3 ${isActive ? "text-neutral-300" : "text-neutral-500"}`}>
                      {speaker.bio}
                    </p>
                  </div>
                </div>

                {/* Form Section (Only shown if active) */}
                {isActive && (
                  <div className="p-6 border-t border-emerald-500/20 bg-neutral-950/50">
                    <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                      Fazer uma Pergunta
                    </h3>

                    {isSuccess ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-6 rounded-xl text-center animate-in zoom-in duration-300">
                        <svg className="w-10 h-10 mx-auto mb-2 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <h4 className="font-semibold">Sua voz foi ouvida!</h4>
                        <p className="text-sm opacity-80 mt-1">A IA já enviou sua pergunta para o diretor.</p>
                      </div>
                    ) : (
                      <form onSubmit={(e) => handleSubmit(e, activeSession.id)} className="space-y-4">
                        <div>
                          <input
                            type="text"
                            placeholder="Seu nome (opcional)"
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            maxLength={50}
                          />
                        </div>

                        <div>
                          <textarea
                            required
                            placeholder={`Escreva sua pergunta para ${speaker.name.split(' ')[0]}...`}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none h-28"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            maxLength={500}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting || !question.trim()}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Enviando para a IA...
                            </>
                          ) : (
                            "Enviar Pergunta"
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
