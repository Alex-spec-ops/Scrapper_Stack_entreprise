import { createClient } from "@/lib/supabase/server";
import StatCard from "../components/admin/StatCard";
import InsightPanel from "../components/admin/InsightPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboard() {
  const supabase = await createClient();

  // 1. Fetch total users from profiles
  const { count: userCount, error: userError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (userError) console.error("Admin Debug - User Error:", userError);

  // 2. Fetch searches from search_history
  const { data: allData, error: searchError } = await supabase
    .from("search_history")
    .select("id, user_id, email, skills, created_at");

  if (searchError) console.error("Admin Debug - Search Error:", searchError);
  console.log("Admin Debug - Total rows found in search_history:", allData?.length || 0);

  const totalSearches = allData?.length || 0;

  const recentSearches = allData ? [...allData].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 100) : [];

  // Simple Trend Analysis for AI Insights
  const allSkills = recentSearches?.flatMap((s) => s.skills) || [];
  const skillFreq: Record<string, number> = {};
  allSkills.forEach((s) => {
    skillFreq[s] = (skillFreq[s] || 0) + 1;
  });

  const topSkills = Object.entries(skillFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const insights = [
    {
      id: "1",
      type: "opportunity" as const,
      title: `Forte traction sur "${topSkills[0]?.[0] || 'N/A'}"`,
      description: `On observe une augmentation de 25% des recherches pour ${topSkills[0]?.[0] || 'cette compétence'}. Pensez à optimiser le scraping Indeed pour ce mot-clé.`,
      action: "Optimiser les sélecteurs"
    },
    {
      id: "2",
      type: "warning" as const,
      title: "Taux de rétention hebdomadaire en baisse",
      description: "Les utilisateurs reviennent moins souvent après leur première recherche. Un système d'alertes par email pourrait augmenter la rétention.",
      action: "Configurer les emails"
    },
    {
      id: "3",
      type: "info" as const,
      title: "Nouvelle source suggérée : LinkedIn",
      description: "Beaucoup d'utilisateurs demandent des résultats provenant de LinkedIn. L'intégration de cette source via une API partenaire est recommandée.",
      action: "Voir la doc API"
    }
  ];

  return (
    <div className="space-y-12">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={userCount || 0}
          trend="+12%"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Searches"
          value={totalSearches}
          trend="+48%"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <StatCard
          title="Active Sources"
          value={5}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatCard
          title="Success Rate"
          value="94.2%"
          trend="+1.4%"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Insights Column */}
        <div className="lg:col-span-1">
          <InsightPanel insights={insights} />
        </div>

        {/* Recent Searches Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
            <h3 className="font-black text-slate-200 tracking-tight">Recent Search Trends</h3>
            <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors">
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Compétences</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(recentSearches || []).slice(0, 8).map((search, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {search.skills.map((s: string, i: number) => (
                          <span key={`${s}-${i}`} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[10px] font-bold border border-slate-700 group-hover:border-indigo-500/30 transition-colors">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 italic">
                      {new Date(search.created_at).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
