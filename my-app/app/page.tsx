'use client';

import { useState } from 'react';
import SearchBar from './components/SearchBar';
import JobCard from './components/JobCard';
import CompanyCard from './components/CompanyCard';
import { Job, Company, JobSource, SOURCE_LABELS } from '../lib/types';

interface SearchResult {
  jobs: Job[];
  companies: Company[];
  totalJobs: number;
  errors: { source: string; message: string }[];
}

type ViewMode = 'jobs' | 'companies';

const SOURCE_IDS = Object.keys(SOURCE_LABELS) as JobSource[];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('companies');
  const [activeSource, setActiveSource] = useState<JobSource | 'all'>('all');
  const [searchedSkills, setSearchedSkills] = useState<string[]>([]);

  async function handleSearch(skills: string[], sources: string[]) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b border-white/60 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">SkillHunt</span>
            <span className="hidden sm:inline text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">France</span>
          </div>
          <nav className="flex items-center gap-4 text-sm text-gray-500">
            <span>5 sources</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
            <span>Temps réel</span>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 text-sm text-indigo-700 font-medium mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
            Indeed · WTTJ · APEC · France Travail · Jobteaser
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-4">
            Trouvez les entreprises qui{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              recrutent vos skills
            </span>
          </h1>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
            Entrez vos compétences, on scrape en temps réel les 5 plus grandes plateformes
            d&apos;emploi françaises et on vous affiche les offres et les entreprises qui recrutent.
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
              <div>
                <p className="font-semibold text-gray-800">Scraping en cours…</p>
                <p className="text-sm text-gray-400 mt-1">
                  On interroge les 5 plateformes pour{' '}
                  <span className="text-indigo-600 font-medium">
                    {searchedSkills.join(', ')}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Erreur globale */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-start gap-3 max-w-2xl mx-auto mb-8">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        {/* Résultats */}
        {result && !loading && (
          <section className="pb-16">
            {/* Stats bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {result.totalJobs} offre{result.totalJobs > 1 ? 's' : ''} trouvée{result.totalJobs > 1 ? 's' : ''}
                </h2>
                <p className="text-sm text-gray-500">
                  {result.companies.length} entreprise{result.companies.length > 1 ? 's' : ''} · pour{' '}
                  <span className="font-medium text-gray-700">{searchedSkills.join(', ')}</span>
                </p>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('companies')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'companies'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Par entreprise
                </button>
                <button
                  onClick={() => setViewMode('jobs')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'jobs'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Par offre
                </button>
              </div>
            </div>

            {/* Source filter tabs */}
            {sourceCounts && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setActiveSource('all')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    activeSource === 'all'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  Toutes ({result.totalJobs})
                </button>
                {SOURCE_IDS.filter((s) => (sourceCounts[s] ?? 0) > 0).map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSource(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      activeSource === s
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {SOURCE_LABELS[s]} ({sourceCounts[s]})
                  </button>
                ))}
              </div>
            )}

            {/* Erreurs partielles */}
            {result.errors.length > 0 && (
              <details className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <summary className="text-sm text-amber-700 font-medium cursor-pointer">
                  {result.errors.length} source{result.errors.length > 1 ? 's' : ''} avec erreur
                </summary>
                <ul className="mt-2 space-y-1">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-amber-600">{e.message}</li>
                  ))}
                </ul>
              </details>
            )}

            {/* Vue entreprises */}
            {viewMode === 'companies' && (
              <div className="space-y-4">
                {filteredCompanies.length === 0 ? (
                  <p className="text-center text-gray-400 py-12">
                    Aucune entreprise trouvée pour cette sélection.
                  </p>
                ) : (
                  filteredCompanies.map((company) => (
                    <CompanyCard key={company.name} company={company} />
                  ))
                )}
              </div>
            )}

            {/* Vue offres */}
            {viewMode === 'jobs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredJobs.length === 0 ? (
                  <p className="text-center text-gray-400 py-12 col-span-full">
                    Aucune offre trouvée pour cette sélection.
                  </p>
                ) : (
                  filteredJobs.map((job) => <JobCard key={job.id} job={job} />)
                )}
              </div>
            )}
          </section>
        )}

        {/* Empty state initial */}
        {!result && !loading && !error && (
          <div className="text-center pb-20">
            <p className="text-sm text-gray-400 mb-4">Essayez avec un exemple :</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-3xl mx-auto">
              {[
                { name: 'Python', color: 'from-yellow-400 to-orange-400' },
                { name: 'React', color: 'from-blue-400 to-cyan-400' },
                { name: 'DevOps', color: 'from-green-400 to-teal-400' },
                { name: 'Data Science', color: 'from-purple-400 to-pink-400' },
                { name: 'Java', color: 'from-red-400 to-orange-400' },
              ].map((example) => (
                <button
                  key={example.name}
                  onClick={() =>
                    handleSearch(
                      [example.name],
                      ['indeed', 'wttj', 'apec', 'francetravail', 'jobteaser']
                    )
                  }
                  className={`p-4 rounded-xl bg-gradient-to-br ${example.color} text-white font-semibold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200`}
                >
                  {example.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-gray-400">
          <p>
            SkillHunt agrège les offres d&apos;emploi de Indeed, Welcome to the Jungle, APEC,
            France Travail et Jobteaser.
          </p>
          <p className="mt-1">Les données appartiennent à leurs propriétaires respectifs.</p>
        </div>
      </footer>
    </div>
  );
}
