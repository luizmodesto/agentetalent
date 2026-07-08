"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

export default function EcraPairingPage() {
  const [buttonText, setButtonText] = useState("CONECTAR ECRÃ");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleConnect = async () => {
    setButtonText("A VERIFICAR...");
    const val = inputRef.current?.value.trim().toUpperCase() || "";
    
    if (val.length >= 4) {
      try {
        // Find an event with the matching pairing code in its personality JSON
        const { data: events, error } = await supabase.from('events').select('id, personality');
        
        if (error) throw error;
        
        let foundEventId = null;
        
        if (events) {
          for (const ev of events) {
            if (ev.personality) {
              try {
                const config = JSON.parse(ev.personality);
                if (config.pairing_code === val) {
                  foundEventId = ev.id;
                  break;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        if (foundEventId) {
          setButtonText("CONECTADO! A REDIRECIONAR...");
          setTimeout(() => {
            router.push(`/event/${foundEventId}/live-qa?code=${val}`);
          }, 1000);
        } else {
          setButtonText("CÓDIGO INVÁLIDO!");
          setTimeout(() => setButtonText("CONECTAR ECRÃ"), 2000);
        }
      } catch (err) {
        console.error(err);
        setButtonText("ERRO NA CONEXÃO");
        setTimeout(() => setButtonText("CONECTAR ECRÃ"), 2000);
      }
    } else {
      setButtonText("CÓDIGO INVÁLIDO!");
      setTimeout(() => setButtonText("CONECTAR ECRÃ"), 2000);
    }
  };

  return (
    <div className="h-screen w-full bg-[#1E222B] text-white flex items-center justify-center font-sans">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-10 rounded-3xl flex flex-col items-center shadow-2xl max-w-md w-full">
        <h2 className="text-2xl font-black mb-2 tracking-widest text-center uppercase">Ligar ao Evento</h2>
        <p className="text-slate-400 text-sm mb-8 text-center">Introduza o código de pareamento visível no Painel de Controlo.</p>
        <input 
          ref={inputRef}
          type="text" 
          defaultValue=""
          maxLength={6}
          placeholder="EX: A7B2"
          className="w-full bg-slate-800/80 border border-slate-600 rounded-xl px-4 py-4 text-center text-3xl font-black tracking-widest text-emerald-400 mb-6 focus:outline-none focus:border-indigo-500 uppercase"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleConnect();
            }
          }}
        />
        <button 
          onClick={handleConnect}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors tracking-widest"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
