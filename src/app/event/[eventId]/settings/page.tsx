"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function EventSettingsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [activeTab, setActiveTab] = useState<"geral" | "participantes" | "apoiadores">("geral");
  
  const [eventData, setEventData] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [supporters, setSupporters] = useState<any[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single();
    if (event) setEventData(event);

    // Fetch sessions/speakers for this event
    const { data: sessions } = await supabase.from("sessions").select("speaker_id").eq("event_id", eventId);
    if (sessions && sessions.length > 0) {
      const speakerIds = sessions.map((s: any) => s.speaker_id);
      const { data: spks } = await supabase.from("speakers").select("*").in("id", speakerIds);
      if (spks) setParticipants(spks);
    }

    const { data: supps } = await supabase.from("supporters").select("*").eq("event_id", eventId);
    if (supps) setSupporters(supps);
  };

  // --- GERAL ---
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("events").update({ max_questions_limit: eventData.max_questions_limit }).eq("id", eventId);
    alert("Configurações salvas!");
  };

  // --- PARTICIPANTES ---
  const [partForm, setPartForm] = useState({ name: '', role: 'orador', bio: '', linkedin_url: '', instagram_url: '', facebook_url: '' });
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);

  const handleGenerateBio = async () => {
    if (!partForm.name) return alert("Preencha o nome primeiro.");
    setIsGeneratingBio(true);
    try {
      const res = await fetch("/api/generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partForm)
      });
      const data = await res.json();
      if (data.bio) {
        setPartForm(prev => ({ ...prev, bio: data.bio }));
      } else {
        alert(data.error || "Erro ao gerar bio.");
      }
    } catch (e) {
      alert("Erro na requisição da IA.");
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: spk, error } = await supabase.from("speakers").insert(partForm).select().single();
    if (!error && spk) {
      await supabase.from("sessions").insert({ event_id: eventId, speaker_id: spk.id, title: `Sessão ${partForm.name}`, status: 'waiting' });
      setPartForm({ name: '', role: 'orador', bio: '', linkedin_url: '', instagram_url: '', facebook_url: '' });
      fetchData();
    }
  };

  // --- APOIADORES ---
  const [suppForm, setSuppForm] = useState({ name: '', contact: '', logo_url: '' });

  const handleAddSupporter = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("supporters").insert({ ...suppForm, event_id: eventId });
    if (!error) {
      setSuppForm({ name: '', contact: '', logo_url: '' });
      fetchData();
    }
  };

  if (!eventData) return <div className="p-10 text-white">Carregando...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <Link href="/admin" className="text-neutral-500 hover:text-white transition-colors text-sm font-medium flex items-center gap-1 w-fit">
            ← Voltar para Painel Global
          </Link>
        </div>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-indigo-400">Painel Geral do Evento</h1>
          <p className="text-neutral-400">{eventData.title}</p>
        </header>

        <div className="flex gap-4 mb-8 border-b border-neutral-800 pb-2">
          {["geral", "participantes", "apoiadores"].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 capitalize font-medium rounded-t-lg transition-colors ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB GERAL */}
        {activeTab === "geral" && (
          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
            <h2 className="text-xl font-semibold mb-4">Configurações da Inteligência Artificial</h2>
            <form onSubmit={handleSaveGeneral} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Limite de Perguntas por Sessão</label>
                <input 
                  type="number" 
                  value={eventData.max_questions_limit || 10}
                  onChange={(e) => setEventData({...eventData, max_questions_limit: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white"
                />
                <p className="text-xs text-neutral-500 mt-1">Quantas perguntas a IA deve tentar responder/mediar no máximo.</p>
              </div>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white font-medium">
                Salvar Configurações
              </button>
            </form>
          </div>
        )}

        {/* TAB PARTICIPANTES */}
        {activeTab === "participantes" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
              <h2 className="text-xl font-semibold mb-4">Adicionar Participante</h2>
              <form onSubmit={handleAddParticipant} className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Nome Completo</label>
                  <input required type="text" value={partForm.name} onChange={e => setPartForm({...partForm, name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Papel no Evento</label>
                  <select value={partForm.role} onChange={e => setPartForm({...partForm, role: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white">
                    <option value="orador">Orador</option>
                    <option value="formador">Formador</option>
                    <option value="formando">Formando</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">LinkedIn URL</label>
                    <input type="text" value={partForm.linkedin_url} onChange={e => setPartForm({...partForm, linkedin_url: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Instagram URL</label>
                    <input type="text" value={partForm.instagram_url} onChange={e => setPartForm({...partForm, instagram_url: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Facebook URL</label>
                    <input type="text" value={partForm.facebook_url} onChange={e => setPartForm({...partForm, facebook_url: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-sm text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm text-neutral-400">Biografia de Impacto</label>
                    <button type="button" onClick={handleGenerateBio} disabled={isGeneratingBio} className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50">
                      ✨ {isGeneratingBio ? "Lendo Redes..." : "Gerar Bio com IA"}
                    </button>
                  </div>
                  <textarea rows={4} required value={partForm.bio} onChange={e => setPartForm({...partForm, bio: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white text-sm"></textarea>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white font-medium">
                  Cadastrar Participante
                </button>
              </form>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Equipe Cadastrada ({participants.length})</h2>
              <div className="space-y-3">
                {participants.map(p => (
                  <div key={p.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{p.name}</h3>
                      <span className="text-xs uppercase px-2 py-1 bg-neutral-800 text-neutral-300 rounded">{p.role}</span>
                    </div>
                    <p className="text-sm text-neutral-400 line-clamp-2">{p.bio}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB APOIADORES */}
        {activeTab === "apoiadores" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
              <h2 className="text-xl font-semibold mb-4">Cadastrar Apoiador / Patrocinador</h2>
              <form onSubmit={handleAddSupporter} className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Nome da Empresa</label>
                  <input required type="text" value={suppForm.name} onChange={e => setSuppForm({...suppForm, name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Contato / E-mail</label>
                  <input type="text" value={suppForm.contact} onChange={e => setSuppForm({...suppForm, contact: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">URL do Logo (Imagem)</label>
                  <input type="text" value={suppForm.logo_url} onChange={e => setSuppForm({...suppForm, logo_url: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white" placeholder="https://..." />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white font-medium">
                  Salvar Apoiador
                </button>
              </form>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Apoiadores Oficiais</h2>
              <div className="grid grid-cols-2 gap-4">
                {supporters.map(s => (
                  <div key={s.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col items-center text-center">
                    {s.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo_url} alt={s.name} className="w-16 h-16 object-contain mb-3 bg-white rounded p-1" />
                    ) : (
                      <div className="w-16 h-16 bg-neutral-800 rounded flex items-center justify-center mb-3">🏢</div>
                    )}
                    <h3 className="font-medium text-sm">{s.name}</h3>
                    <p className="text-xs text-neutral-500">{s.contact}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
