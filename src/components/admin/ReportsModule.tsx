"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, HelpCircle, UserCheck, Activity, BarChart, Download, Calendar
} from "lucide-react";
import { PieChart } from "lucide-react";

export function ReportsModule({ eventId, supabase }: { eventId: string | null, supabase: any }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalQuestions: 0,
    uniqueUsers: 0,
    speakersCount: 0
  });
  const [speakersData, setSpeakersData] = useState<any[]>([]);

  useEffect(() => {
    if (!eventId) return;

    const fetchReports = async () => {
      setLoading(true);

      // Fetch sessions for this event
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, speaker:speakers(id, name, bio)')
        .eq('event_id', eventId);

      const sessionIds = sessions?.map((s: any) => s.id) || [];
      
      // Fetch questions to get total questions and unique users
      let totalQuestions = 0;
      let uniqueUsers = 0;
      
      if (sessionIds.length > 0) {
        const { data: questions } = await supabase
          .from('questions')
          .select('author_name')
          .in('session_id', sessionIds);
          
        if (questions) {
          totalQuestions = questions.length;
          const uniqueNames = new Set(questions.map((q: any) => q.author_name).filter(Boolean));
          uniqueUsers = uniqueNames.size;
        }
      }

      // Format speakers data
      const speakersMap = new Map();
      sessions?.forEach((s: any) => {
        if (s.speaker && !speakersMap.has(s.speaker.id)) {
          speakersMap.set(s.speaker.id, {
            ...s.speaker,
            sessionsCount: 1
          });
        } else if (s.speaker) {
          const spk = speakersMap.get(s.speaker.id);
          spk.sessionsCount += 1;
        }
      });

      setMetrics({
        totalQuestions,
        uniqueUsers,
        speakersCount: speakersMap.size
      });
      
      setSpeakersData(Array.from(speakersMap.values()));
      setLoading(false);
    };

    fetchReports();
  }, [eventId, supabase]);

  if (!eventId) {
    return <div className="text-slate-400">Nenhum evento selecionado para gerar relatórios.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart className="w-5 h-5 text-indigo-400" /> Relatórios do Evento
          </h2>
          <p className="text-sm text-slate-400">Métricas consolidadas e análise de engajamento.</p>
        </div>
        <button className="bg-white hover:bg-slate-200 text-slate-900 font-bold py-2 px-4 rounded-xl transition-colors flex items-center gap-2 shadow-sm text-sm">
          <Download className="w-4 h-4" /> Exportar PDF
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <Activity className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        </div>
      ) : (
        <>
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                <Users className="w-32 h-32" />
              </div>
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Engajamento QR Code</h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-white">{metrics.uniqueUsers}</span>
                <span className="text-sm text-emerald-400 font-medium pb-1 flex items-center gap-1">
                  Participantes únicos
                </span>
              </div>
            </div>

            <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                <HelpCircle className="w-32 h-32" />
              </div>
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total de Perguntas</h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-white">{metrics.totalQuestions}</span>
                <span className="text-sm text-indigo-400 font-medium pb-1">Enviadas na plataforma</span>
              </div>
            </div>

            <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                <UserCheck className="w-32 h-32" />
              </div>
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Painel de Oradores</h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-white">{metrics.speakersCount}</span>
                <span className="text-sm text-sky-400 font-medium pb-1">Oradores ativos</span>
              </div>
            </div>
          </div>

          {/* Speakers Descriptive Table */}
          <div className="bg-slate-300/10 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-sm overflow-hidden mt-6">
            <div className="p-5 border-b border-slate-700/50">
              <h3 className="font-semibold text-slate-100">Tabela Descritiva de Oradores</h3>
              <p className="text-xs text-slate-500 mt-1">Lista de oradores e o seu respetivo engajamento e sessões.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-xs uppercase text-slate-400 font-bold border-b border-slate-700/50">
                  <tr>
                    <th className="px-6 py-4">Nome do Orador</th>
                    <th className="px-6 py-4">Biografia / Cargo</th>
                    <th className="px-6 py-4 text-center">Nº de Sessões</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {speakersData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        Nenhum orador registado nestas sessões.
                      </td>
                    </tr>
                  ) : (
                    speakersData.map((speaker, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                            {speaker.name?.charAt(0) || '?'}
                          </div>
                          {speaker.name || 'Sem Nome'}
                        </td>
                        <td className="px-6 py-4 text-slate-400 max-w-md truncate">
                          {speaker.bio || 'Biografia não fornecida.'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300">
                            {speaker.sessionsCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Ativo
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
