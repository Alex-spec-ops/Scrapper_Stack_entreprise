'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SearchBar from './components/SearchBar';
import JobCard from './components/JobCard';
import CompanyCard from './components/CompanyCard';
import ErrorOverlay from './components/ErrorOverlay';
import { Job, Company, JobSource, SOURCE_LABELS } from '../lib/types';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface SearchResult {
  jobs: Job[];
  companies: Company[];
  totalJobs: number;
  errors: { source: string; message: string }[];
}

interface UserSession {
  email?: string;
}

type ViewMode = 'jobs' | 'companies';

const SOURCE_IDS = Object.keys(SOURCE_LABELS) as JobSource[];

function HomeContent() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);

  const [authRequired, setAuthRequired] = useState(false);

  const lastSearchRef = useRef<{ skills: string[]; sources: string[] } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('companies');
  const [activeSource, setActiveSource] = useState<JobSource | 'all'>('all');
  const [searchedSkills, setSearchedSkills] = useState<string[]>([]);
  const [user, setUser] = useState<UserSession | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  // Check session on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({ email: session.user.email });
      }
    };
    checkUser();

    // Re-run search if params are present (from History page)
    const skillsParam = searchParams.get('skills');
    const sourcesParam = searchParams.get('sources');
    if (skillsParam) {
      const skills = skillsParam.split(',');
      const sources = sourcesParam ? sourcesParam.split(',') : SOURCE_IDS;
      handleSearch(skills, sources);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  async function handleSearch(skills: string[], sources: string[]) {
    // Vérification de l'authentification avant de lancer la recherche
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setAuthRequired(true);
      setResult(null);
      setError(null);
      return;
    }

    // Mémorise la dernière recherche pour le bouton Réessayer
    lastSearchRef.current = { skills, sources };

    setAuthRequired(false);
    setConnectionError(false);
    setLoading(true);
    setError(null);
    setResult(null);
    setSearchedSkills(skills);
    setActiveSource('all');

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills, sources }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erreur serveur');
      }

      const data: SearchResult = await res.json();
      setResult(data);

      // Save to Supabase history if logged in
      await supabase.from('search_history').insert({
        user_id: session.user.id,
        skills,
        sources,
      });
    } catch (err) {
      // Erreur réseau (pas de réponse du serveur)
      if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
        setConnectionError(true);
      } else {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredJobs =
    result?.jobs.filter((j) => activeSource === 'all' || j.source === activeSource) ?? [];

  const filteredCompanies =
    result?.companies
      .map((c) => ({
        ...c,
        jobs:
          activeSource === 'all'
            ? c.jobs
            : c.jobs.filter((j) => j.source === activeSource),
      }))
      .filter((c) => c.jobs.length > 0) ?? [];

  const sourceCounts = result
    ? SOURCE_IDS.reduce(
      (acc, s) => {
        acc[s] = result.jobs.filter((j) => j.source === s).length;
        return acc;
      },
      {} as Record<JobSource, number>
    )
    : null;

  return (
    <>
      {/* Écrans d'erreur / Auth (plein écran) */}
      {connectionError && (
        <ErrorOverlay
          mode="network"
          onRetry={() => {
            setConnectionError(false);
            if (lastSearchRef.current) {
              handleSearch(lastSearchRef.current.skills, lastSearchRef.current.sources);
            }
          }}
        />
      )}

      {authRequired && (
        <ErrorOverlay
          mode="auth"
          onClose={() => setAuthRequired(false)}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b border-white/60 bg-white/70 backdrop-blur-sm sticky top-0 z-10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:scale-105 transition-transform cursor-pointer">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">SkillHunt</span>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-gray-400">
              <span className="uppercase tracking-widest text-[10px]">5 sources</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="uppercase tracking-widest text-[10px]">Temps réel</span>
            </nav>

            <div className="h-6 w-px bg-gray-200 hidden sm:block" />

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/history"
                  className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors bg-slate-100/50 px-3 py-1.5 rounded-lg"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historique
                </Link>
                <div className="relative group">
                  <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <span className="text-xs font-bold text-gray-700 hidden sm:inline truncate max-w-[120px]">
                      {user.email?.split('@')[0]}
                    </span>
                    <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-1 z-20">
                    <Link href="/history" className="block px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-slate-50 transition-colors">
                      Mon historique
                    </Link>
                    <div className="h-px bg-slate-50 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-slate-100 hover:shadow-indigo-100"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="py-16 text-center">


          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight mb-6">
            Trouvez les entreprises qui{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              recrutent vos skills
            </span>
          </h1>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Entrez vos compétences, on scrape en temps réel les plateformes d&apos;emploi françaises
            et on détecte les entreprises qui misent sur votre profil.
          </p>

          <SearchBar onSearch={handleSearch} loading={loading} />
        </section>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <div className="w-16 h-16 border-4 border-indigo-100 rounded-full absolute" />
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute" />
              </div>
              <div className="animate-pulse">
                <p className="font-bold text-gray-800 tracking-tight">Analyse en temps réel…</p>
                <p className="text-xs text-indigo-400 mt-1 font-bold uppercase tracking-widest">
                  {searchedSkills.join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Erreur globale */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-red-700 text-sm flex items-start gap-3 max-w-2xl mx-auto mb-12 shadow-sm font-medium">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex flex-col gap-1">
              <span className="font-bold">Oups ! Quelque chose s&apos;est mal passé</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Résultats */}
        {result && !loading && (
          <section className="pb-24">
            {/* Stats bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 bg-white/40 p-1.5 pl-6 rounded-2xl border border-white/60 shadow-sm">
              <div className="py-2">
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  {result.totalJobs} <span className="font-medium text-gray-400">opportunité{result.totalJobs > 1 ? 's' : ''}</span>
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  <p className="text-sm font-bold text-indigo-600/70 uppercase tracking-widest text-[10px]">
                    {result.companies.length} société{result.companies.length > 1 ? 's' : ''} détectée{result.companies.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 bg-white/80 rounded-xl p-1.5 border border-slate-100 shadow-sm">
                <button
                  onClick={() => setViewMode('companies')}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'companies'
                      ? 'bg-slate-900 shadow-lg shadow-slate-200 text-white'
                      : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  Sociétés
                </button>
                <button
                  onClick={() => setViewMode('jobs')}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'jobs'
                      ? 'bg-slate-900 shadow-lg shadow-slate-200 text-white'
                      : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  Postes
                </button>
              </div>
            </div>

            {/* Source filter tabs */}
            {sourceCounts && (
              <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto pb-4 sm:pb-0 scrollbar-hide">
                <button
                  onClick={() => setActiveSource('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${activeSource === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                      : 'bg-white text-gray-400 border-slate-200 hover:border-slate-300'
                    }`}
                >
                  TOUTES ({result.totalJobs})
                </button>
                {SOURCE_IDS.filter((s) => (sourceCounts[s] ?? 0) > 0).map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSource(s)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${activeSource === s
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                        : 'bg-white text-gray-400 border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    {SOURCE_LABELS[s].toUpperCase()} ({sourceCounts[s]})
                  </button>
                ))}
              </div>
            )}

            {/* Vue entreprises */}
            {viewMode === 'companies' && (
              <div className="grid grid-cols-1 gap-6">
                {filteredCompanies.length === 0 ? (
                  <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                    <p className="font-bold text-gray-300 uppercase tracking-widest text-xs">
                      Zéro résultat
                    </p>
                  </div>
                ) : (
                  filteredCompanies.map((company) => (
                    <CompanyCard key={company.name} company={company} />
                  ))
                )}
              </div>
            )}

            {/* Vue offres */}
            {viewMode === 'jobs' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                {filteredJobs.length === 0 ? (
                  <div className="col-span-full text-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                    <p className="font-bold text-gray-300 uppercase tracking-widest text-xs">
                      Zéro résultat
                    </p>
                  </div>
                ) : (
                  filteredJobs.map((job) => <JobCard key={job.id} job={job} />)
                )}
              </div>
            )}
          </section>
        )}

        {/* Empty state initial */}
        {!result && !loading && !error && (
          <div className="text-center pb-24">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Popular Skills</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
              {[
                { name: 'Python', color: 'from-[#4B8BBE] to-[#FFE873]' },
                { name: 'React', color: 'from-[#61DAFB] to-[#2188FF]' },
                { name: 'DevOps', color: 'from-[#2496ED] to-[#01DB80]' },
                { name: 'Node.js', color: 'from-[#339933] to-[#83CD29]' },
                { name: 'TypeScript', color: 'from-[#3178C6] to-[#007ACC]' },
              ].map((example) => (
                <button
                  key={example.name}
                  onClick={() =>
                    handleSearch(
                      [example.name],
                      ['wttj', 'francetravail', 'lesjeudis', 'adzuna', 'meteojob']
                    )
                  }
                  className={`group relative p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 overflow-hidden`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${example.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                  <span className="relative font-extrabold text-gray-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                    {example.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-50 grayscale hover:grayscale-0 transition-all">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Connecté avec</span>
            <span className="font-bold text-indigo-600 text-xs">Supabase</span>
          </div>
          <p className="text-xs text-gray-400 font-medium">
            SkillHunt agrège en temps réel les données de recrutement du marché français.
          </p>
          <p className="mt-2 text-[10px] text-gray-300">
            &copy; 2026 SkillHunt. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
