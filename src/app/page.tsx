export default function Home() {
  const testEventId = "00000000-0000-0000-0000-000000000001";

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-md bg-neutral-900 p-8 rounded-2xl shadow-2xl border border-neutral-800 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent mb-4">
          Talent AI
        </h1>
        <p className="text-neutral-400 mb-8">
          O Cérebro do seu evento ao vivo.
        </p>

        <div className="space-y-4">
          <a
            href={`/event/${testEventId}/live`}
            className="block w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-4 px-4 rounded-xl transition-colors"
          >
            📺 Acessar Painel do Palestrante (Live)
          </a>
          
          <a
            href={`/event/${testEventId}/join`}
            className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 px-4 rounded-xl transition-colors"
          >
            📱 Acessar Tela do Público (Join)
          </a>
        </div>
      </div>
    </div>
  );
}
