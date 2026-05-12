interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon: React.ReactNode;
}

export default function StatCard({ title, value, trend, icon }: StatCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl shadow-indigo-500/5 group hover:border-indigo-500/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all duration-300">
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full uppercase tracking-widest">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mb-1">{title}</p>
        <h3 className="text-4xl font-black text-white tracking-tight">{value}</h3>
      </div>
    </div>
  );
}
