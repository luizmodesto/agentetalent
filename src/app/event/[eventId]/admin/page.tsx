"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/utils/supabase/client";

import Link from "next/link";

export default function AdminControlPanel({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  
  const [eventData, setEventData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [personality, setPersonality] = useState("");
  const [voiceConfig, setVoiceConfig] = useState("pt-BR_onyx");

  const supabase = createClient();

  useEffect(() => {
    const fetchEvent = async () => {
      const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (event) {
        setEventData(event);
        setPersonality(event.personality || "");
        setVoiceConfig(`${event.language || 'pt-BR'}_${event.voice_id || 'onyx'}`);
      }
      setIsLoading(false);
    };

    fetchEvent();
  }, [eventId, supabase]);

  const handleSave = async () => {
    setIsSaving(true);
    const [language, voice_id] = voiceConfig.split('_');
    
    const { error } = await supabase
      .from('events')
      .update({ personality, language, voice_id })
      .eq('id', eventId);
      
    setIsSaving(false);
    
    if (error) {
      alert("Erro ao salvar configurações!");
    } else {
      alert("Configurações atualizadas com sucesso!");
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Carregando painel admin...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-6">
      <div className="mb-6">
        <Link href="/admin" className="text-neutral-500 hover:text-white transition-colors text-sm font-medium flex items-center gap-1 w-fit">
          ← Voltar para Painel Global
        </Link>
      </div>
      <header className="mb-8 flex justify-between items-center bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            ⚙️ Painel de Configurações da IA
          </h1>
          <p className="text-neutral-400 mt-2">
            Configure a personalidade do Co-Host e a voz oficial do evento: <strong className="text-purple-400">{eventData?.title}</strong>
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto bg-neutral-900 p-8 rounded-2xl border border-neutral-800 space-y-8">
        
        <div>
          <label className="block text-lg font-semibold mb-2">🎭 Personalidade do Co-Host</label>
          <p className="text-sm text-neutral-400 mb-4">
            Descreva como a inteligência artificial deve se comportar. Ex: &quot;Aja com humor e use gírias jovens&quot;, ou &quot;Seja ultra corporativo, focado em diretores executivos&quot;.
          </p>
          <textarea 
            className="w-full h-32 bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="Deixe em branco para o tom padrão profissional..."
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
          ></textarea>
        </div>

        <div>
          <label className="block text-lg font-semibold mb-2">🗣️ Sotaque e Voz Oficial</label>
          <p className="text-sm text-neutral-400 mb-4">
            Escolha o sotaque em que a IA vai escrever as respostas e a voz que será utilizada na reprodução do painel ao vivo.
          </p>
          <select 
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
            value={voiceConfig}
            onChange={(e) => setVoiceConfig(e.target.value)}
          >
            <option value="pt-BR_nova">🇧🇷 Português (Brasil) - Voz Feminina (Nova)</option>
            <option value="pt-BR_onyx">🇧🇷 Português (Brasil) - Voz Masculina (Onyx)</option>
            <option value="pt-PT_shimmer">🇵🇹 Português (Portugal) - Voz Feminina (Shimmer)</option>
            <option value="pt-PT_echo">🇵🇹 Português (Portugal) - Voz Masculina (Echo)</option>
          </select>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? 'Salvando...' : '💾 Salvar Configurações'}
          </button>
        </div>

      </div>
    </div>
  );
}
