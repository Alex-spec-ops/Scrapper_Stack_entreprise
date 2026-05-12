interface Insight {
  id: string;
  type: "opportunity" | "warning" | "info";
  title: string;
  description: string;
  action?: string;
}

interface InsightPanelProps {
  insights: Insight[];
}

export default function InsightPanel({ insights }: InsightPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
        <h3 className="font-black text-slate-200 tracking-tight flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI Insights & Improvements
        </h3>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Beta v1.0</span>
      </div>
      <div className="divide-y divide-slate-800">
        {insights.map((insight) => (
          <div key={insight.id} className="p-6 hover:bg-white/5 transition-colors group">
            <div className="flex gap-4">
              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                insight.type === "opportunity" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" :
                insight.type === "warning" ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" :
                "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]"
              }`} />
              <div className="flex-1">
                <h4 className="font-bold text-slate-100 mb-1 group-hover:text-indigo-400 transition-colors">
                  {insight.title}
                </h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {insight.description}
                </p>
                {insight.action && (
                  <button className="mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors flex items-center gap-2">
                    {insight.action}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
