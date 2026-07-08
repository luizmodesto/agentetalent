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

export function RegisterSpeakerModule({ eventId: initialEventId, supabase }: { eventId: string | null, supabase: any }) {
  const [events, setEvents] = useState<any[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || "");
  const [formData, setFormData] = useState({
    id: "", name: "", specialty: "", company: "", role: "", email: "", contact: "", website: "", bio: "", photo_url: "", presentation_text: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.from('events').select('id, title').then(({ data }: any) => { if (data) setEvents(data); });
  }, [supabase]);

  useEffect(() => { if (initialEventId) setSelectedEventId(initialEventId); }, [initialEventId]);

  const fetchSpeakers = async () => {
    if (!selectedEventId) return;
    const { data } = await supabase.from('speakers').select('*, sessions(events(title))').order('created_at', { ascending: false });
    if (data) setSpeakers(data);
  };

  useEffect(() => { fetchSpeakers(); }, [selectedEventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      if (isEditing) {
        const { error } = await supabase.from('speakers').update({
          name: formData.name, role: formData.role, bio: formData.bio, specialty: formData.specialty,
          company: formData.company, email: formData.email, contact: formData.contact, website: formData.website, photo_url: formData.photo_url, presentation_text: formData.presentation_text
        }).eq('id', formData.id);
        if (error) throw error;
        setStatus({ type: 'success', msg: "Orador atualizado com sucesso!" });
      } else {
        const { data: spk, error: spkErr } = await supabase.from('speakers').insert([{
          name: formData.name, role: formData.role, bio: formData.bio, specialty: formData.specialty,
          company: formData.company, email: formData.email, contact: formData.contact, website: formData.website, photo_url: formData.photo_url, presentation_text: formData.presentation_text
        }]).select();

        if (spkErr) throw spkErr;

        if (spk && spk[0] && selectedEventId) {
          await supabase.from('sessions').insert([{
            event_id: selectedEventId, speaker_id: spk[0].id, title: `Sessão com ${formData.name}`, status: 'waiting'
          }]);
        }
        setStatus({ type: 'success', msg: "Orador cadastrado com sucesso!" });
      }

      setFormData({ id: "", name: "", specialty: "", company: "", role: "", email: "", contact: "", website: "", bio: "", photo_url: "", presentation_text: "" });
      setIsEditing(false);
      fetchSpeakers();
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', msg: "Erro: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (spk: any) => {
    setFormData({
      id: spk.id, name: spk.name || "", specialty: spk.specialty || "", company: spk.company || "", role: spk.role || "",
      email: spk.email || "", contact: spk.contact || "", website: spk.website || "", bio: spk.bio || "", photo_url: spk.photo_url || "", presentation_text: spk.presentation_text || ""
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza que deseja apagar este orador?")) return;
    await supabase.from('speakers').delete().eq('id', id);
    fetchSpeakers();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Tem a certeza que deseja apagar os ${selectedIds.length} oradores selecionados?`)) return;
    setLoading(true);
    await supabase.from('speakers').delete().in('id', selectedIds);
    setSelectedIds([]);
    fetchSpeakers();
    setLoading(false);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(speakers.map(s => s.id));
    else setSelectedIds([]);
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const cancelEdit = () => {
    setFormData({ id: "", name: "", specialty: "", company: "", role: "", email: "", contact: "", website: "", bio: "", photo_url: "", presentation_text: "" });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111] border border-neutral-800 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <User className="w-48 h-48" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">{isEditing ? "Editar Orador" : "Novo Orador"}</h2>
          <p className="text-neutral-400 mb-8 text-sm">Preencha todos os detalhes para que a IA consiga apresentar o orador com a máxima precisão.</p>
          
          {status && (
            <div className={`mb-6 p-4 rounded-lg text-sm border ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {status.msg}
            </div>
          )}

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Nome do Orador *</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ex: Dr. João Silva" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Especialidade</label>
                <input type="text" name="specialty" value={formData.specialty} onChange={handleChange} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ex: Inteligência Artificial" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Empresa</label>
                <input type="text" name="company" value={formData.company} onChange={handleChange} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ex: TechCorp" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Cargo</label>
                <input type="text" name="role" value={formData.role} onChange={handleChange} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ex: CEO / Fundador" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">E-mail</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Contacto (Telefone)</label>
                <input type="text" name="contact" value={formData.contact} onChange={handleChange} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="+351 900 000 000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Site ou LinkedIn</label>
                <input type="text" name="website" value={formData.website} onChange={handleChange} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="https://" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">URL da Foto do Orador</label>
                <div className="flex gap-3">
                  {formData.photo_url && (
                    <div className="w-12 h-12 rounded-xl border border-neutral-700 overflow-hidden shrink-0 bg-neutral-800 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                  <input type="text" name="photo_url" value={formData.photo_url} onChange={handleChange} className="flex-1 bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="https://..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5 flex justify-between">
                  <span>Resumo do Orador (Bio) *</span>
                  <span className="text-xs text-indigo-400">Fornece material para a IA!</span>
                </label>
                <textarea 
                  required
                  name="bio"
                  value={formData.bio} 
                  onChange={handleChange} 
                  rows={4}
                  className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" 
                  placeholder="Descreva o currículo do orador..." 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-400 mb-1.5 flex justify-between">
                  <span>Texto da Apresentação</span>
                  <span className="text-xs text-indigo-400">Conteúdo para a IA carregar!</span>
                </label>
                <textarea 
                  name="presentation_text"
                  value={formData.presentation_text} 
                  onChange={handleChange} 
                  rows={6}
                  className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" 
                  placeholder="Insira aqui o texto completo da apresentação do orador..." 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
              {isEditing && (
                <button type="button" onClick={cancelEdit} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-all">
                  Cancelar
                </button>
              )}
              <button 
                type="submit" 
                disabled={loading || (!isEditing && !selectedEventId)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? "A Salvar..." : <><Check className="w-5 h-5" /> {isEditing ? "Salvar Alterações" : "Cadastrar Orador e Sessão"}</>}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Oradores Cadastrados ({speakers.length})</h3>
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} disabled={loading} className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm transition-colors flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Apagar Selecionados ({selectedIds.length})
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-400">
            <thead className="bg-[#1a1a1a] text-neutral-300">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg w-10">
                  <input type="checkbox" checked={selectedIds.length === speakers.length && speakers.length > 0} onChange={handleSelectAll} className="w-4 h-4 rounded border-neutral-700 bg-[#111] text-indigo-500 focus:ring-indigo-500" />
                </th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Evento(s)</th>
                <th className="px-4 py-3">Cargo / Especialidade</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3 text-right rounded-tr-lg">Ações</th>
              </tr>
            </thead>
            <tbody>
              {speakers.map(spk => (
                <tr key={spk.id} className={`border-b border-neutral-800/50 transition-colors ${selectedIds.includes(spk.id) ? 'bg-indigo-500/5' : 'hover:bg-neutral-900/50'}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.includes(spk.id)} onChange={() => handleSelect(spk.id)} className="w-4 h-4 rounded border-neutral-700 bg-[#111] text-indigo-500 focus:ring-indigo-500" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-neutral-700 overflow-hidden shrink-0 bg-neutral-800 flex items-center justify-center">
                        {spk.photo_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={spk.photo_url} alt={spk.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-neutral-500" />
                        )}
                      </div>
                      <span className="font-medium text-white">{spk.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-indigo-400 font-medium text-xs">
                    {spk.sessions && spk.sessions.length > 0 
                      ? spk.sessions.map((s: any) => s.events?.title).filter(Boolean).join(', ') 
                      : '-'}
                  </td>
                  <td className="px-4 py-3">{spk.role} {spk.specialty ? `- ${spk.specialty}` : ''}</td>
                  <td className="px-4 py-3">{spk.company || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(spk)} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(spk.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Apagar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {speakers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Nenhum orador encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}