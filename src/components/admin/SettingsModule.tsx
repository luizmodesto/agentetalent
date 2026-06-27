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

export function SettingsModule({ eventId, supabase }: { eventId: string | null, supabase: any }) {
  if (!eventId) return <div className="text-white">Selecione um evento na aba 'Meus Eventos' primeiro.</div>;

  const [speakers, setSpeakers] = useState<any[]>([]);
  const [newSpeaker, setNewSpeaker] = useState({ name: "", role: "", tone: "Descontraído" });
  
  useEffect(() => {
    const fetchSpeakers = async () => {
      const { data } = await supabase.from('speakers').select('*');
      if (data) setSpeakers(data);
    };
    fetchSpeakers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if(newSpeaker.name) {
      const { data } = await supabase.from('speakers').insert([{ name: newSpeaker.name, role: newSpeaker.role }]).select();
      if (data && data[0]) {
        setSpeakers([...speakers, data[0]]);
        setNewSpeaker({ name: "", role: "", tone: "Descontraído" });
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-6">Cadastrar Novo Orador</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Nome Completo</label>
              <input required type="text" value={newSpeaker.name} onChange={e => setNewSpeaker({...newSpeaker, name: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Cargo / Especialidade</label>
              <input required type="text" value={newSpeaker.role} onChange={e => setNewSpeaker({...newSpeaker, role: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Tom de Voz (DIGITALENT)</label>
              <select value={newSpeaker.tone} onChange={e => setNewSpeaker({...newSpeaker, tone: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                <option>Formal</option>
                <option>Descontraído</option>
                <option>Energético</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors mt-2">
              Adicionar Orador
            </button>
          </form>
        </div>

        <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-6">Oradores do Evento ({speakers.length})</h3>
          <div className="space-y-3">
            {speakers.map(s => (
              <div key={s.id} className="bg-[#1a1a1a] border border-neutral-800 rounded-xl p-4 flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-white">{s.name}</h4>
                  <p className="text-sm text-neutral-500">{s.role}</p>
                </div>
                <span className="text-xs font-medium bg-neutral-800 text-neutral-300 px-2 py-1 rounded">
                  Tom: Automático
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MODULE D: PORTALS (Telas de Acesso -> Gestão de Ecrã Visual) ---