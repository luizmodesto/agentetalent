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

export function ManageSponsorsModule({ eventId: initialEventId, supabase }: { eventId: string | null, supabase: any }) {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || "");
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [newSponsorUrl, setNewSponsorUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('events').select('id, title').then(({ data }: any) => { if (data) setEvents(data); });
  }, [supabase]);
  useEffect(() => { if (initialEventId) setSelectedEventId(initialEventId); }, [initialEventId]);

  useEffect(() => {
    if (!selectedEventId) { setLoading(false); return; }
    setLoading(true);
    const fetchEvent = async () => {
      const { data } = await supabase.from('events').select('personality').eq('id', selectedEventId).single();
      if (data?.personality) {
        try {
          const parsed = typeof data.personality === 'string' ? JSON.parse(data.personality) : data.personality;
          setSponsors(parsed.sponsors || []);
        } catch(e) {}
      } else {
        setSponsors([]);
      }
      setLoading(false);
    };
    fetchEvent();
  }, [selectedEventId, supabase]);

  const saveSponsors = async (newSponsorsList: string[]) => {
    if (!selectedEventId) return;
    try {
      const { data: evData } = await supabase.from('events').select('personality').eq('id', selectedEventId).single();
      let config = evData?.personality ? (typeof evData.personality === 'string' ? JSON.parse(evData.personality) : evData.personality) : {};
      config.sponsors = newSponsorsList;
      await supabase.from('events').update({ personality: JSON.stringify(config) }).eq('id', selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = () => {
    if (!newSponsorUrl.trim()) return;
    const updated = [...sponsors, newSponsorUrl.trim()];
    setSponsors(updated);
    setNewSponsorUrl("");
    saveSponsors(updated);
  };

  const handleRemove = (idx: number) => {
    const updated = sponsors.filter((_, i) => i !== idx);
    setSponsors(updated);
    saveSponsors(updated);
  };

  if (loading) return <div className="text-neutral-500 animate-pulse">A carregar patrocinadores...</div>;

  return (
    <div className="bg-[#111] border border-neutral-800 rounded-2xl p-8 max-w-4xl">
      <h2 className="text-2xl font-bold text-white mb-2">Gerenciador de Patrocinadores</h2>
      <p className="text-neutral-400 mb-8 text-sm">Adicione os logótipos das marcas que patrocinam o evento. Eles serão exibidos nos intervalos e no ecrã de descanso.</p>
      
      <div className="bg-indigo-900/10 border border-indigo-500/20 p-4 rounded-xl mb-6 max-w-2xl">
        <label className="block text-sm font-medium text-neutral-300 mb-1.5">Qual Evento quer gerir? *</label>
        <select required value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500">
          <option value="">-- Selecione o Evento --</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
        </select>
      </div>

      <div className="flex gap-3 mb-8">
        <input 
          type="text" 
          value={newSponsorUrl} 
          disabled={!selectedEventId}
          onChange={e => setNewSponsorUrl(e.target.value)} 
          className="flex-1 bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50" 
          placeholder="Cole aqui o URL da imagem do logotipo (ex: https://.../logo.png)" 
        />
        <button onClick={handleAdd} disabled={!selectedEventId} className="px-6 py-3 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white font-medium rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
          <Plus className="w-5 h-5" /> Adicionar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {sponsors.length === 0 && <div className="col-span-full text-neutral-600 text-sm py-8 text-center border-2 border-dashed border-neutral-800 rounded-xl">Nenhum patrocinador cadastrado.</div>}
        {sponsors.map((url, idx) => (
          <div key={idx} className="bg-[#1a1a1a] border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-between group relative h-32">
            <div className="flex-1 w-full flex items-center justify-center p-2">
              <img src={url} alt={`Sponsor ${idx}`} className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
            </div>
            <button onClick={() => handleRemove(idx)} className="absolute top-2 right-2 p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- MODULE: MANAGE EVENT (LIVE CONTROLLER 4 COLUMNS) ---