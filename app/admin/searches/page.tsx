import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSearches() {
  const supabase = await createClient();

  const { data: history } = await supabase
    .from("user_searches")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-8 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
        <div>
          <h3 className="font-black text-2xl text-white tracking-tight">Full Search Logs</h3>
          <p className="text-slate-500 text-sm font-medium mt-1">Detailed history of all user queries.</p>
        </div>
        <div className="bg-indigo-600/10 border border-indigo-500/20 px-4 py-2 rounded-xl">
          <span className="text-indigo-400 text-xs font-black uppercase tracking-widest">{history?.length || 0} Total Entries</span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50">
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">User ID</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Skills</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Sources</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(history || []).map((search) => (
              <tr key={search.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-8 py-6">
                  <code className="text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-1 rounded">
                    {search.user_id.slice(0, 8)}...
                  </code>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-wrap gap-1.5">
                    {search.skills.map((s: string) => (
                      <span key={s} className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-black border border-indigo-500/20">
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex -space-x-2">
                    {search.sources.map((source: string) => (
                      <div key={source} title={source} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
                        {source.charAt(0)}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-8 py-6 text-right text-xs font-bold text-slate-500">
                  {new Date(search.created_at).toLocaleString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
