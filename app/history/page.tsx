import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface HistoryItem {
  id: string;
  skills: string[];
  sources: string[];
  created_at: string;
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: history, error } = await supabase
    .from('search_history')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Header */}
      <header className="border-b border-white/60 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:scale-105 transition-transform">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">SkillHunt</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 font-medium">Historique</span>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              Retour à la recherche
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Votre historique</h1>
            <p className="text-gray-500 mt-1">Retrouvez toutes vos recherches passées en un clin d&apos;œil.</p>
          </div>
          <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            {history?.length ?? 0} recherche{(history?.length ?? 0) > 1 ? 's' : ''}
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm">
            Erreur lors de la récupération de l&apos;historique : {error.message}
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-4">
            {history.map((item: HistoryItem) => (
              <div 
                key={item.id}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all group relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.skills.map((skill) => (
                        <span key={skill} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-md">
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(item.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                       {/* Mock avatars/icons for sources */}
                       {item.sources.slice(0, 3).map((source) => (
                         <div key={source} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase">
                           {source.charAt(0)}
                         </div>
                       ))}
                       {item.sources.length > 3 && (
                         <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                           +{item.sources.length - 3}
                         </div>
                       )}
                    </div>
                    <Link 
                      href={`/?skills=${item.skills.join(',')}&sources=${item.sources.join(',')}`}
                      className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-slate-100 group-hover:shadow-indigo-100"
                    >
                      Relancer
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm shadow-slate-50">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun historique</h3>
            <p className="text-gray-400 max-w-sm mx-auto text-sm mb-8">
              Vous n&apos;avez pas encore effectué de recherche. Vos recherches apparaîtront ici dès que vous aurez commencé.
            </p>
            <Link href="/" className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
              Commencer une recherche
            </Link>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-gray-100 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-gray-400">
          <p>SkillHunt History &copy; 2026. Toutes vos données sont sécurisées par Supabase.</p>
        </div>
      </footer>
    </div>
  );
}
