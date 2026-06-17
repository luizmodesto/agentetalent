"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

type EventType = {
  id: string;
  title: string;
  created_at: string;
};

import Link from "next/link";

export default function GlobalAdminPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [eventName, setEventName] = useState("");
  const [speakerName, setSpeakerName] = useState("");

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = "/login";
      } else {
        fetchEvents();
      }
    });
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("id, title, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEvents(data);
    }
    setIsLoading(false);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !speakerName) return alert("Preencha todos os campos.");

    setIsCreating(true);
    try {
      // 1. Criar Speaker
      const { data: speakerData, error: speakerError } = await supabase
        .from("speakers")
        .insert({ name: speakerName })
        .select()
        .single();
      
      if (speakerError) throw speakerError;

      // 2. Criar Event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert({ title: eventName, status: "upcoming" })
        .select()
        .single();
      
      if (eventError) throw eventError;

      // 3. Criar Session
      const { error: sessionError } = await supabase
        .from("sessions")
        .insert({
          event_id: eventData.id,
          speaker_id: speakerData.id,
          title: "Sessão Principal",
          status: "waiting",
        });
      
      if (sessionError) throw sessionError;

      // Limpar formulário e recarregar
      setEventName("");
      setSpeakerName("");
      await fetchEvents();
      alert("Evento criado com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao criar evento: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const getUrl = (eventId: string, path: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/event/${eventId}/${path}`;
    }
    return `/event/${eventId}/${path}`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex justify-between items-center border-b border-neutral-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              SaaS Admin Dashboard
            </h1>
            <p className="text-neutral-400 mt-2">Gerencie e crie novos eventos no sistema.</p>
          </div>
          <button 
            onClick={() => { supabase.auth.signOut().then(() => window.location.href = "/login") }}
            className="text-sm px-4 py-2 border border-neutral-800 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-300"
          >
            Sair
          </button>
        </header>

        <section className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-2xl">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Criar Novo Evento
          </h2>
          <form onSubmit={handleCreateEvent} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Nome do Evento</label>
              <input 
                type="text" 
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ex: Tech Summit 2026"
                disabled={isCreating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Nome do Responsável do Evento</label>
              <input 
                type="text" 
                value={speakerName}
                onChange={(e) => setSpeakerName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ex: Maria Silva"
                disabled={isCreating}
              />
            </div>
            <button 
              type="submit" 
              disabled={isCreating || !eventName || !speakerName}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
            >
              {isCreating ? (
                <><svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Criando Evento...</>
              ) : "Criar Evento"}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-6">Eventos Existentes</h2>
          {isLoading ? (
            <p className="text-neutral-500">Carregando eventos...</p>
          ) : events.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl text-center">
              <p className="text-neutral-500">Nenhum evento criado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((evt) => {
                const joinUrl = getUrl(evt.id, 'join');
                const liveUrl = getUrl(evt.id, 'live');
                const adminUrl = getUrl(evt.id, 'admin');
                const settingsUrl = getUrl(evt.id, 'settings');
                const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(joinUrl)}&size=200&margin=1`;

                return (
                  <div key={evt.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col">
                    <h3 className="font-semibold text-lg mb-1 truncate" title={evt.title}>{evt.title}</h3>
                    <p className="text-xs text-neutral-500 mb-6 flex-1">
                      ID: <span className="font-mono">{evt.id.split('-')[0]}...</span>
                    </p>

                    <div className="bg-white p-3 rounded-xl self-center mb-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrUrl} alt="QR Code" className="w-32 h-32" />
                    </div>

                    <div className="space-y-3">
                      <Link href={joinUrl} className="block w-full text-center py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-sm transition-colors text-emerald-400 font-medium">
                        📱 Ver Tela da Audiência
                      </Link>
                      <Link href={settingsUrl} className="block w-full text-center py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 rounded-lg text-sm transition-colors text-indigo-400 font-bold shadow-[0_0_10px_rgba(79,70,229,0.2)]">
                        ⚙️ Painel Geral do Evento
                      </Link>
                      <div className="flex gap-2">
                        <Link href={liveUrl} className="flex-1 text-center py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-sm transition-colors text-blue-400 font-medium">
                          🎥 Ao Vivo (Speaker)
                        </Link>
                        <Link href={adminUrl} className="flex-1 text-center py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-sm transition-colors text-purple-400 font-medium">
                          ✓ Aprovar Perguntas
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
