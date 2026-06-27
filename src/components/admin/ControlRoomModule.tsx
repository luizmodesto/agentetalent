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

export function ControlRoomModule({ eventId }: { eventId: string | null }) {
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