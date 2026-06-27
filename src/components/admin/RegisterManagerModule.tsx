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

export function RegisterManagerModule({ eventId: initialEventId, supabase }: { eventId: string | null, supabase: any }) {
  const [events, setEvents] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || "");
  const [formData, setFormData] = useState({ id: "", name: "", email: "", access_level: "Moderador" });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

  useEffect(() => {
    supabase.from('events').select('id, title').then(({ data }: any) => { if (data) setEvents(data); });
  }, [supabase]);
  useEffect(() => { if (initialEventId) setSelectedEventId(initialEventId); }, [initialEventId]);

  const fetchManagers = async () => {
    if (!selectedEventId) return;
    const { data } = await supabase.from('managers').select('*').eq('event_id', selectedEventId).order('created_at', { ascending: false });
    if (data) setManagers(data);
  };

  useEffect(() => { fetchManagers(); }, [selectedEventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setStatus(null);
    try {
      if (isEditing) {
        const { error } = await supabase.from('managers').update({
          name: formData.name, email: formData.email, access_level: formData.access_level
        }).eq('id', formData.id);
        if (error) throw error;
        setStatus({ type: 'success', msg: "Gestor atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from('managers').insert([{
          event_id: selectedEventId, name: formData.name, email: formData.email, access_level: formData.access_level
        }]);
        if (error) throw error;
        setStatus({ type: 'success', msg: "Gestor cadastrado com sucesso!" });
      }
      setFormData({ id: "", name: "", email: "", access_level: "Moderador" });
      setIsEditing(false);
      fetchManagers();
    } catch (err: any) {
      setStatus({ type: 'error', msg: "Erro: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (m: any) => {
    setFormData({ id: m.id, name: m.name || "", email: m.email || "", access_level: m.access_level || "Moderador" });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza que deseja apagar este gestor?")) return;
    await supabase.from('managers').delete().eq('id', id);
    fetchManagers();
  };

  const cancelEdit = () => {
    setFormData({ id: "", name: "", email: "", access_level: "Moderador" });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111] border border-neutral-800 rounded-2xl p-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">{isEditing ? "Editar Gestor" : "Novo Gestor de Evento"}</h2>
        <p className="text-neutral-400 mb-8 text-sm">Registe um moderador ou administrador para aceder à Sala de Controle.</p>
        
        {status && <div className={`mb-6 p-4 rounded-lg text-sm border ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>{status.msg}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isEditing && (
            <div className="bg-indigo-900/10 border border-indigo-500/20 p-4 rounded-xl mb-6">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Vincular a qual Evento? *</label>
              <select required value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500">
                <option value="">-- Selecione o Evento --</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Nome do Gestor *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Ex: Carlos Moderador" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">E-mail *</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="carlos@exemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Nível de Acesso</label>
              <select value={formData.access_level} onChange={e => setFormData({...formData, access_level: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500">
                <option value="Moderador">Moderador (Apenas Gestão de Q&A)</option>
                <option value="Admin">Administrador (Acesso Total)</option>
              </select>
            </div>
          </div>
          <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
            {isEditing && (
              <button type="button" onClick={cancelEdit} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-all">
                Cancelar
              </button>
            )}
            <button type="submit" disabled={loading || (!isEditing && !selectedEventId)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center gap-2">
              {loading ? "A Salvar..." : <><Check className="w-5 h-5" /> {isEditing ? "Salvar Alterações" : "Adicionar Gestor"}</>}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6 overflow-hidden max-w-2xl">
        <h3 className="font-semibold text-white mb-4">Gestores ({managers.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-400">
            <thead className="bg-[#1a1a1a] text-neutral-300">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Acesso</th>
                <th className="px-4 py-3 text-right rounded-tr-lg">Ações</th>
              </tr>
            </thead>
            <tbody>
              {managers.map(m => (
                <tr key={m.id} className="border-b border-neutral-800/50 hover:bg-neutral-900/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{m.name}</td>
                  <td className="px-4 py-3">{m.email}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-xs">{m.access_level}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(m)} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Apagar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {managers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">Nenhum gestor encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- MODULE: MANAGE SPONSORS ---