"use client";

import React, { useState, useEffect } from "react";
import { 
  Lock, User, LogIn, LayoutDashboard, Settings, 
  MessageSquare, Radio, Check, X, Edit, Trash2, 
  PlayCircle, Mic, TerminalSquare, AlertCircle, PlusCircle,
  Monitor, MonitorPlay, Smartphone, ExternalLink, CalendarDays,
  ArrowLeft, Plus, BriefcaseBusiness, Bot, Link as LinkIcon, RotateCcw
} from "lucide-react";
import { createClient } from '@/utils/supabase/client';

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
  const [activeModule, setActiveModule] = useState<"events" | "control" | "qa" | "settings" | "manage_event" | "voice_settings" | "portals">("events");
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

// --- MODULE: MANAGE EVENT (3-COLUMN LAYOUT FROM SCREENSHOT) ---
function ManageEventModule({ eventId, supabase, onBack }: { eventId: string | null, supabase: any, onBack: () => void }) {
  const [speakerData, setSpeakerData] = useState({ name: "", role: "", bio: "", foto: "" });
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegisterSpeaker = async () => {
    if (!speakerData.name) return;
    setIsRegistering(true);
    try {
      const { data: spk, error: spkErr } = await supabase.from('speakers').insert([
        { name: speakerData.name, role: speakerData.role, bio: speakerData.bio }
      ]).select();
      
      if (spk && spk[0]) {
        await supabase.from('sessions').insert([
          { event_id: eventId, speaker_id: spk[0].id, title: `Sessão com ${speakerData.name}`, status: 'active' }
        ]);
        alert("Orador e Sessão cadastrados com sucesso!");
        setSpeakerData({ name: "", role: "", bio: "", foto: "" });
      } else {
        alert("Erro ao cadastrar orador: " + (spkErr?.message || "Desconhecido"));
      }
    } catch (e) {
      console.error(e);
    }
    setIsRegistering(false);
  };

  if (!eventId) return <div className="text-white">Nenhum evento selecionado.</div>;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-neutral-400 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">Painel do Evento (ID: {eventId.substring(0, 8)}...)</h2>
            <p className="text-sm text-neutral-500">Configurações e controle da palestra ao vivo.</p>
          </div>
        </div>
        
        <a 
          href={`/event/${eventId}/live`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir Teleprompter
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMN 1: CADASTRAR ORADOR & PATROCINADORES */}
        <div className="space-y-6">
          <div className="bg-[#1C202E] border border-neutral-800/50 rounded-2xl p-6 shadow-xl">
            <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" /> Cadastrar orador
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Nome</label>
                <input type="text" value={speakerData.name} onChange={e => setSpeakerData({...speakerData, name: e.target.value})} className="w-full bg-[#131620] border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Ex: Luis" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Especialidade</label>
                <input type="text" value={speakerData.role} onChange={e => setSpeakerData({...speakerData, role: e.target.value})} className="w-full bg-[#131620] border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Ex: Marketing digital" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Resumo IA</label>
                <textarea rows={3} value={speakerData.bio} onChange={e => setSpeakerData({...speakerData, bio: e.target.value})} className="w-full bg-[#131620] border border-neutral-700/50 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Resumo curto..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Foto do orador (URL)</label>
                <input type="text" value={speakerData.foto} onChange={e => setSpeakerData({...speakerData, foto: e.target.value})} className="w-full bg-[#131620] border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="https://site.com/foto.jpg" />
              </div>
              <button 
                onClick={handleRegisterSpeaker}
                disabled={isRegistering || !speakerData.name}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 px-6 rounded-lg transition-colors mt-2 text-sm shadow-lg shadow-emerald-600/20"
              >
                {isRegistering ? "Cadastrando..." : "Cadastrar"}
              </button>
            </div>
          </div>

          <div className="bg-[#1C202E] border border-neutral-800/50 rounded-2xl p-6 shadow-xl">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <BriefcaseBusiness className="w-5 h-5 text-amber-500" /> Gerenciador de Patrocinadores
            </h3>
            <div className="flex gap-2">
              <input type="text" className="flex-1 bg-[#131620] border border-neutral-700/50 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="URL da imagem (ex: https://...)" />
              <button className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors shadow-lg shadow-emerald-600/20">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN 2: CONTROLE DA PALESTRA */}
        <div className="bg-[#1C202E] border border-neutral-800/50 rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
            <Mic className="w-5 h-5 text-indigo-400" /> Controle da palestra
          </h3>
          <p className="text-sm text-neutral-400 mb-6">Abra o orador atual em verde, feche em vermelho.</p>
          
          <button className="w-full bg-transparent border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/10 text-indigo-300 font-medium py-3 rounded-lg transition-all mb-6">
            Próximo orador automático
          </button>

          <div className="flex-1 border border-neutral-800/50 rounded-lg bg-[#131620] flex items-center justify-center p-6 text-center text-neutral-500 text-sm">
            Nenhum orador ativo no momento. Comece a palestra para visualizar o status ao vivo.
          </div>
        </div>

        {/* COLUMN 3: INTELIGÊNCIA ARTIFICIAL */}
        <div className="space-y-6">
          <div className="bg-[#1C202E] border border-neutral-800/50 rounded-2xl p-6 shadow-xl">
            <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
              <Bot className="w-5 h-5 text-rose-400" /> Inteligência Artificial
            </h3>
            
            <div className="bg-white rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">Idioma</label>
                <select className="w-full bg-neutral-100 border border-neutral-300 text-neutral-800 font-medium rounded-md px-3 py-2 text-sm focus:outline-none">
                  <option>Português (Portugal)</option>
                  <option>Português (Brasil)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">Sexo</label>
                  <select className="w-full bg-neutral-100 border border-neutral-300 text-neutral-800 font-medium rounded-md px-3 py-2 text-sm focus:outline-none">
                    <option>Feminina</option>
                    <option>Masculina</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">Voz</label>
                  <select className="w-full bg-neutral-100 border border-neutral-300 text-neutral-800 font-medium rounded-md px-3 py-2 text-sm focus:outline-none">
                    <option>Nova (F)</option>
                    <option>Shimmer (F)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-2">Velocidade: 0.95x</label>
                <input type="range" min="0.5" max="2" step="0.05" defaultValue="0.95" className="w-full accent-blue-500" />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button className="w-full flex items-center justify-center gap-2 bg-transparent border border-neutral-700 hover:border-neutral-500 text-neutral-300 font-medium py-2.5 rounded-lg transition-colors text-sm">
                <LinkIcon className="w-4 h-4" /> Copiar link do público
              </button>
              <button className="w-full flex items-center justify-center gap-2 bg-transparent border border-sky-900 hover:border-sky-700 hover:bg-sky-900/20 text-sky-400 font-medium py-2.5 rounded-lg transition-colors text-sm">
                <RotateCcw className="w-4 h-4" /> Reiniciar sistema
              </button>
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
  const [newEvent, setNewEvent] = useState({ title: "", speaker: "" });
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
      const { data, error } = await supabase.from('events').insert([
        { title: newEvent.title, status: 'Pendente', language: 'pt-PT' }
      ]).select();
      
      if (data && data[0]) {
        // Agora vamos criar uma sessão base usando o speaker informado como placeholder (no schema final isso muda)
        // Isso é para garantir retrocompatibilidade com o banco caso haja constraint
        setEvents([data[0], ...events]);
        setNewEvent({ title: "", speaker: "" });
      }
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
            <label className="block text-sm text-neutral-400 mb-1">Responsável Principal</label>
            <input required type="text" value={newEvent.speaker} onChange={e => setNewEvent({...newEvent, speaker: e.target.value})} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Ex: Carlos Costa" />
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
    await supabase.from('questions').update({ status: 'approved' }).eq('id', q.id);
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
      const { data } = await supabase.from('events').select('personality, language').eq('id', selectedEventId).single();
      if (data) {
        setLanguage(data.language || "pt-PT");
        if (data.personality) {
          try {
            const config = JSON.parse(data.personality);
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
          } catch (e) {
            console.error("Erro ao fazer parse das definições da voz", e);
          }
        }
      }
    };
    fetchConfig();
  }, [selectedEventId, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { data: currentEvent } = await supabase.from('events').select('personality').eq('id', selectedEventId).single();
    let currentConfig = {};
    if (currentEvent?.personality) {
      try { currentConfig = JSON.parse(currentEvent.personality); } catch(e) {}
    }

    const newConfig = {
      ...currentConfig,
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
    
    const personalityJSON = JSON.stringify(newConfig);

    const { error } = await supabase.from('events').update({
      language: language,
      personality: personalityJSON
    }).eq('id', selectedEventId);

    setIsLoading(false);
    if (!error) {
      alert("Configurações de Voz gravadas com sucesso para este evento!");
    } else {
      alert("Erro ao gravar: " + error.message);
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
    if (language === "pt-PT") {
      testText = "Olá! Estou a testar o sistema de som para o Digitalent’26. O palco está pronto.";
    } else if (language === "en-US") {
      testText = "Hello! Testing the sound system for Digitalent’26. The stage is ready.";
    } else {
      testText = "Olá! Testando o sistema de som para o Digitalent’26. O palco está pronto.";
    }
    
    if (ttsProvider === "openai") {
      if (language === "en-US") {
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
      } else {
        if (openaiTone === "Energético de Palco") {
          testText = openaiRhythm === "Cadenciado com Pausas (Formal)" 
            ? "Senhoras... e senhores! Preparem-se... para uma demonstração absolutamente espetacular!"
            : "Olá a todos! Que energia fantástica! Esta é a demonstração perfeita da vossa nova voz!";
        } else if (openaiTone === "Descontraído/Interativo") {
          testText = "Olá malta, como estamos hoje? Prontos para ouvir esta voz incrível a funcionar?";
        } else {
          testText = openaiRhythm === "Cadenciado com Pausas (Formal)"
            ? "Sejam muito bem-vindos... Esta é a demonstração da voz premium... configurada para o nosso evento."
            : "Olá. Esta é uma demonstração da voz corporativa configurada para o seu evento.";
        }
      }
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
            pitch: pitch
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
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? "A Gravar..." : "Gravar Configurações de Voz"}
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
          } catch(e) {}
        }
      };
      fetchData();
    }
  }, [eventId]);

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
      }
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
            <p className="text-xs text-neutral-500">Cole o link (URL) da imagem do slide que o palestrante deve ver no ecrã (ex: https://.../slide1.jpg).</p>
            <input 
              type="url" 
              value={slideUrl}
              onChange={e => setSlideUrl(e.target.value)}
              placeholder="https://sua-imagem.com/slide.png"
              className="w-full bg-[#111] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            {slideUrl && (
              <div className="mt-2 border border-neutral-800 rounded-lg overflow-hidden bg-black/50 aspect-video relative">
                 <img src={slideUrl} alt="Slide Preview" className="w-full h-full object-contain" />
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
              rows={3}
              placeholder="https://img.com/patrocinador1.png, https://img.com/patrocinador2.png"
              className="w-full bg-[#111] border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none font-mono"
            />
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
