"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Se já estiver logado, redireciona para admin
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = "/admin";
      }
    });
  }, [supabase]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Conta criada com sucesso! Verifique seu e-mail ou faça login (se o e-mail não for obrigatório no seu Supabase).");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/admin";
      }
    } catch (err: any) {
      alert("Erro de Autenticação: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Efeito visual decorativo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Talent Dashboard
          </h1>
          <p className="text-neutral-400 mt-2 text-sm">
            {isSignUp ? "Crie sua conta administrativa" : "Faça login para gerenciar os eventos"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5 relative z-10">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="admin@talent.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white font-medium py-3 rounded-lg transition-colors mt-2"
          >
            {isLoading ? "Processando..." : (isSignUp ? "Criar Conta" : "Entrar no Sistema")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500 relative z-10">
          {isSignUp ? (
            <p>
              Já possui conta? <button onClick={() => setIsSignUp(false)} className="text-indigo-400 hover:text-indigo-300">Fazer login</button>
            </p>
          ) : (
            <p>
              Para testes MVP: <button onClick={() => setIsSignUp(true)} className="text-indigo-400 hover:text-indigo-300">Criar uma conta agora</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
