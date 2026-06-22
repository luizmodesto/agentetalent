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
import { createClient } from '@/utils/supabase/client';
import QRCode from "react-qr-code";
import Link from "next/link";

export default function UnifiedAdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Check mocked auth
    const token = localStorage.getItem("talent_admin_token");
    if (token === "super-admin-2026") {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-indigo-500">A carregar...</div>;
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={() => setIsAuthenticated(true)} />;
  }

  return <DashboardView onLogout={() => {
    localStorage.removeItem("talent_admin_token");
    setIsAuthenticated(false);
  }} />;
}

// --- LOGIN VIEW ---
function LoginView({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "admin@talent.com" && password === "admin123") {
      localStorage.setItem("talent_admin_token", "super-admin-2026");
      onLogin();
    } else {
      setError("Credenciais inválidas. Tente admin@talent.com / admin123");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0a0a0a] to-[#0a0a0a] pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-[#111] border border-neutral-800 rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Lock className="text-white w-8 h-8" />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">DIGITALENT</h1>
          <p className="text-neutral-400 text-sm">Painel de Administração</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1.5">E-mail</label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="admin@talent.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/20 mt-2"
          >
            Acessar Painel <LogIn className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// --- DASHBOARD VIEW ---
function DashboardView({ onLogout }: { onLogout: () => void }) {
  const [activeModule, setActiveModule] = useState<"events" | "control" | "qa" | "settings" | "manage_event" | "voice_settings" | "portals" | "register_speaker" | "register_participant" | "register_manager" | "manage_sponsors">("events");
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const supabase = createClient();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#111] border-r border-neutral-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-neutral-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
            <TerminalSquare className="text-white w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">DIGITALENT</h2>
            <p className="text-xs text-neutral-500">Super Admin</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem 
            icon={<LayoutDashboard />} 
            label="Meus Eventos" 
            active={activeModule === "events" || activeModule === "manage_event"} 
            onClick={() => setActiveModule("events")} 
          />
          <SidebarItem 
            icon={<Radio />} 
            label="Sala de Controle" 
            active={activeModule === "control"} 
            onClick={() => setActiveModule("control")} 
          />
          <SidebarItem 
            icon={<MessageSquare />} 
            label="Gestão de Q&A" 
            active={activeModule === "qa"} 
            onClick={() => setActiveModule("qa")} 
          />
          <SidebarItem 
            icon={<Mic />} 
            label="Configuração Voz IA" 
            active={activeModule === "voice_settings"} 
            onClick={() => setActiveModule("voice_settings")} 
          />
          <SidebarItem 
            icon={<ExternalLink />} 
            label="Portais do Evento" 
            active={activeModule === "portals"} 
            onClick={() => setActiveModule("portals")} 
          />
          <div className="pt-4 mt-2 border-t border-neutral-800">
             <p className="text-[10px] uppercase font-bold text-neutral-500 mb-2 px-4">Cadastros e Gestão</p>
             <SidebarItem 
               icon={<User />} 
               label="Cadastrar orador" 
               active={activeModule === "register_speaker"} 
               onClick={() => setActiveModule("register_speaker")} 
             />
             <SidebarItem 
               icon={<User />} 
               label="Cadastro de Participantes" 
               active={activeModule === "register_participant"} 
               onClick={() => setActiveModule("register_participant")} 
             />
             <SidebarItem 
               icon={<BriefcaseBusiness />} 
               label="Cadastro do Gestor do Evento" 
               active={activeModule === "register_manager"} 
               onClick={() => setActiveModule("register_manager")} 
             />
             <SidebarItem 
               icon={<BriefcaseBusiness />} 
               label="Gerenciador de Patrocinadores" 
               active={activeModule === "manage_sponsors"} 
               onClick={() => setActiveModule("manage_sponsors")} 
             />
          </div>
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors text-sm"
          >
            <LogIn className="w-4 h-4 rotate-180" /> Terminar Sessão
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-neutral-800 bg-[#111]/50 backdrop-blur-md flex items-center px-8 shrink-0">
          <h1 className="text-lg font-semibold text-white">
            {activeModule === "events" && "Gestão Global de Eventos"}
            {activeModule === "manage_event" && "Controle do Evento (Painel 3 Colunas)"}
            {activeModule === "control" && "Sala de Controle da Inteligência (Legado)"}
            {activeModule === "qa" && "Curadoria de Perguntas e Respostas"}
            {activeModule === "voice_settings" && "Configuração da Voz da IA"}
            {activeModule === "settings" && "Configurações do Evento e Oradores"}
            {activeModule === "portals" && "Acesso às Telas do Público e Orador"}
            {activeModule === "register_speaker" && "Cadastrar Orador"}
            {activeModule === "register_participant" && "Cadastro de Participantes"}
            {activeModule === "register_manager" && "Cadastro do Gestor do Evento"}
            {activeModule === "manage_sponsors" && "Gerenciador de Patrocinadores"}
          </h1>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {activeModule === "events" && <EventsModule supabase={supabase} onManageEvent={(id) => { setActiveEventId(id); setActiveModule("manage_event"); }} />}
            {activeModule === "manage_event" && <ManageEventModule eventId={activeEventId} supabase={supabase} onBack={() => setActiveModule("events")} />}
            {activeModule === "control" && <ControlRoomModule eventId={activeEventId} />}
            {activeModule === "qa" && <QAModule eventId={activeEventId} supabase={supabase} />}
            {activeModule === "voice_settings" && <VoiceSettingsModule eventId={activeEventId} supabase={supabase} />}
            {activeModule === "settings" && <SettingsModule eventId={activeEventId} supabase={supabase} />}
            {activeModule === "portals" && <PortalsModule eventId={activeEventId} supabase={supabase} />}
            {activeModule === "register_speaker" && <RegisterSpeakerModule eventId={activeEventId} supabase={supabase} />}
            {activeModule === "register_participant" && <RegisterParticipantModule eventId={activeEventId} supabase={supabase} />}
            {activeModule === "register_manager" && <RegisterManagerModule eventId={activeEventId} supabase={supabase} />}
            {activeModule === "manage_sponsors" && <ManageSponsorsModule eventId={activeEventId} supabase={supabase} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
        active 
          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
          : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white border border-transparent"
      }`}
    >
      {React.cloneElement(icon as any, { className: "w-5 h-5" })}
      {label}
    </button>
  );
}

// --- MODULE: REGISTER SPEAKER ---
function RegisterSpeakerModule({ eventId: initialEventId, supabase }: { eventId: string | null, supabase: any }) {
  const [events, setEvents] = useState<any[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || "");
  const [formData, setFormData] = useState({
    id: "", name: "", specialty: "", company: "", role: "", email: "", contact: "", website: "", bio: "", photo_url: ""
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
    // Speakers might not be directly linked to event_id in some schemas, but usually they are via sessions.
    // Assuming we fetch all speakers for simplicity, or we join with sessions.
    // If the schema for speakers doesn't have event_id, we just fetch all or we use sessions.
    // Actually, in the previous implementation, speakers didn't have event_id, they were linked via sessions!
    // Let's fetch all speakers for now.
    const { data } = await supabase.from('speakers').select('*').order('created_at', { ascending: false });
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
          company: formData.company, email: formData.email, contact: formData.contact, website: formData.website, photo_url: formData.photo_url
        }).eq('id', formData.id);
        if (error) throw error;
        setStatus({ type: 'success', msg: "Orador atualizado com sucesso!" });
      } else {
        const { data: spk, error: spkErr } = await supabase.from('speakers').insert([{
          name: formData.name, role: formData.role, bio: formData.bio, specialty: formData.specialty,
          company: formData.company, email: formData.email, contact: formData.contact, website: formData.website, photo_url: formData.photo_url
        }]).select();

        if (spkErr) throw spkErr;

        if (spk && spk[0] && selectedEventId) {
          await supabase.from('sessions').insert([{
            event_id: selectedEventId, speaker_id: spk[0].id, title: `Sessão com ${formData.name}`, status: 'active'
          }]);
        }
        setStatus({ type: 'success', msg: "Orador cadastrado com sucesso!" });
      }

      setFormData({ id: "", name: "", specialty: "", company: "", role: "", email: "", contact: "", website: "", bio: "", photo_url: "" });
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
      email: spk.email || "", contact: spk.contact || "", website: spk.website || "", bio: spk.bio || "", photo_url: spk.photo_url || ""
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
    setFormData({ id: "", name: "", specialty: "", company: "", role: "", email: "", contact: "", website: "", bio: "", photo_url: "" });
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

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">URL da Foto do Orador</label>
              <input type="text" name="photo_url" value={formData.photo_url} onChange={handleChange} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="https://..." />
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
                  <td className="px-4 py-3 font-medium text-white">{spk.name}</td>
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

// --- MODULE: REGISTER PARTICIPANT ---
function RegisterParticipantModule({ eventId: initialEventId, supabase }: { eventId: string | null, supabase: any }) {
  const [events, setEvents] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || "");
  const [formData, setFormData] = useState({ id: "", name: "", email: "", company: "", role: "", ticket_type: "Normal" });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

  useEffect(() => {
    supabase.from('events').select('id, title').then(({ data }: any) => { if (data) setEvents(data); });
  }, [supabase]);

  useEffect(() => { if (initialEventId) setSelectedEventId(initialEventId); }, [initialEventId]);

  const fetchParticipants = async () => {
    if (!selectedEventId) return;
    const { data, error } = await supabase.from('participants').select('*').eq('event_id', selectedEventId).order('created_at', { ascending: false });
    if (data) setParticipants(data);
    else if (error) console.error("Tabela de participants não encontrada:", error);
  };

  useEffect(() => { fetchParticipants(); }, [selectedEventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setStatus(null);
    try {
      if (isEditing) {
        const { error } = await supabase.from('participants').update({
          name: formData.name, email: formData.email, company: formData.company, role: formData.role, ticket_type: formData.ticket_type
        }).eq('id', formData.id);
        if (error) throw error;
        setStatus({ type: 'success', msg: "Participante atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from('participants').insert([{
          event_id: selectedEventId, name: formData.name, email: formData.email, company: formData.company, role: formData.role, ticket_type: formData.ticket_type
        }]);
        if (error) throw error;
        setStatus({ type: 'success', msg: "Participante cadastrado com sucesso!" });
      }
      setFormData({ id: "", name: "", email: "", company: "", role: "", ticket_type: "Normal" });
      setIsEditing(false);
      fetchParticipants();
    } catch (err: any) {
      setStatus({ type: 'error', msg: "Erro: " + err.message + " (Criou a tabela?)" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p: any) => {
    setFormData({
      id: p.id, name: p.name || "", email: p.email || "", company: p.company || "", role: p.role || "", ticket_type: p.ticket_type || "Normal"
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza que deseja apagar este participante?")) return;
    await supabase.from('participants').delete().eq('id', id);
    fetchParticipants();
  };

  const cancelEdit = () => {
    setFormData({ id: "", name: "", email: "", company: "", role: "", ticket_type: "Normal" });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111] border border-neutral-800 rounded-2xl p-8 max-w-2xl relative">
        <h2 className="text-2xl font-bold text-white mb-2">{isEditing ? "Editar Participante" : "Novo Participante"}</h2>
        <p className="text-neutral-400 mb-8 text-sm">Registe ou altere um participante do evento.</p>
        
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Nome Completo *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Ex: Maria Santos" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">E-mail *</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="maria@exemplo.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Empresa</label>
              <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Ex: Acme Corp" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Cargo</label>
              <input type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Ex: Designer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Tipo de Bilhete</label>
              <select value={formData.ticket_type} onChange={e => setFormData({...formData, ticket_type: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500">
                <option value="Normal">Normal</option>
                <option value="VIP">VIP</option>
                <option value="Press">Imprensa</option>
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
              {loading ? "A Salvar..." : <><Check className="w-5 h-5" /> {isEditing ? "Salvar Alterações" : "Adicionar Participante"}</>}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6 overflow-hidden max-w-5xl">
        <h3 className="font-semibold text-white mb-4">Participantes ({participants.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-400">
            <thead className="bg-[#1a1a1a] text-neutral-300">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Empresa / Cargo</th>
                <th className="px-4 py-3 text-right rounded-tr-lg">Ações</th>
              </tr>
            </thead>
            <tbody>
              {participants.map(p => (
                <tr key={p.id} className="border-b border-neutral-800/50 hover:bg-neutral-900/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3">{p.company} {p.role ? `- ${p.role}` : ''}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(p)} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Apagar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">Nenhum participante encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- MODULE: REGISTER EVENT MANAGER ---
function RegisterManagerModule({ eventId: initialEventId, supabase }: { eventId: string | null, supabase: any }) {
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
function ManageSponsorsModule({ eventId: initialEventId, supabase }: { eventId: string | null, supabase: any }) {
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
function ManageEventModule({ eventId, supabase, onBack }: { eventId: string | null, supabase: any, onBack: () => void }) {
  const [eventConfig, setEventConfig] = useState<any>({ max_questions: 3 });
  const [activeQueue, setActiveQueue] = useState<any[]>([]);
  const [logs, setLogs] = useState<{time: string, msg: string}[]>([
    { time: new Date().toLocaleTimeString('pt-PT'), msg: "Sala de Controle Inicializada. Ligando ao Supabase..." }
  ]);
  const [loading, setLoading] = useState(true);
  
  // New States
  const [speakersList, setSpeakersList] = useState<any[]>([]);
  const [teleprompterMsg, setTeleprompterMsg] = useState("");
  const [managerName, setManagerName] = useState<string>("A procurar gestor...");

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('pt-PT');
    setLogs(prev => [{ time, msg }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    if (!eventId) return;

    const fetchInitialData = async () => {
      setLoading(true);
      const { data } = await supabase.from('events').select('personality').eq('id', eventId).single();
      if (data?.personality) {
        try { 
          const parsed = JSON.parse(data.personality);
          setEventConfig({ ...parsed, max_questions: parsed.max_questions || 3 }); 
        } catch(e) {
          setEventConfig({ max_questions: 3 });
        }
      } else {
        setEventConfig({ max_questions: 3 });
      }
      
      // Fetch Speakers via sessions
      const { data: sessionsData } = await supabase.from('sessions').select('*, speaker:speakers(*)').eq('event_id', eventId).order('created_at', { ascending: true });
      if (sessionsData) {
         setSpeakersList(sessionsData.map((s:any) => s.speaker).filter(Boolean));
      }

      // Fetch Manager Name
      const { data: managerData } = await supabase.from('managers').select('name').eq('event_id', eventId).limit(1).maybeSingle();
      if (managerData?.name) {
         setManagerName(managerData.name);
      } else {
         setManagerName("Gestor não atribuído");
      }
      
      await fetchQuestions();
      setLoading(false);
      addLog("Sincronização concluída.");
    };

    fetchInitialData();

    const eventSub = supabase.channel('event_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, (payload: any) => {
         if(payload.new.personality) {
           try { 
             const parsed = JSON.parse(payload.new.personality);
             setEventConfig((prev: any) => ({...prev, ...parsed, max_questions: parsed.max_questions || prev.max_questions})); 
           } catch(e){}
         }
      }).subscribe();

    const questionsSub = supabase.channel('questions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
         fetchQuestions();
      }).subscribe();

    return () => {
      supabase.removeChannel(eventSub);
      supabase.removeChannel(questionsSub);
    };
  }, [eventId]);

  const fetchQuestions = async () => {
    const { data: sessions } = await supabase.from('sessions').select('id').eq('event_id', eventId);
    if (!sessions || sessions.length === 0) return;
    const sessionIds = sessions.map((s: any) => s.id);
    const { data: approved } = await supabase.from('questions')
      .select('*')
      .in('session_id', sessionIds)
      .in('status', ['approved', 'active'])
      .order('created_at', { ascending: true });
    if (approved) setActiveQueue(approved);
  };

  const updatePhase = async (phase: string) => {
    const newConfig = { ...eventConfig, current_phase: phase };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(`Fase alterada para: ${phase}`);
  };

  const updateMacroState = async (state: string) => {
    const predefinedText = eventConfig?.macro_texts?.[state];
    const alertUpdate = predefinedText ? { 
      teleprompter_alert: predefinedText, 
      teleprompter_alert_time: Date.now(),
      ai_force_speak: { text: predefinedText, time: Date.now() }
    } : {};
    
    const newConfig = { ...eventConfig, macro_state: state, ...alertUpdate };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    
    addLog(`Macro-Estado disparado: ${state}`);
    if (predefinedText) {
      addLog(`Mensagem da IA enviada: ${state}`);
    }
  };

  const triggerNextQuestion = async () => {
    const nextQ = activeQueue.find(q => q.status === 'approved');
    if (!nextQ) {
      addLog("Fila vazia: não há perguntas aprovadas.");
      return;
    }
    const currentActive = activeQueue.find(q => q.status === 'active');
    if (currentActive) {
      await supabase.from('questions').update({ status: 'completed' }).eq('id', currentActive.id);
    }
    await supabase.from('questions').update({ status: 'active' }).eq('id', nextQ.id);
    
    addLog(`Próxima Pergunta em palco: "${nextQ.content}"`);
    
    const newConfig = { ...eventConfig, kill_audio: false, pause_audio: false };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const triggerIntroQA = async () => {
    addLog("Comando: Iniciar Bloco Q&A!");
    const newConfig = { ...eventConfig, kill_audio: false, pause_audio: false };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const killAudio = async () => {
    addLog("EMERGÊNCIA: Comando de Mutar IA enviado!");
    const newConfig = { ...eventConfig, kill_audio: true };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const pauseAudio = async () => {
    addLog("Comando: Pausar IA");
    const newConfig = { ...eventConfig, pause_audio: true };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const resumeAudio = async () => {
    addLog("Comando: Continuar IA");
    const newConfig = { ...eventConfig, pause_audio: false, kill_audio: false };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
  };

  const changeSlideIndex = async (increment: boolean) => {
    const currentIndex = eventConfig.current_slide_index || 0;
    const newIndex = increment ? currentIndex + 1 : Math.max(0, currentIndex - 1);
    
    const newConfig = { ...eventConfig, current_slide_index: newIndex };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(`Slide alterado manualmente para: ${newIndex + 1}`);
  };

  const toggleSliderMode = async () => {
    const newState = !eventConfig?.slider_mode_active;
    const newConfig = { ...eventConfig, slider_mode_active: newState };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(`Modo Slider alterado para: ${newState ? 'ATIVO' : 'INATIVO'}`);
  };

  const updateMaxQuestions = async (val: number) => {
    const newConfig = { ...eventConfig, max_questions: val };
    setEventConfig(newConfig);
    await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
    addLog(`Limite de perguntas da IA alterado para: ${val}`);
  };

  const sendTeleprompterAlert = async () => {
    if(!teleprompterMsg.trim()) return;
    try {
      const newConfig = { ...eventConfig, teleprompter_alert: teleprompterMsg, teleprompter_alert_time: Date.now() };
      setEventConfig(newConfig);
      
      const { error } = await supabase.from('events').update({ personality: JSON.stringify(newConfig) }).eq('id', eventId);
      
      if (error) {
        console.error("Supabase Error:", error);
        alert("Erro ao enviar para a base de dados: " + error.message);
        addLog("Erro ao enviar alerta.");
        return;
      }
      
      addLog(`Alerta de Palco Enviado: ${teleprompterMsg}`);
      setTeleprompterMsg("");
    } catch (err: any) {
      console.error("App Error:", err);
      alert("Erro na aplicação: " + err.message);
    }
  };

  if (!eventId) return <div className="text-white">Nenhum evento selecionado.</div>;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-neutral-400 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">Live Controller (ID: {eventId.substring(0, 8)}...)</h2>
            <p className="text-sm text-neutral-500">Gestão ao vivo da palestra e interação com a Inteligência Artificial.</p>
          </div>
        </div>
        
        <div className="font-bold text-white text-lg tracking-wide hidden md:block">
           {managerName}
        </div>

        <div className="flex gap-3">
          <button 
             onClick={() => window.location.reload()}
             className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
             Reiniciar sistema
          </button>
          <a 
            href={`/event/${eventId}/live`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir Ecrã do Evento
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* COLUNA 1: SEQUÊNCIA ORADORES & CONFIGURAÇÃO IA */}
        <div className="space-y-6 flex flex-col h-full">
          <div className="bg-[#1C202E] border border-neutral-800/50 rounded-2xl p-5 shadow-xl flex-1 flex flex-col">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-neutral-400" /> Sequência Oradores
            </h3>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-4">Abra o orador atual em verde, feche em vermelho.</p>
            
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
               {speakersList.length === 0 ? (
                 <div className="text-xs text-neutral-500 p-3 text-center border border-dashed border-neutral-800 rounded-lg">Nenhum orador cadastrado</div>
               ) : (
                 speakersList.map((spk, idx) => {
                   const isActive = idx === 0; // Temporário, lógica a implementar
                   return (
                     <div key={spk.id} className="flex gap-2 items-center">
                       <span className="font-black text-xl text-white w-6">{idx + 1}</span>
                       <button className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold text-left truncate transition-all ${isActive ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-black shadow-lg shadow-emerald-500/20' : 'bg-gradient-to-r from-orange-500 to-orange-400 text-black shadow-lg shadow-orange-500/20'}`}>
                         {spk.name}
                       </button>
                     </div>
                   );
                 })
               )}
            </div>
          </div>

          <div className="bg-[#1C202E] border border-neutral-800/50 rounded-2xl p-5 shadow-xl">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-rose-400" /> Configura Voz IA
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-2">Qtd. de Perguntas para IA selecionar</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" min="1" max="10" step="1" 
                    value={eventConfig.max_questions || 3} 
                    onChange={(e) => updateMaxQuestions(parseInt(e.target.value))}
                    className="flex-1 accent-indigo-500" 
                  />
                  <span className="text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-md text-sm">{eventConfig.max_questions || 3}</span>
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">A IA fará a curadoria automática deste número exato de perguntas da plateia.</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Voz da IA (Idioma Base: PT-PT)</label>
                <select className="w-full bg-[#131620] border border-neutral-700/50 text-white font-medium rounded-md px-3 py-2 text-xs focus:outline-none focus:border-indigo-500">
                  <option>Nova (Feminina)</option>
                  <option>Onyx (Masculina)</option>
                  <option>Shimmer (Feminina)</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 border-t border-neutral-800 pt-3">
              <Link href={`/event/${eventId}/admin`} className="flex items-center justify-between group">
                <span className="text-xs text-neutral-300 font-medium flex items-center gap-2"><Settings className="w-4 h-4"/> Configuração da Voz da IA</span>
                <ArrowLeft className="w-4 h-4 rotate-180 text-neutral-500 group-hover:text-white transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* COLUNA 2: GESTÃO DA PALESTRA E QR CODE */}
        <div className="space-y-6 flex flex-col h-full">
          <div className="bg-[#1C202E] border border-indigo-500/30 rounded-2xl p-5 shadow-xl flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Activity className="w-24 h-24" /></div>
            
            <h3 className="font-semibold text-white mb-6 flex items-center gap-2 relative z-10">
              <Mic className="w-5 h-5 text-indigo-400" /> Gestão da Palestra
            </h3>
            
            <div className="mb-6 relative z-10">
               <h4 className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-3">1. Fase do Evento</h4>
               
               <button className="w-full bg-gradient-to-r from-orange-500 to-orange-400 text-black font-bold py-2 rounded-lg mb-2 text-sm shadow-lg shadow-orange-500/20">
                 Play List Musicas
               </button>

               <div className="grid grid-cols-2 gap-2">
                 {["Abertura", "Intervalo", "Q&A", "Fim"].map((phase) => {
                   const isActive = eventConfig?.current_phase === phase || (!eventConfig?.current_phase && phase === "Abertura");
                   return (
                     <button 
                       key={phase} onClick={() => updatePhase(phase)}
                       className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                         isActive ? "bg-indigo-600 text-white" : "bg-[#131620] text-neutral-400 hover:bg-neutral-800 border border-neutral-800/50"
                       }`}
                     >
                       {phase}
                     </button>
                   )
                 })}
               </div>
            </div>

            <div className="flex-1 space-y-4 relative z-10">
               <h4 className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-3">2. Comandos de Áudio da IA</h4>
               
               <div className="grid grid-cols-2 gap-2">
                 <button onClick={triggerIntroQA} className="col-span-2 bg-gradient-to-r from-indigo-600/20 to-indigo-900/20 border border-indigo-500/30 hover:border-indigo-500 p-3 rounded-xl flex items-center gap-3 transition-all group">
                   <PlayCircle className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                   <div className="text-left">
                     <h5 className="text-white font-medium text-sm">Iniciar Q&A</h5>
                     <p className="text-[10px] text-indigo-200/50">Dar as boas-vindas</p>
                   </div>
                 </button>

                 <button onClick={triggerNextQuestion} className="col-span-2 bg-[#131620] border border-emerald-500/20 hover:border-emerald-500/50 p-3 rounded-xl flex items-center gap-3 transition-all group">
                   <FastForward className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                   <div className="text-left">
                     <h5 className="text-white font-medium text-sm">Próxima Pergunta</h5>
                     <p className="text-[10px] text-emerald-200/50">Avança fila ativa</p>
                   </div>
                 </button>

                 <button onClick={pauseAudio} className="bg-[#131620] border border-amber-500/20 hover:border-amber-500/50 p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all">
                   <Pause className="w-4 h-4 text-amber-400" />
                   <span className="text-[11px] font-medium text-neutral-300">Pausar Voz</span>
                 </button>

                 <button onClick={resumeAudio} className="bg-[#131620] border border-sky-500/20 hover:border-sky-500/50 p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all">
                   <Play className="w-4 h-4 text-sky-400" />
                   <span className="text-[11px] font-medium text-neutral-300">Continuar</span>
                 </button>
               </div>

               <button onClick={killAudio} className="w-full mt-3 bg-red-900/20 border border-red-500/30 hover:bg-red-500 hover:text-white p-3 rounded-xl flex items-center justify-center gap-2 transition-all text-red-400 group">
                 <MicOff className="w-4 h-4 group-hover:animate-pulse" />
                 <span className="font-bold text-xs uppercase tracking-wider">Mutar IA (Stop)</span>
               </button>
            </div>

            <div className="flex-1 space-y-4 relative z-10 pt-4 border-t border-neutral-800/50">
               <h4 className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <MonitorPlay className="w-4 h-4" /> 3. Controlo Manual de Slides
               </h4>
               
               <button onClick={toggleSliderMode} className={`w-full p-3 rounded-xl flex items-center justify-center gap-2 transition-all group border ${eventConfig?.slider_mode_active ? 'bg-emerald-900/20 border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300' : 'bg-[#131620] border-neutral-700 hover:border-emerald-500/50 hover:bg-emerald-900/10 text-neutral-400 hover:text-emerald-400'}`}>
                 <MonitorPlay className={`w-4 h-4 ${eventConfig?.slider_mode_active ? 'animate-pulse' : ''}`} />
                 <span className="font-bold text-xs uppercase tracking-wider">
                   {eventConfig?.slider_mode_active ? 'Modo Slider: ATIVO' : 'Ativar Modo Slider'}
                 </span>
               </button>

               <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => changeSlideIndex(false)} className="bg-[#131620] border border-neutral-700 hover:border-indigo-500 hover:text-indigo-400 text-neutral-400 p-2 rounded-xl flex items-center justify-center gap-2 transition-all">
                   <span className="text-xs font-bold uppercase tracking-wider">&larr; Anterior</span>
                 </button>
                 <button onClick={() => changeSlideIndex(true)} className="bg-[#131620] border border-neutral-700 hover:border-indigo-500 hover:text-indigo-400 text-neutral-400 p-2 rounded-xl flex items-center justify-center gap-2 transition-all">
                   <span className="text-xs font-bold uppercase tracking-wider">Próximo &rarr;</span>
                 </button>
               </div>
            </div>
          </div>

          <div className="bg-[#1C202E] border border-neutral-800/50 rounded-2xl p-5 shadow-xl">
             <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-4 h-4 text-neutral-400" />
                <h4 className="text-sm font-semibold text-white">Perguntas ao Orador</h4>
             </div>
             <p className="text-[10px] text-neutral-500 mb-4">Protótipo para palestras com QR Code e IA mediadora</p>
             
             <div className="flex items-center gap-4 bg-[#131620] border border-neutral-800 p-3 rounded-xl">
                <button className="flex-1 text-left flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors">
                  <LinkIcon className="w-3 h-3"/> Link Perguntas abertas
                </button>
                <div className="bg-white p-1 rounded-lg shrink-0">
                   {/* QR Code */}
                   {typeof window !== 'undefined' && <QRCode value={`${window.location.origin}/event/${eventId}/join`} size={48} />}
                </div>
             </div>
          </div>
        </div>

        {/* COLUNA 3: FILA ATIVA, LOGS E TELEPROMPTER */}
        <div className="space-y-6 flex flex-col h-full">
          <div className="bg-[#1C202E] border border-neutral-800/50 rounded-2xl p-5 shadow-xl flex flex-col h-[250px]">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Fila em Palco
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-800 bg-[#131620] rounded-xl border border-neutral-800/50 p-2">
              {activeQueue.length === 0 ? (
                <div className="text-xs text-neutral-500 h-full flex items-center justify-center text-center">
                  Fila vazia. Aprove no Curador.
                </div>
              ) : (
                activeQueue.map((q) => (
                  <div key={q.id} className={`p-2 mb-2 rounded-lg border flex flex-col gap-1 ${q.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#1a1a24] border-neutral-800/50'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold ${q.status === 'active' ? 'text-emerald-400' : 'text-neutral-300'}`}>{q.author_name}</span>
                      {q.status === 'active' && <span className="flex items-center gap-1 text-[8px] text-emerald-400 uppercase bg-emerald-500/20 px-1.5 py-0.5 rounded-full"><Radio className="w-2 h-2"/> Active</span>}
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-tight">{q.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#1C202E] border border-neutral-800/50 rounded-2xl p-5 shadow-xl flex flex-col flex-1 min-h-[200px]">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <TerminalSquare className="w-4 h-4 text-neutral-500" /> System Logs
            </h3>
            <div className="flex-1 bg-[#0f0f13] border border-neutral-800 rounded-xl p-3 overflow-y-auto space-y-2 text-[10px] font-mono scrollbar-thin scrollbar-thumb-neutral-800">
              {logs.map((log, i) => (
                <div key={i} className="flex flex-col gap-0.5 border-l-2 border-neutral-800 pl-2 py-0.5">
                  <span className="text-neutral-600">[{log.time}]</span>
                  <span className={
                    log.msg.includes("EMERGÊNCIA") ? "text-red-400" :
                    log.msg.includes("Comando") ? "text-indigo-400" : 
                    "text-emerald-400"
                  }>
                    {log.msg}
                  </span>
                </div>
              ))}
              <div className="animate-pulse flex gap-2 text-emerald-500/50 pt-1">
                 <TerminalSquare className="w-3 h-3" /> <span>Idle...</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1C202E] border border-neutral-800/50 rounded-2xl p-5 shadow-xl">
            <h4 className="text-[11px] text-white mb-2 font-medium">Mensagem de Alerta para aparecer no teleprompt na hora</h4>
            <div className="bg-[#131620] border border-neutral-800 rounded-xl p-2 relative">
               <textarea 
                  rows={2} 
                  value={teleprompterMsg}
                  onChange={(e) => setTeleprompterMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendTeleprompterAlert();
                    }
                  }}
                  className="w-full bg-transparent text-white text-xs resize-none focus:outline-none placeholder-neutral-600" 
                  placeholder="Escreva aqui uma mensagem... (Pressione Enter para enviar)"
               />
               <div className="flex justify-between items-center mt-2">
                 <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-xs">Evento:</span>
                    <span className="bg-teal-500/20 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">Online</span>
                 </div>
                 <button onClick={sendTeleprompterAlert} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors">
                   enviar
                 </button>
               </div>
            </div>
          </div>
        </div>

        {/* COLUNA 4: MENSAGENS IA & MULTIMEDIA */}
        <div className="space-y-6 flex flex-col h-full">
           <div className="bg-[#1C202E] border border-neutral-800/50 rounded-2xl p-5 shadow-xl">
             <h3 className="font-semibold text-white mb-4">Mensagens da IA</h3>
             
             <div className="space-y-3">
                {["Abertura", "Apresentação Equipa", "Cordenadores", "Almoço", "Digital Networking", "Encerramento"].map((macro) => {
                  const isActiveMacro = eventConfig?.macro_state === macro;
                  return (
                    <button 
                      key={macro} 
                      onClick={() => updateMacroState(macro)}
                      className={`w-full hover:opacity-90 font-bold py-2 px-4 rounded-xl text-lg text-center transition-all shadow-lg ${isActiveMacro ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-black shadow-emerald-500/20' : 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-500/20'}`}
                    >
                      {macro}
                    </button>
                  );
                })}
             </div>
           </div>

           <div className="bg-[#1C202E] border border-neutral-800/50 rounded-2xl shadow-xl flex-1 overflow-hidden relative group cursor-pointer flex items-center justify-center min-h-[200px]">
              <div className="absolute inset-0 bg-gradient-to-b from-sky-400/20 to-emerald-400/20"></div>
              <div className="relative z-10 text-center">
                 <MonitorPlay className="w-12 h-12 text-white/50 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                 <span className="text-white/50 text-xs font-medium">Preview Palco</span>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

// --- MODULE: EVENTS ---
function EventsModule({ supabase, onManageEvent }: { supabase: any, onManageEvent: (id: string) => void }) {
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
function ControlRoomModule({ eventId }: { eventId: string | null }) {
  const [eventPhase, setEventPhase] = useState("Abertura");
  const [logs, setLogs] = useState<{time: string, msg: string}[]>([
    { time: "18:00:01", msg: "Agente iniciado. Carregando modelo pt-BR_onyx." },
    { time: "18:00:05", msg: "Aguardando gatilho do apresentador..." }
  ]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('pt-PT');
    setLogs(prev => [...prev, { time, msg }]);
  };

  const handleCommand = (cmd: string) => {
    addLog(`Comando enviado: "${cmd}"`);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        {/* EVENT STATE */}
        <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-neutral-400 text-sm font-medium mb-4 uppercase tracking-wider">Estado do Evento</h3>
          <div className="flex gap-2 flex-wrap">
            {["Abertura", "Orador Atual", "Bloco de Perguntas", "Encerramento"].map(phase => (
              <button 
                key={phase}
                onClick={() => { setEventPhase(phase); addLog(`Fase alterada para: ${phase}`); }}
                className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  eventPhase === phase 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                    : "bg-[#1a1a1a] text-neutral-400 hover:bg-neutral-800 border border-neutral-800"
                }`}
              >
                {phase}
              </button>
            ))}
          </div>
        </div>

        {/* TRIGGERS */}
        <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-neutral-400 text-sm font-medium mb-4 uppercase tracking-wider flex items-center gap-2">
            <Mic className="w-4 h-4" /> Gatilhos de Comando (Teleprompter)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => handleCommand("Digitalent, vamos às perguntas")} className="group bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-neutral-800 hover:border-indigo-500/50 p-5 rounded-xl text-left transition-all relative overflow-hidden">
              <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <PlayCircle className="w-6 h-6 text-indigo-400 mb-3" />
              <h4 className="font-semibold text-white mb-1">Iniciar Bloco Q&A</h4>
              <p className="text-xs text-neutral-500">Faz a DIGITALENT abrir a sessão de perguntas com uma fala de impacto.</p>
            </button>
            
            <button onClick={() => handleCommand("Próxima pergunta")} className="group bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-neutral-800 hover:border-emerald-500/50 p-5 rounded-xl text-left transition-all relative overflow-hidden">
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <MessageSquare className="w-6 h-6 text-emerald-400 mb-3" />
              <h4 className="font-semibold text-white mb-1">Próxima Pergunta</h4>
              <p className="text-xs text-neutral-500">Chama a próxima pergunta aprovada na fila de espera.</p>
            </button>
          </div>
        </div>

        {/* TELAS DO EVENTO */}
        <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-neutral-400 text-sm font-medium mb-4 uppercase tracking-wider flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Acesso às Telas do Evento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/event/00000000-0000-0000-0000-000000000001/live" target="_blank" className="group bg-gradient-to-br from-purple-900/20 to-[#111] border border-purple-500/30 hover:border-purple-500 p-5 rounded-xl text-left transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <MonitorPlay className="w-6 h-6 text-purple-400 mb-3" />
                <h4 className="font-semibold text-white mb-1">Painel do Palestrante</h4>
                <p className="text-xs text-neutral-500">Abre a tela que fica no palco para o orador interagir com a IA (Teleprompter).</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-purple-400 group-hover:translate-x-1 transition-transform">
                Abrir em nova aba <ExternalLink className="w-3 h-3" />
              </div>
            </a>
            
            <a href="/event/00000000-0000-0000-0000-000000000001/join" target="_blank" className="group bg-gradient-to-br from-emerald-900/20 to-[#111] border border-emerald-500/30 hover:border-emerald-500 p-5 rounded-xl text-left transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <Smartphone className="w-6 h-6 text-emerald-400 mb-3" />
                <h4 className="font-semibold text-white mb-1">Tela do Público (Q&A)</h4>
                <p className="text-xs text-neutral-500">Abre a interface do celular onde a audiência envia perguntas para o sistema.</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-400 group-hover:translate-x-1 transition-transform">
                Abrir em nova aba <ExternalLink className="w-3 h-3" />
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* TERMINAL / LOGS */}
      <div className="bg-[#0f0f13] border border-neutral-800 rounded-2xl p-6 flex flex-col h-[500px] xl:h-auto font-mono">
        <h3 className="text-neutral-500 text-xs mb-4 uppercase flex items-center gap-2">
          <TerminalSquare className="w-4 h-4" /> DIGITALENT System Output
        </h3>
        <div className="flex-1 overflow-y-auto space-y-2 text-sm">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3 text-neutral-400">
              <span className="text-neutral-600 shrink-0">[{log.time}]</span>
              <span className={log.msg.includes("Comando") ? "text-indigo-400" : "text-emerald-500"}>
                {log.msg}
              </span>
            </div>
          ))}
          <div className="animate-pulse flex gap-2 text-neutral-600">
            <span>_</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MODULE B: QA MANAGEMENT ---
function QAModule({ eventId, supabase }: { eventId: string | null, supabase: any }) {
  if (!eventId) return <div className="text-white">Selecione um evento na aba 'Meus Eventos' primeiro.</div>;

  const [rawQuestions, setRawQuestions] = useState<any[]>([]);
  const [activeQueue, setActiveQueue] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [fastAssistCache, setFastAssistCache] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchQuestions();
    
    // Realtime subscription na tabela questions
    const channel = supabase.channel('questions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, (payload: any) => {
        fetchQuestions(); // Simples re-fetch para garantir integridade, em vez de manipular array local
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Hook para invocar o fast-assist automaticamente nas novas perguntas brutas
  useEffect(() => {
    rawQuestions.forEach(async (q) => {
      if (!fastAssistCache[q.id]) {
         setFastAssistCache(prev => ({ ...prev, [q.id]: { loading: true } }));
         try {
           const res = await fetch('/api/ai/fast-assist', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ question: q.content })
           });
           const data = await res.json();
           if (data.refined_question) {
             setFastAssistCache(prev => ({ ...prev, [q.id]: { loading: false, data } }));
           } else {
             setFastAssistCache(prev => ({ ...prev, [q.id]: { loading: false, error: true } }));
           }
         } catch(e) {
             setFastAssistCache(prev => ({ ...prev, [q.id]: { loading: false, error: true } }));
         }
      }
    });
  }, [rawQuestions, fastAssistCache]);

  const fetchQuestions = async () => {
    setLoading(true);
    // Primeiro, pegar as sessões do evento
    const { data: sessions } = await supabase.from('sessions').select('id').eq('event_id', eventId);
    if (!sessions || sessions.length === 0) {
      setLoading(false);
      return;
    }
    
    const sessionIds = sessions.map((s: any) => s.id);
    
    // Pegar perguntas pendentes (Inbox)
    const { data: pending } = await supabase.from('questions')
      .select('*').in('session_id', sessionIds).eq('status', 'pending').order('created_at', { ascending: false });
    
    // Pegar perguntas aprovadas (Fila)
    const { data: approved } = await supabase.from('questions')
      .select('*').in('session_id', sessionIds).eq('status', 'approved').order('created_at', { ascending: true });
      
    if (pending) setRawQuestions(pending);
    if (approved) setActiveQueue(approved);
    setLoading(false);
  };

  const handleApprove = async (q: any) => {
    const fastData = fastAssistCache[q.id]?.data;
    
    // Traz tags de tom/ritmo do evento
    let tone = "Corporativo";
    let rhythm = "Natural";
    const { data: eventData } = await supabase.from('events').select('personality').eq('id', eventId).single();
    if (eventData?.personality) {
      try {
        const config = JSON.parse(eventData.personality);
        if (config.openai_tone) tone = config.openai_tone;
        if (config.openai_rhythm) rhythm = config.openai_rhythm;
      } catch(e) {}
    }

    if (fastData) {
      const metadata = JSON.stringify({ 
         openai_tone: tone, 
         openai_rhythm: rhythm
      });

      await supabase.from('questions').update({ 
        status: 'approved',
        content: fastData.refined_question,
        context: metadata,
        suggested_answer: fastData.short_answer,
        transition: fastData.speaker_start
      }).eq('id', q.id);
    } else {
      await supabase.from('questions').update({ status: 'approved' }).eq('id', q.id);
    }
    fetchQuestions();
  };

  const handleReject = async (id: number) => {
    await supabase.from('questions').update({ status: 'rejected' }).eq('id', id);
    fetchQuestions();
  };

  const processWithAI = async () => {
    if (rawQuestions.length === 0) return;
    setIsProcessingAI(true);
    try {
      const res = await fetch('/api/event-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      });
      const data = await res.json();
      if (data.success) {
        alert("Inteligência Artificial processou as perguntas com sucesso!");
        fetchQuestions();
      } else {
        alert("Erro na IA: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Falha de conexão com a DIGITALENT.");
    }
    setIsProcessingAI(false);
  };

  const simulateIncoming = async () => {
    if (!newQuestion.trim()) return;
    
    // Pega a primeira sessão do evento para vincular a pergunta
    const { data: sessions } = await supabase.from('sessions').select('id').eq('event_id', eventId).limit(1);
    if (!sessions || sessions.length === 0) {
      alert("Crie primeiro uma Sessão para este evento na aba de Controle/Configurações.");
      return;
    }

    await supabase.from('questions').insert([
      { session_id: sessions[0].id, content: newQuestion, author_name: "Admin (Simulado)", status: "pending" }
    ]);
    
    setNewQuestion("");
    fetchQuestions();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* INBOX */}
      <div className="bg-[#111] border border-neutral-800 rounded-2xl flex flex-col h-[700px]">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Inbox / Filtragem ({rawQuestions.length})
          </h3>
          <button 
            onClick={processWithAI} 
            disabled={isProcessingAI || rawQuestions.length === 0}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            <Bot className="w-4 h-4" /> 
            {isProcessingAI ? "Processando com DIGITALENT..." : "Processar com DIGITALENT"}
          </button>
        </div>
        
        <div className="p-4 border-b border-neutral-800 bg-[#1a1a1a]">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              placeholder="Simular pergunta da plateia..."
              className="flex-1 bg-[#111] border border-neutral-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              onKeyDown={e => e.key === "Enter" && simulateIncoming()}
            />
            <button onClick={simulateIncoming} className="bg-neutral-800 hover:bg-neutral-700 p-2 rounded-lg text-white">
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-center text-neutral-500 mt-4">Carregando perguntas...</p>}
          {!loading && rawQuestions.map(q => (
            <div key={q.id} className="bg-[#1a1a1a] border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-white mb-2">&quot;{q.content}&quot;</p>
                <span className="text-xs text-neutral-500">De: {q.author_name}</span>
                {q.ai_score && <span className="ml-2 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">Score IA: {q.ai_score}/10</span>}
                
                {fastAssistCache[q.id]?.loading && (
                   <div className="mt-2 text-xs text-indigo-400 animate-pulse flex items-center gap-1">
                      <Bot className="w-3 h-3" /> Reformulando (Fast-Assist)...
                   </div>
                )}
                {fastAssistCache[q.id]?.data && (
                   <div className="mt-3 bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-lg">
                      <p className="text-xs text-indigo-300 font-semibold mb-1">Versão Reformulada/Mais Forte:</p>
                      <p className="text-sm text-white italic">{fastAssistCache[q.id].data.refined_question}</p>
                   </div>
                )}
              </div>
              <div className="flex sm:flex-col items-end gap-2 shrink-0">
                <button onClick={() => handleApprove(q)} className="w-full px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> Aprovar
                </button>
                <div className="flex gap-2 w-full">
                  <button className="flex-1 flex justify-center p-1.5 text-neutral-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors" title="Editar">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleReject(q.id)} className="flex-1 flex justify-center p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!loading && rawQuestions.length === 0 && (
            <div className="text-center text-neutral-500 text-sm mt-10">
              Nenhuma pergunta pendente.
            </div>
          )}
        </div>
      </div>

      {/* ACTIVE QUEUE */}
      <div className="bg-[#111] border border-neutral-800 rounded-2xl flex flex-col h-[700px]">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-emerald-500" />
            Fila de Espera Ativa ({activeQueue.length})
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeQueue.map((q, i) => (
            <div key={q.id} className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex gap-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
              <div className="flex flex-col items-center justify-center bg-indigo-500/10 text-indigo-400 font-bold rounded-lg w-10 h-10 shrink-0">
                {i + 1}
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">{q.content}</p>
                <span className="text-xs text-neutral-500">De: {q.author_name}</span>
              </div>
            </div>
          ))}
          {activeQueue.length === 0 && (
            <div className="text-center text-neutral-500 text-sm mt-10">
              A fila está vazia. Aprova perguntas para enviá-las a DIGITALENT.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- MODULE: VOICE SETTINGS (ELEVENLABS + NATIVE) ---
function VoiceSettingsModule({ eventId, supabase }: { eventId: string | null, supabase: any }) {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [ttsProvider, setTtsProvider] = useState<"elevenlabs" | "fishaudio" | "native" | "openai">("native");
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [voiceId, setVoiceId] = useState(""); // ElevenLabs Voice ID ou Native Voice Name
  const [fishApiKey, setFishApiKey] = useState("");
  const [fishReferenceId, setFishReferenceId] = useState("");
  const [language, setLanguage] = useState("pt-PT");
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [gender, setGender] = useState("male");
  const [openaiVoice, setOpenaiVoice] = useState("onyx");
  const [openaiTone, setOpenaiTone] = useState("Corporativo Premium");
  const [openaiRhythm, setOpenaiRhythm] = useState("Cadenciado com Pausas (Formal)");
  const [openaiStorytelling, setOpenaiStorytelling] = useState(5);
  const [localAudioFiles, setLocalAudioFiles] = useState<string[]>([]);
  const [selectedCloneFile, setSelectedCloneFile] = useState("");
  const [isCloning, setIsCloning] = useState(false);

  useEffect(() => {
    fetch('/api/ai/audio-files').then(res => res.json()).then(data => {
      if (data.files) setLocalAudioFiles(data.files);
    }).catch(() => {});
  }, []);

  // Carrega os eventos para o dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('id, title').order('created_at', { ascending: false });
      if (data) {
        setEvents(data);
        if (!selectedEventId && data.length > 0) setSelectedEventId(data[0].id);
      }
    };
    fetchEvents();
  }, [supabase]);

  // Carrega as definições quando o evento muda
  useEffect(() => {
    if (!selectedEventId) return;
    const fetchConfig = async () => {
      const { data } = await supabase.from('events').select('*').eq('id', selectedEventId).single();
      if (data) {
        setLanguage(data.language || "pt-PT");
        // Prioriza a nova coluna voice_settings, caso não exista usa o legacy personality
        let config: any = {};
        if (data.voice_settings && Object.keys(data.voice_settings).length > 0) {
           config = data.voice_settings;
        } else if (data.personality) {
           try { config = JSON.parse(data.personality); } catch(e) {}
        }
        
        if (config.tts_provider) setTtsProvider(config.tts_provider);
        if (config.elevenlabs_api_key) setElevenLabsApiKey(config.elevenlabs_api_key);
        if (config.voice_id) setVoiceId(config.voice_id);
        if (config.fish_api_key) setFishApiKey(config.fish_api_key);
        if (config.fish_reference_id) setFishReferenceId(config.fish_reference_id);
        if (config.openai_voice) setOpenaiVoice(config.openai_voice);
        if (config.openai_tone) setOpenaiTone(config.openai_tone);
        if (config.openai_rhythm) setOpenaiRhythm(config.openai_rhythm);
        if (config.openai_storytelling) setOpenaiStorytelling(config.openai_storytelling);
        if (config.speed) setSpeed(config.speed);
        if (config.pitch) setPitch(config.pitch);
        if (config.gender) setGender(config.gender);
      }
    };
    fetchConfig();
  }, [selectedEventId, supabase]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    
    // --- 1. CHECAGEM (CHECK) DO PROVEDOR ATIVO ANTES DE SALVAR ---
    try {
        const apiKey = (ttsProvider === "fishaudio" ? fishApiKey : (ttsProvider === "openai" ? "dummy" : elevenLabsApiKey))?.trim() || "";
        const vId = (ttsProvider === "fishaudio" ? fishReferenceId : (ttsProvider === "openai" ? openaiVoice : voiceId))?.trim() || "";
        
        if (!apiKey && ttsProvider !== "openai") {
          alert(`Por favor insira a API Key para o provedor ${ttsProvider}. A configuração NÃO foi salva.`);
          setIsLoading(false);
          return;
        }

        const testText = language === "en-US" ? "System check successful." : "Checagem de sistema concluída.";

        const testResponse = await fetch('/api/ai/test-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: ttsProvider,
            apiKey: apiKey,
            voiceId: vId,
            text: testText,
            speed: speed,
            pitch: pitch,
            tone: openaiTone,
            rhythm: openaiRhythm,
            storytelling: openaiStorytelling,
            language: language
          })
        });

        if (!testResponse.ok) {
           const data = await testResponse.json().catch(() => ({ error: "Erro desconhecido" }));
           alert("ERRO NA CHECAGEM ❌\nA API de voz rejeitou a configuração. Verifique as credenciais ou o ID da voz.\nErro: " + (data.error || "Desconhecido") + "\n\nA configuração NÃO foi salva.");
           setIsLoading(false);
           return;
        }
    } catch(err) {
        alert("Erro na conexão durante a checagem. A configuração não foi salva.");
        setIsLoading(false);
        return;
    }
    // -------------------------------------------------------------
    
    // --- 2. SE PASSAR NO TESTE, SALVA NO BANCO DE DADOS ---
    const { data: currentEvent } = await supabase.from('events').select('*').eq('id', selectedEventId).single();
    const currentVoiceSettings = currentEvent?.voice_settings || {};

    const newVoiceSettings = {
      ...currentVoiceSettings,
      tts_provider: ttsProvider,
      elevenlabs_api_key: elevenLabsApiKey,
      voice_id: voiceId,
      fish_api_key: fishApiKey,
      fish_reference_id: fishReferenceId,
      openai_voice: openaiVoice,
      openai_tone: openaiTone,
      openai_rhythm: openaiRhythm,
      openai_storytelling: openaiStorytelling,
      speed: speed,
      pitch: pitch,
      gender: gender
    };

    const { error } = await supabase.from('events').update({
      language: language,
      voice_settings: newVoiceSettings
    }).eq('id', selectedEventId);

    setIsLoading(false);
    if (!error) {
      alert("✅ Configurações validadas e gravadas com sucesso para este evento!");
    } else {
      alert("Erro ao gravar no banco: " + error.message);
    }
  };

  const handleCloneVoice = async () => {
    if (!selectedCloneFile) {
      alert("Selecione um ficheiro de áudio primeiro.");
      return;
    }
    const apiKey = ttsProvider === "elevenlabs" ? elevenLabsApiKey : fishApiKey;
    if (!apiKey) {
      alert(`Insira a API Key para ${ttsProvider} antes de clonar.`);
      return;
    }

    setIsCloning(true);
    try {
      const response = await fetch('/api/ai/clone-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: ttsProvider,
          apiKey: apiKey,
          fileName: selectedCloneFile,
          voiceName: `Cloned - ${selectedCloneFile}`
        })
      });
      const data = await response.json();
      if (data.success && data.voice_id) {
        if (ttsProvider === "elevenlabs") setVoiceId(data.voice_id);
        if (ttsProvider === "fishaudio") setFishReferenceId(data.voice_id);
        
        // Auto-gravar na base de dados para garantir que vai para o Painel Live
        const { data: currentEvent } = await supabase.from('events').select('personality').eq('id', selectedEventId).single();
        let currentConfig = {};
        if (currentEvent?.personality) {
          try { currentConfig = JSON.parse(currentEvent.personality); } catch(e) {}
        }
        const newConfig = {
          ...currentConfig,
          tts_provider: ttsProvider,
          voice_id: ttsProvider === "elevenlabs" ? data.voice_id : voiceId,
          fish_reference_id: ttsProvider === "fishaudio" ? data.voice_id : fishReferenceId,
          elevenlabs_api_key: elevenLabsApiKey,
          fish_api_key: fishApiKey
        };
        await supabase.from('events').update({
          personality: JSON.stringify(newConfig)
        }).eq('id', selectedEventId);

        alert("Voz clonada com sucesso! O ID foi preenchido e as configurações foram gravadas automaticamente. Já pode ir ao Painel do Palestrante testar!");
      } else {
        alert(data.error || "Erro ao clonar voz.");
      }
    } catch (e) {
      alert("Erro ao conectar com a API de clonagem.");
    }
    setIsCloning(false);
  };

  const handleTestVoice = async () => {
    setIsTesting(true);
    let testText = "";
    
    // As sentenças foram otimizadas com fonética indutiva rígida para garantir o sotaque em modelos como TTS-1
    if (language === "pt-PT") {
      testText = "Com certeza! O sistema de som está totalmente operacional no ecrã. Estou a postos para iniciar a mediação dos oradores e das equipas no palco do Digitalent’26.";
    } else if (language === "en-US") {
      testText = "Hello! Testing the sound system for Digitalent’26. The stage is ready.";
    } else {
      testText = "Com certeza! O sistema de som está totalmente operacional. Estou pronto para iniciar a mediação dos palestrantes no palco do Digitalent’26.";
    }
    
    // Personalização de tom para o OpenAI (Inglês)
    if (ttsProvider === "openai" && language === "en-US") {
        if (openaiTone === "Energético de Palco") {
          testText = openaiRhythm === "Cadenciado com Pausas (Formal)" 
            ? "Ladies... and gentlemen! Get ready... for an absolutely spectacular demonstration!"
            : "Hello everyone! What fantastic energy! This is the perfect demonstration of your new voice!";
        } else if (openaiTone === "Descontraído/Interativo") {
          testText = "Hey guys, how are we doing today? Ready to hear this incredible voice in action?";
        } else {
          testText = openaiRhythm === "Cadenciado com Pausas (Formal)"
            ? "Welcome everyone... This is the premium voice demonstration... configured for our event."
            : "Hello. This is a demonstration of the corporate voice configured for your event.";
        }
    } else if (ttsProvider === "openai" && language === "pt-BR") {
        if (openaiTone === "Energético de Palco") {
          testText = openaiRhythm === "Cadenciado com Pausas (Formal)" 
            ? "Senhoras... e senhores! Preparem-se... para uma demonstração absolutamente espetacular!"
            : "Olá a todos! Que energia fantástica! Esta é a demonstração perfeita da vossa nova voz!";
        } else if (openaiTone === "Descontraído/Interativo") {
          testText = "Olá pessoal, como estamos hoje? Prontos para ouvir esta voz incrível a funcionar?";
        }
        // Se for corporativo, mantém a string base indutiva definida acima.
    } else if (ttsProvider === "openai" && language === "pt-PT") {
        if (openaiTone === "Energético de Palco") {
          testText = openaiRhythm === "Cadenciado com Pausas (Formal)" 
            ? "Senhoras... e senhores! O ecrã está a postos... Preparem-se para os oradores!"
            : "Olá a todos! Que energia fantástica! Esta é a demonstração perfeita da vossa nova voz no ecrã!";
        } else if (openaiTone === "Descontraído/Interativo") {
          testText = "Olá malta, como estamos hoje? Prontos para ouvir os oradores e as equipas no palco do Digitalent?";
        }
        // Se for corporativo, mantém a string base indutiva do pt-PT para forçar a pronúncia correta.
    }
    
    if (ttsProvider === "fishaudio" || ttsProvider === "elevenlabs" || ttsProvider === "openai") {
      try {
        const apiKey = ttsProvider === "fishaudio" ? fishApiKey : (ttsProvider === "openai" ? "dummy" : elevenLabsApiKey);
        const vId = ttsProvider === "fishaudio" ? fishReferenceId : (ttsProvider === "openai" ? openaiVoice : voiceId);
        
        if (!apiKey && ttsProvider !== "openai") {
          alert(`Por favor insira a API Key para ${ttsProvider}.`);
          setIsTesting(false);
          return;
        }

        const response = await fetch('/api/ai/test-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: ttsProvider,
            apiKey: apiKey,
            voiceId: vId,
            text: testText,
            speed: speed,
            pitch: pitch,
            tone: openaiTone,
            rhythm: openaiRhythm,
            storytelling: openaiStorytelling,
            language: language
          })
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => setIsTesting(false);
          audio.onerror = () => setIsTesting(false);
          audio.play();
          return;
        } else {
          const data = await response.json().catch(() => ({ error: "Erro desconhecido" }));
          alert(data.error || "Falha ao gerar o áudio.");
        }
      } catch (e) {
        alert("Falha de conexão com o servidor interno.");
      }
    } else {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(testText);
        utterance.lang = language;
        utterance.rate = speed;
        utterance.pitch = pitch;
        utterance.onend = () => setIsTesting(false);
        utterance.onerror = () => setIsTesting(false);
        window.speechSynthesis.speak(utterance);
        return;
      }
    }
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6 md:p-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-500/10 rounded-xl">
            <Mic className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Configuração da Voz da IA</h2>
            <p className="text-sm text-neutral-500">Ajuste o tom e conecte vozes realistas (ElevenLabs) para os seus eventos.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* SELEÇÃO DO EVENTO */}
          <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl">
            <label className="block text-sm font-medium text-neutral-400 mb-2">Evento a Configurar</label>
            <select 
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="" disabled>Selecione um evento...</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 mt-2">Cada evento possui a sua própria identidade vocal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Provedor Principal</label>
              <select value={ttsProvider} onChange={e => setTtsProvider(e.target.value as any)} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500">
                <option value="native">Nativo (Browser Livre)</option>
                <option value="openai">OpenAI (TTS-1)</option>
                <option value="elevenlabs">ElevenLabs</option>
                <option value="fishaudio">Fish Audio</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Idioma / Sotaque</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white">
                <option value="pt-BR">Português do Brasil</option>
                <option value="pt-PT">Português de Portugal</option>
                <option value="en-US">Inglês (Estados Unidos)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Género da Voz</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white">
                <option value="female">Feminino</option>
                <option value="male">Masculino</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-white border-b border-neutral-800 pb-2">Configurações Avançadas de Fala</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex justify-between items-center text-sm font-medium text-neutral-400 mb-2">
                  <span>Velocidade</span>
                  <span className="text-indigo-400">{speed}x</span>
                </label>
                <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="flex justify-between items-center text-sm font-medium text-neutral-400 mb-2">
                  <span>Tom (Pitch)</span>
                  <span className="text-indigo-400">{pitch}</span>
                </label>
                <input type="range" min="0.5" max="2.0" step="0.1" value={pitch} onChange={e => setPitch(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-neutral-800">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="font-semibold text-white mb-1">Configurações de Provedores de Voz</h3>
                <p className="text-xs text-neutral-500 mb-4">Pode configurar as chaves de todos e trocar entre eles no Provedor Principal acima.</p>
              </div>
            </div>

            {/* OPENAI */}
            <div className={`p-4 rounded-xl border transition-colors duration-300 ${ttsProvider === "openai" ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "bg-neutral-900/30 border-neutral-800"}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h4 className="font-medium text-white flex items-center gap-2">🤖 OpenAI (TTS-1)</h4>
                  {ttsProvider === "openai" ? (
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/30">ATIVO</span>
                  ) : (
                    <button type="button" onClick={() => setTtsProvider("openai")} className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-full transition-colors border border-neutral-700">Ativar</button>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-400">
                  <p>A OpenAI utiliza a chave padrão do sistema. O modelo de ultra-baixa latência <b>tts-1</b> será utilizado. Clonagem desativada para a OpenAI (vozes restritas à plataforma).</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Vozes de Palco</label>
                  <select 
                    value={openaiVoice} 
                    onChange={e => setOpenaiVoice(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="onyx">Onyx (Masculino Profundo / Recomendado)</option>
                    <option value="echo">Echo (Masculino Suave)</option>
                    <option value="fable">Fable (Masculino Jovem)</option>
                    <option value="shimmer">Shimmer (Feminino Envolvente / Recomendado)</option>
                    <option value="alloy">Alloy (Feminino Neutro)</option>
                    <option value="nova">Nova (Feminino Jovem)</option>
                  </select>
                </div>
                

                {ttsProvider === "openai" && (
                  <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-800 mt-4">
                    <h5 className="text-sm font-medium text-white mb-3">Ajuste de Características da Persona (Prompt Vocálico)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Tom do Evento</label>
                        <select 
                          value={openaiTone} 
                          onChange={e => setOpenaiTone(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Corporativo Premium">Corporativo Premium</option>
                          <option value="Energético de Palco">Energético de Palco</option>
                          <option value="Descontraído/Interativo">Descontraído/Interativo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Ritmo de Fala</label>
                        <select 
                          value={openaiRhythm} 
                          onChange={e => setOpenaiRhythm(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Cadenciado com Pausas (Formal)">Cadenciado com Pausas (Formal)</option>
                          <option value="Fluido e Rápido (Dinâmico)">Fluido e Rápido (Dinâmico)</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs text-neutral-400">Nível de Storytelling</label>
                        <span className="text-xs font-bold text-indigo-400">{openaiStorytelling}/10</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        step="1" 
                        value={openaiStorytelling} 
                        onChange={e => setOpenaiStorytelling(parseInt(e.target.value))} 
                        className="w-full accent-indigo-500" 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FISH AUDIO */}
            <div className={`p-4 rounded-xl border transition-colors duration-300 ${ttsProvider === "fishaudio" ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "bg-neutral-900/30 border-neutral-800"}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h4 className="font-medium text-white flex items-center gap-2">🐠 Fish Audio</h4>
                  {ttsProvider === "fishaudio" ? (
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/30">ATIVO</span>
                  ) : (
                    <button type="button" onClick={() => setTtsProvider("fishaudio")} className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-full transition-colors border border-neutral-700">Ativar</button>
                  )}
                </div>
                <div className="group relative">
                  <button type="button" className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Como configurar?
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[#111] border border-neutral-800 p-4 rounded-xl shadow-2xl z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <p className="text-xs text-neutral-300 mb-2 font-semibold">Passo a passo Fish Audio:</p>
                    <ol className="text-xs text-neutral-400 space-y-1 list-decimal pl-4">
                      <li>Crie conta em <a href="https://fish.audio" target="_blank" className="text-indigo-400 hover:underline">fish.audio</a></li>
                      <li>Vá ao seu Dashboard e clique em <b>API Keys</b>.</li>
                      <li>Gere uma nova chave e cole-a no campo abaixo.</li>
                      <li><i>Opcional:</i> Para usar uma voz sua, vá a <b>My Voices</b> e copie o ID da voz (Reference ID).</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Fish Audio API Key</label>
                  <input 
                    type="password" 
                    value={fishApiKey} 
                    onChange={e => setFishApiKey(e.target.value)} 
                    placeholder="Cole a sua chave aqui..."
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Reference ID (Opcional - Voz Clonada)</label>
                  <input 
                    type="text" 
                    value={fishReferenceId} 
                    onChange={e => setFishReferenceId(e.target.value)} 
                    placeholder="ex: 1234abcd..."
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" 
                  />
                </div>

                {/* Clone Block Fish Audio */}
                <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-800 mt-4">
                  <h5 className="text-sm font-medium text-white mb-3">Clonagem Dinâmica de Voz</h5>
                  <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-xs text-neutral-400 mb-1">Selecionar Ficheiro Local (Pasta /audio)</label>
                      <select 
                        value={selectedCloneFile} 
                        onChange={e => setSelectedCloneFile(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Nenhum...</option>
                        {localAudioFiles.map(file => (
                          <option key={file} value={file}>{file}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      type="button"
                      disabled={isCloning || !selectedCloneFile || ttsProvider !== "fishaudio"}
                      onClick={handleCloneVoice}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      {isCloning ? "A Clonar..." : "Clonar Voz"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ELEVEN LABS */}
            <div className={`p-4 rounded-xl border transition-colors duration-300 ${ttsProvider === "elevenlabs" ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "bg-neutral-900/30 border-neutral-800"}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h4 className="font-medium text-white flex items-center gap-2">🎙️ ElevenLabs</h4>
                  {ttsProvider === "elevenlabs" ? (
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/30">ATIVO</span>
                  ) : (
                    <button type="button" onClick={() => setTtsProvider("elevenlabs")} className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-full transition-colors border border-neutral-700">Ativar</button>
                  )}
                </div>
                <div className="group relative">
                  <button type="button" className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Como configurar?
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[#111] border border-neutral-800 p-4 rounded-xl shadow-2xl z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <p className="text-xs text-neutral-300 mb-2 font-semibold">Passo a passo ElevenLabs:</p>
                    <ol className="text-xs text-neutral-400 space-y-1 list-decimal pl-4">
                      <li>Crie conta em <a href="https://elevenlabs.io" target="_blank" className="text-indigo-400 hover:underline">elevenlabs.io</a></li>
                      <li>Clique no seu Perfil (canto inferior esquerdo) e vá a <b>Profile & API key</b>.</li>
                      <li>Copie a chave de API e cole-a no campo abaixo.</li>
                      <li>Vá à secção <b>Voices</b>, escolha a voz desejada, clique nos 3 pontos e selecione <b>Copy Voice ID</b>.</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">ElevenLabs API Key</label>
                  <input 
                    type="password" 
                    value={elevenLabsApiKey} 
                    onChange={e => setElevenLabsApiKey(e.target.value)} 
                    placeholder="sk_..."
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">ElevenLabs Voice ID</label>
                  <input 
                    type="text" 
                    value={voiceId} 
                    onChange={e => setVoiceId(e.target.value)} 
                    placeholder="ex: pNInz6obpgDQGcFmaJcg"
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" 
                  />
                </div>

                {/* Clone Block ElevenLabs */}
                <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-800 mt-4">
                  <h5 className="text-sm font-medium text-white mb-3">Clonagem Dinâmica de Voz</h5>
                  <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-xs text-neutral-400 mb-1">Selecionar Ficheiro Local (Pasta /audio)</label>
                      <select 
                        value={selectedCloneFile} 
                        onChange={e => setSelectedCloneFile(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Nenhum...</option>
                        {localAudioFiles.map(file => (
                          <option key={file} value={file}>{file}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      type="button"
                      disabled={isCloning || !selectedCloneFile || ttsProvider !== "elevenlabs"}
                      onClick={handleCloneVoice}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      {isCloning ? "A Clonar..." : "Clonar Voz"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button 
              type="button" 
              onClick={handleTestVoice}
              disabled={isTesting}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-neutral-900/20"
            >
              {isTesting ? "A Tocar..." : "Testar Voz"}
            </button>
              <button 
                type="submit" 
                disabled={!selectedEventId || isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
              >
                {isLoading ? "A Checar e Gravar..." : "Validar e Gravar Configuração"}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- MODULE C: EVENT SETTINGS (LEGACY) ---
function SettingsModule({ eventId, supabase }: { eventId: string | null, supabase: any }) {
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
function PortalsModule({ eventId, supabase }: { eventId: string | null, supabase: any }) {
  const [slideUrl, setSlideUrl] = useState("");
  const [sponsorsStr, setSponsorsStr] = useState("");
  const [voiceNext, setVoiceNext] = useState("próxima página");
  const [voicePrev, setVoicePrev] = useState("retorna");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [macroTexts, setMacroTexts] = useState<Record<string, string>>({
    "Abertura": "",
    "Apresentação Equipa": "",
    "Cordenadores": "",
    "Almoço": "",
    "Digital Networking": "",
    "Encerramento": ""
  });

  useEffect(() => {
    if (eventId) {
      const fetchData = async () => {
        const { data } = await supabase.from('events').select('personality').eq('id', eventId).single();
        if (data?.personality) {
          try {
            const config = JSON.parse(data.personality);
            if (config.current_slide) setSlideUrl(config.current_slide);
            if (config.sponsors && Array.isArray(config.sponsors)) setSponsorsStr(config.sponsors.join(", "));
            if (config.voice_commands) {
              if (config.voice_commands.next) setVoiceNext(config.voice_commands.next);
              if (config.voice_commands.prev) setVoicePrev(config.voice_commands.prev);
            }
            if (config.macro_texts) {
              setMacroTexts(prev => ({ ...prev, ...config.macro_texts }));
            }
          } catch(e) {}
        }
      };
      fetchData();
    }
  }, [eventId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;
    
    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${eventId}_${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from('slides').upload(fileName, file);
    if (uploadError) {
      alert("Erro ao enviar imagem: " + uploadError.message);
      setIsUploading(false);
      return;
    }
    
    const { data } = supabase.storage.from('slides').getPublicUrl(fileName);
    if (data?.publicUrl) {
      setSlideUrl(data.publicUrl);
    }
    setIsUploading(false);
  };

  const handleDeleteFile = async () => {
    if (!slideUrl || !slideUrl.includes('supabase.co/storage/v1/object/public/slides/')) {
      setSlideUrl("");
      return;
    }
    
    const filePath = slideUrl.split('public/slides/')[1];
    if (filePath) {
      setIsUploading(true);
      await supabase.storage.from('slides').remove([filePath]);
      setSlideUrl("");
      setIsUploading(false);
    } else {
      setSlideUrl("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    setIsLoading(true);

    const { data } = await supabase.from('events').select('personality').eq('id', eventId).single();
    let currentConfig = {};
    if (data?.personality) {
      try { currentConfig = JSON.parse(data.personality); } catch(e) {}
    }

    const sponsorsArray = sponsorsStr.split(",").map(s => s.trim()).filter(s => s !== "");

    currentConfig = {
      ...currentConfig,
      current_slide: slideUrl,
      sponsors: sponsorsArray,
      voice_commands: {
        next: voiceNext,
        prev: voicePrev
      },
      macro_texts: macroTexts
    };

    await supabase.from('events').update({ personality: JSON.stringify(currentConfig) }).eq('id', eventId);
    
    setIsLoading(false);
    alert("Layout do Teleprompter atualizado com sucesso!");
  };

  if (!eventId) return <div className="text-white">Selecione um evento na aba 'Meus Eventos' primeiro.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-[#111] border border-neutral-800 rounded-2xl p-6 md:p-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-purple-500/10 rounded-xl">
            <MonitorPlay className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Gestão Visual do Teleprompter</h2>
            <p className="text-sm text-neutral-500">Controle o slide atual do palestrante e os logótipos dos patrocinadores.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="p-5 border border-neutral-800 bg-[#1a1a1a] rounded-xl space-y-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Monitor className="w-5 h-5 text-indigo-400" /> Slide Atual do Palestrante
            </h3>
            <p className="text-xs text-neutral-500">Cole o link (URL) do ficheiro ou faça upload. Suporta Imagens, PDF, PPT e PPTX.</p>
            <input 
              type="url" 
              value={slideUrl}
              onChange={e => setSlideUrl(e.target.value)}
              placeholder="https://sua-imagem.com/slide.png"
              className="w-full bg-[#111] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500">ou</span>
              <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-xs text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2">
                {isUploading ? "A carregar..." : "📤 Fazer Upload (Imagem, PDF, PPT)"}
                <input type="file" accept="image/*,.pdf,.ppt,.pptx" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
              </label>
            </div>
            {slideUrl && (
              <div className="mt-2 border border-neutral-800 rounded-lg overflow-hidden bg-black/50 aspect-video relative group">
                 {slideUrl.toLowerCase().includes('.pdf') ? (
                    <iframe src={slideUrl} className="w-full h-full border-none" title="PDF Slide" />
                 ) : slideUrl.toLowerCase().includes('.ppt') || slideUrl.toLowerCase().includes('.pptx') ? (
                    <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(slideUrl)}`} className="w-full h-full border-none" title="PowerPoint Slide" />
                 ) : (
                    <img src={slideUrl} alt="Slide Preview" className="w-full h-full object-contain" />
                 )}
                 <button 
                   type="button" 
                   onClick={handleDeleteFile}
                   className="absolute top-3 right-3 bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg flex items-center justify-center"
                   title="Excluir Imagem"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            )}
          </div>

          <div className="p-5 border border-neutral-800 bg-[#1a1a1a] rounded-xl space-y-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Mic className="w-5 h-5 text-purple-400" /> Controlo de Slides por Voz
            </h3>
            <p className="text-xs text-neutral-500">Defina as palavras-chave que o palestrante deve dizer para avançar ou recuar os slides automaticamente.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Avançar Slide</label>
                <input 
                  type="text" 
                  value={voiceNext}
                  onChange={e => setVoiceNext(e.target.value)}
                  placeholder="Ex: próxima página"
                  className="w-full bg-[#111] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Recuar Slide</label>
                <input 
                  type="text" 
                  value={voicePrev}
                  onChange={e => setVoicePrev(e.target.value)}
                  placeholder="Ex: retorna"
                  className="w-full bg-[#111] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="p-5 border border-neutral-800 bg-[#1a1a1a] rounded-xl space-y-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <BriefcaseBusiness className="w-5 h-5 text-emerald-400" /> Logótipos dos Patrocinadores
            </h3>
            <p className="text-xs text-neutral-500">Insira os links das imagens dos patrocinadores separados por vírgula.</p>
            <textarea 
              value={sponsorsStr}
              onChange={e => setSponsorsStr(e.target.value)}
              rows={2}
              placeholder="https://img.com/patrocinador1.png, https://img.com/patrocinador2.png"
              className="w-full bg-[#111] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none font-mono"
            />
          </div>

          <div className="p-5 border border-neutral-800 bg-[#1a1a1a] rounded-xl space-y-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-rose-400" /> Textos da IA (Macro-Estados)
            </h3>
            <p className="text-xs text-neutral-500">Defina os textos que a Inteligência Artificial deve dizer quando clicares nos botões de Macro-Estado.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(macroTexts).map((macro) => (
                <div key={macro}>
                  <label className="block text-xs text-neutral-400 mb-1">{macro}</label>
                  <textarea 
                    value={macroTexts[macro]}
                    onChange={e => setMacroTexts({...macroTexts, [macro]: e.target.value})}
                    rows={2}
                    placeholder={`Texto para ${macro}...`}
                    className="w-full bg-[#111] border border-neutral-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            {isLoading ? "A Gravar..." : "Atualizar Ecrã do Teleprompter"}
          </button>
        </form>
      </div>
    </div>
  );
}
