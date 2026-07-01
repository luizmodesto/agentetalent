"use client";

import React, { useState, useEffect } from "react";
import { 
  Lock, User, LogIn, LayoutDashboard, Settings, 
  MessageSquare, Radio, Check, X, Edit, Trash2, 
  PlayCircle, Mic, TerminalSquare, AlertCircle, PlusCircle,
  Monitor, MonitorPlay, Smartphone, ExternalLink, CalendarDays,
  ArrowLeft, Plus, BriefcaseBusiness, Bot, Link as LinkIcon, RotateCcw,
  Activity, Zap, MicOff, UserCheck, Play, Pause, FastForward, StopCircle, PieChart
} from "lucide-react";
import { createClient } from '@/utils/supabase/client';
import QRCode from "react-qr-code";
import Link from "next/link";

import { ManageEventModule } from "@/components/admin/ManageEventModule";
import { ReportsModule } from "@/components/admin/ReportsModule";
import { PortalsModule } from "@/components/admin/PortalsModule";
import { SettingsModule } from "@/components/admin/SettingsModule";
import { VoiceSettingsModule } from "@/components/admin/VoiceSettingsModule";
import { QAModule } from "@/components/admin/QAModule";
import { ControlRoomModule } from "@/components/admin/ControlRoomModule";
import { EventsModule } from "@/components/admin/EventsModule";
import { ManageSponsorsModule } from "@/components/admin/ManageSponsorsModule";
import { RegisterManagerModule } from "@/components/admin/RegisterManagerModule";
import { RegisterParticipantModule } from "@/components/admin/RegisterParticipantModule";
import { RegisterSpeakerModule } from "@/components/admin/RegisterSpeakerModule";
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
  const [activeModule, setActiveModule] = useState<"events" | "control" | "qa" | "settings" | "manage_event" | "voice_settings" | "portals" | "register_speaker" | "register_participant" | "register_manager" | "manage_sponsors" | "reports">("events");
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const supabase = createClient();

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-300 flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0F172A] border-r border-slate-800/50 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800/50 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-[#F59E0B] to-[#10B981] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">DIGITALENT</h2>
            <p className="text-xs text-slate-400">Super Admin</p>
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
          
          <SidebarItem 
            icon={<PieChart />} 
            label="Relatórios e Métricas" 
            active={activeModule === "reports"} 
            onClick={() => setActiveModule("reports")} 
          />

          <div className="pt-4 mt-2 border-t border-slate-700/50">
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

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm"
          >
            <LogIn className="w-4 h-4 rotate-180" /> Sair da Sessão
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-800/50 bg-[#0F172A] flex items-center px-8 shrink-0">
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
            {activeModule === "reports" && "Relatórios e Métricas"}
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
            {activeModule === "reports" && <ReportsModule eventId={activeEventId} supabase={supabase} />}
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
          ? "bg-[#111827] text-white border border-slate-800" 
          : "text-slate-400 hover:bg-[#111827]/50 hover:text-white border border-transparent"
      }`}
    >
      {React.cloneElement(icon as any, { className: "w-5 h-5" })}
      {label}
    </button>
  );
}

// --- MODULE: REGISTER SPEAKER ---