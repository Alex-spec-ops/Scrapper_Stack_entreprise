'use client';

interface Props {
  onRetry: () => void;
}

export default function ConnectionError({ onRetry }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Animated background rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-[600px] h-[600px] rounded-full border border-white/5 animate-ping-slow absolute -translate-x-1/2 -translate-y-1/2" />
          <div className="w-[450px] h-[450px] rounded-full border border-white/5 animate-ping-slower absolute -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '0.5s' }} />
          <div className="w-[300px] h-[300px] rounded-full border border-white/10 animate-ping-slowest absolute -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      <style>{`
        @keyframes ping-slow {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
        }
        .animate-ping-slow { animation: ping-slow 3s ease-out infinite; }
        .animate-ping-slower { animation: ping-slow 3s ease-out infinite; animation-delay: 0.8s; }
        .animate-ping-slowest { animation: ping-slow 3s ease-out infinite; animation-delay: 1.6s; }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-float { animation: float 3.5s ease-in-out infinite; }

        @keyframes dash {
          0% { stroke-dashoffset: 300; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-dash { animation: dash 1.5s ease-in-out forwards; }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        .animate-blink { animation: blink 1.2s ease-in-out infinite; }
      `}</style>

      {/* Card */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8 py-12 max-w-md w-full text-center">

        {/* Animated icon */}
        <div className="animate-float">
          <div className="relative w-28 h-28">
            {/* Glow */}
            <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl" />
            {/* Circle */}
            <div className="absolute inset-0 rounded-full bg-slate-800 border border-red-500/30 flex items-center justify-center">
              <svg viewBox="0 0 80 80" className="w-20 h-20" fill="none">
                {/* WiFi bars crossed */}
                <circle cx="40" cy="40" r="26" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" className="animate-blink" />
                {/* No signal arcs */}
                <path d="M24 40 Q40 20 56 40" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M29 47 Q40 30 51 47" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                {/* Center dot */}
                <circle cx="40" cy="54" r="3.5" fill="#cbd5e1" />
                {/* Red X slash */}
                <line x1="22" y1="22" x2="58" y2="58" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray="52"
                  strokeDashoffset="52"
                  className="animate-dash"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Problème de connexion
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Impossible de joindre les serveurs de SkillHunt.<br />
            Vérifiez votre connexion internet et réessayez.
          </p>
        </div>

        {/* Status indicators */}
        <div className="flex flex-col gap-2 w-full">
          {[
            { label: 'Serveur API', ok: false },
            { label: 'Connexion Internet', ok: false },
            { label: 'DNS', ok: null },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-4 py-2.5 border border-white/5">
              <span className="text-xs text-slate-400 font-medium">{label}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    ok === false
                      ? 'bg-red-500 animate-blink'
                      : ok === null
                      ? 'bg-amber-400 animate-blink'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className={`text-xs font-bold ${ok === false ? 'text-red-400' : ok === null ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {ok === false ? 'Hors ligne' : ok === null ? 'Vérification...' : 'OK'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onRetry}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Réessayer
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition-all border border-white/5 text-sm"
          >
            Recharger la page
          </button>
        </div>
      </div>
    </div>
  );
}
