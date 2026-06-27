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

export function EventsModule({ supabase, onManageEvent }: { supabase: any, onManageEvent: (id: string) => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState({ title: "", logo_url: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (data) setEvents(data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if(newEvent.title) {
      setLoading(true);
      const { data, error } = await supabase.from('events').insert([
        { title: newEvent.title, logo_url: newEvent.logo_url || null }
      ]).select();
      
      if (error) {
        alert("Erro ao criar evento: " + error.message);
        setLoading(false);
        return;
      }
      
      if (data && data[0]) {
        // Evento criado com sucesso
        setEvents([data[0], ...events]);
        setNewEvent({ title: "", logo_url: "" });
      }
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este evento definitivamente? Todas as sessões e perguntas ligadas a ele também serão removidas.")) {
      setLoading(true);
      await supabase.from('events').delete().eq('id', id);
      fetchEvents();
    }
  };

  return (
    <div className="space-y-8">
      {/* CREATE EVENT */}
      <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-400" /> Criar Novo Evento
        </h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm text-neutral-400 mb-1">Nome do Evento</label>
            <input required type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Ex: Digitalent 2026" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm text-neutral-400 mb-1">URL do Logótipo do Evento</label>
            <input type="text" value={newEvent.logo_url} onChange={e => setNewEvent({...newEvent, logo_url: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Ex: https://.../logo.png" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors md:col-span-1 flex justify-center items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Criar Evento
          </button>
        </form>
      </div>

      {/* EVENT LIST */}
      <div>
        <h3 className="font-semibold text-white mb-4">Seus Eventos ({events.length})</h3>
        {loading ? <p className="text-neutral-500 text-sm">Carregando eventos do banco de dados...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(evt => (
            <div key={evt.id} className="bg-[#111] border border-neutral-800 rounded-2xl p-6 flex flex-col hover:border-indigo-500/30 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-lg text-white mb-1 line-clamp-1" title={evt.title}>{evt.title}</h4>
                  <p className="text-xs text-neutral-500">ID: {evt.id}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md font-medium ${evt.status === 'Ao Vivo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'}`}>
                  {evt.status || "Pendente"}
                </span>
              </div>
              <div className="mt-auto pt-4 border-t border-neutral-800 flex gap-2">
                <button 
                  onClick={() => onManageEvent(evt.id)}
                  className="flex-1 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Gerir Evento
                </button>
                <button 
                  onClick={() => handleDelete(evt.id)}
                  className="bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                  title="Excluir Evento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

// --- MODULE A: CONTROL ROOM (Legacy Teleprompter Triggers) ---