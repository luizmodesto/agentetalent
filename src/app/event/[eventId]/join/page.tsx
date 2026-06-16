"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function JoinEventPage({ params }: { params: { eventId: string } }) {
  const [question, setQuestion] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();
  const eventId = params.eventId;

  // Busca a sessão ativa para este evento
  useEffect(() => {
    const fetchActiveSession = async () => {
      // Como não sabemos o 'status' exato, buscamos a sessão vinculada ao evento.
      // Em produção, adicionaríamos .eq('status', 'live') ou similar.
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (data) {
        setActiveSession(data);
      }
      setIsLoading(false);
    };

    fetchActiveSession();
  }, [eventId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !activeSession) return;

    setIsSubmitting(true);

    const { error } = await supabase.from("questions").insert([
      {
        session_id: activeSession.id,
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

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 text-white">
        <h1 className="text-2xl font-bold text-red-400 mb-2">Evento Fechado</h1>
        <p className="text-neutral-400 text-center">Nenhuma sessão ativa está recebendo perguntas no momento.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-md bg-neutral-900 p-8 rounded-2xl shadow-2xl border border-neutral-800">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            {activeSession.title || "Talent Live"}
          </h1>
          <p className="text-neutral-400 mt-2 text-sm">
            Envie sua pergunta para o palestrante agora mesmo!
          </p>
        </div>

        {isSuccess ? (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-6 rounded-xl text-center animate-in fade-in zoom-in duration-300">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h2 className="text-xl font-semibold mb-1">Pergunta enviada!</h2>
            <p className="text-sm opacity-80">Aguarde, o palestrante responderá em breve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Seu nome (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Maria Silva"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Sua pergunta <span className="text-emerald-400">*</span>
              </label>
              <textarea
                required
                placeholder="Digite sua dúvida aqui..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none h-32"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={500}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !question.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3.5 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enviando...
                </>
              ) : (
                "Enviar Pergunta"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
