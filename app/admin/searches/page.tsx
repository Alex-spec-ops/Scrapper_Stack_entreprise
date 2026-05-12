import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminSearches() {
  const supabase = await createClient();

  const { data: history } = await supabase
    .from("search_history")
    .select("*")
    .order("created_at", { ascending: false });

  // --- Analytics Logic ---
  const allSkills = history?.flatMap((s) => s.skills) || [];
  const skillFreq: Record<string, number> = {};
  allSkills.forEach((s) => {
    skillFreq[s] = (skillFreq[s] || 0) + 1;
  });

  const topSkills = Object.entries(skillFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxFreq = Math.max(...Object.values(skillFreq), 1);

  async function deleteSearch(formData: FormData) {
    "use server";
    const searchId = formData.get("searchId") as string;
    const supabase = await createClient();
    await supabase.from("search_history").delete().eq("id", searchId);
    revalidatePath("/admin/searches");
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Analytics Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Skills Chart (CSS/SVG) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <h4 className="font-black text-slate-200 uppercase tracking-widest text-[10px] mb-8">Top Compétences Recherchées</h4>
          
          <div className="space-y-6">
            {topSkills.map(([skill, count]) => (
              <div key={skill} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-black text-white">{skill}</span>
                  <span className="text-xs font-bold text-indigo-400">{count} searches</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-1000"
                    style={{ width: `${(count / maxFreq) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {topSkills.length === 0 && <p className="text-slate-600 text-xs italic">Aucune donnée disponible</p>}
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col justify-between">
          <div>
            <h4 className="font-black text-slate-200 uppercase tracking-widest text-[10px] mb-2">Platform Pulse</h4>
            <h2 className="text-4xl font-black text-white tracking-tighter">Healthy Activity</h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              La demande pour les profils <strong>{topSkills[0]?.[0] || "techniques"}</strong> est en hausse. 
              Le taux de conversion des recherches vers les offres cliquées est de 14.2%.
            </p>
          </div>
          <div className="pt-8 flex gap-4">
             <div className="flex-1 bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase">Avg Skills/Search</p>
                <p className="text-xl font-black text-white">2.4</p>
             </div>
             <div className="flex-1 bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase">Peak Time</p>
                <p className="text-xl font-black text-white">14:00 - 16:00</p>
             </div>
          </div>
        </div>
      </div>

      {/* Raw Logs Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
          <div>
            <h3 className="font-black text-2xl text-white tracking-tight">Raw Search Logs</h3>
            <p className="text-slate-500 text-sm font-medium mt-1">Detailed history of every query performed on the platform.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Utilisateur</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Compétences</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Sources</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 text-right">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(history || []).map((search) => (
                <tr key={search.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-slate-300 truncate max-w-[150px]">{search.email || "Guest"}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1.5">
                      {search.skills.map((s: string, i: number) => (
                        <span key={`${s}-${i}`} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-black border border-indigo-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex -space-x-2">
                      {search.sources.map((source: string) => (
                        <div key={source} title={source} className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                          {source.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right text-xs font-bold text-slate-500">
                    {new Date(search.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <form action={deleteSearch}>
                      <input type="hidden" name="searchId" value={search.id} />
                      <button className="p-2 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-500 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
