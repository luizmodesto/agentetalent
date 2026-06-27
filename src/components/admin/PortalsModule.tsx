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

export function PortalsModule({ eventId, supabase }: { eventId: string | null, supabase: any }) {
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
