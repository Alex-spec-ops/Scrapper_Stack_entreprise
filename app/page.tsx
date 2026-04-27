'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SearchBar from './components/SearchBar';
import JobCard from './components/JobCard';
import CompanyCard from './components/CompanyCard';
import ErrorOverlay from './components/ErrorOverlay';
import { Job, Company, JobSource, Country, SOURCE_LABELS } from '../lib/types';
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

  const lastSearchRef = useRef<{ skills: string[]; sources: string[]; countries: string[] } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('companies');
  const [activeSource, setActiveSource] = useState<JobSource | 'all'>('all');
  const [activeCountry, setActiveCountry] = useState<Country | 'all'>('all');
  const [activeCity, setActiveCity] = useState<string>('all');
  const [activeContract, setActiveContract] = useState<string>('all');
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
    const countriesParam = searchParams.get('countries');
    if (skillsParam) {
      const skills = skillsParam.split(',');
      const sources = sourcesParam ? sourcesParam.split(',') : SOURCE_IDS;
      const countries = countriesParam ? countriesParam.split(',') : ['fr'];
      handleSearch(skills, sources, countries);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  async function handleSearch(skills: string[], sources: string[], countries: string[] = ['fr']) {
    // Vérification de l'authentification avant de lancer la recherche
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setAuthRequired(true);
      setResult(null);
      setError(null);
      return;
    }

    // Mémorise la dernière recherche pour le bouton Réessayer
    lastSearchRef.current = { skills, sources, countries };

    setAuthRequired(false);
    setConnectionError(false);
    setLoading(true);
    setError(null);
    setResult(null);
    setSearchedSkills(skills);
    setActiveSource('all');
    setActiveCountry('all');
    setActiveCity('all');
    setActiveContract('all');

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills, sources, countries }),
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

  function normalizeCity(location: string): string {
    return location.split(/[,(]/)[0].trim();
  }

  function normalizeContract(raw: string): string {
    const t = raw.toLowerCase().trim();
    if (t === 'cdi' || t === 'full_time' || t === 'permanent') return 'CDI';
    if (t === 'cdd' || t === 'fixed_term' || t === 'temporary') return 'CDD';
    if (t.includes('stage') || t === 'internship') return 'Stage';
    if (t.includes('alternance') || t.includes('apprenti') || t === 'apprenticeship') return 'Alternance';
    if (t.includes('freelance') || t.includes('indépendant') || t === 'contractor') return 'Freelance';
    if (t.includes('intérim') || t.includes('interim') || t === 'mis' || t === 'din') return 'Intérim';
    if (t.includes('partiel') || t === 'part_time') return 'Temps partiel';
    if (t === 'sai' || t.includes('saisonnier')) return 'Saisonnier';
    return raw.trim();
  }

  const availableCities: string[] = result
    ? Array.from(
        new Set(
          result.jobs
            .map((j) => normalizeCity(j.location))
            .filter((c) => c.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, 'fr'))
    : [];

  // Ordre d'affichage souhaité pour les types de contrat courants
  const CONTRACT_ORDER = ['CDI', 'CDD', 'Alternance', 'Stage', 'Freelance', 'Intérim', 'Temps partiel', 'Saisonnier'];

  const availableContracts: string[] = result
    ? Array.from(
        new Set(
          result.jobs
            .map((j) => (j.contractType ? normalizeContract(j.contractType) : ''))
            .filter((c) => c.length > 0)
        )
      ).sort((a, b) => {
        const ia = CONTRACT_ORDER.indexOf(a);
        const ib = CONTRACT_ORDER.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b, 'fr');
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
    : [];

  const jobMatchesFilters = (j: { source: string; location: string; contractType?: string; country?: string }) =>
    (activeSource === 'all' || j.source === activeSource) &&
    (activeCountry === 'all' || j.country === activeCountry) &&
    (activeCity === 'all' || normalizeCity(j.location) === activeCity) &&
    (activeContract === 'all' || (j.contractType ? normalizeContract(j.contractType) : '') === activeContract);

  const filteredJobs = result?.jobs.filter(jobMatchesFilters) ?? [];

  const filteredCompanies =
    result?.companies
      .map((c) => ({ ...c, jobs: c.jobs.filter(jobMatchesFilters) }))
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

  const COUNTRY_META: { id: Country; flag: string; label: string }[] = [
    { id: 'fr', flag: '🇫🇷', label: 'France' },
    { id: 'be', flag: '🇧🇪', label: 'Belgique' },
  ];

  const countryCounts = result
    ? COUNTRY_META.reduce(
        (acc, c) => {
          acc[c.id] = result.jobs.filter((j) => j.country === c.id).length;
          return acc;
        },
        {} as Record<Country, number>
      )
    : null;

  const hasMultipleCountries =
    countryCounts !== null &&
    COUNTRY_META.filter((c) => (countryCounts[c.id] ?? 0) > 0).length > 1;

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
            <img src="/skill_hunt.png" alt="SkillHunt logo" className="w-8 h-8 rounded-lg object-cover shadow-lg shadow-indigo-100" />
            <span className="font-bold text-gray-900 text-lg tracking-tight">SkillHunt</span>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-gray-400">
              <span className="uppercase tracking-widest text-[10px]">5 sources</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="uppercase tracking-widest text-[10px]">Temps réel</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <Link
                href="/cv"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 font-bold text-[10px] uppercase tracking-wide"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Analyser un CV
              </Link>
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

          <div className="flex justify-center mb-4">
            <Link
              href="/cv"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-300 text-indigo-600 font-bold text-xs uppercase tracking-wide transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Analyser un CV à la place
            </Link>
          </div>

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
                  {filteredJobs.length}
                  {filteredJobs.length !== result.totalJobs && (
                    <span className="text-base font-medium text-gray-300 ml-2">/ {result.totalJobs}</span>
                  )}
                  {' '}<span className="font-medium text-gray-400">opportunité{filteredJobs.length > 1 ? 's' : ''}</span>
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  <p className="text-sm font-bold text-indigo-600/70 uppercase tracking-widest text-[10px]">
                    {filteredCompanies.length} société{filteredCompanies.length > 1 ? 's' : ''} détectée{filteredCompanies.length > 1 ? 's' : ''}
                    {filteredCompanies.length !== result.companies.length && (
                      <span className="text-indigo-300 font-medium"> / {result.companies.length}</span>
                    )}
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

            {/* Country filter tabs — visible uniquement si les deux pays ont des résultats */}
            {hasMultipleCountries && countryCounts && (
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => { setActiveCountry('all'); setActiveCity('all'); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                    activeCountry === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                      : 'bg-white text-gray-400 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  Tous les pays ({result!.totalJobs})
                </button>
                {COUNTRY_META.filter((c) => (countryCounts[c.id] ?? 0) > 0).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setActiveCountry(c.id); setActiveCity('all'); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                      activeCountry === c.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                        : 'bg-white text-gray-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {c.flag} {c.label} ({countryCounts[c.id]})
                  </button>
                ))}
              </div>
            )}

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

            {/* Filtres Ville + Contrat */}
            {(availableCities.length > 0 || availableContracts.length > 0) && (
              <div className="flex flex-wrap gap-3 mb-10">

                {/* Ville */}
                {availableCities.length > 0 && (
                  <div className={`flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl border bg-white shadow-sm transition-all ${activeCity !== 'all' ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
                    <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <select
                      value={activeCity}
                      onChange={(e) => setActiveCity(e.target.value)}
                      className="appearance-none bg-transparent text-sm font-semibold text-gray-700 cursor-pointer focus:outline-none pr-5"
                    >
                      <option value="all">Toutes les villes</option>
                      {availableCities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                    {activeCity !== 'all' ? (
                      <button onClick={() => setActiveCity('all')} className="ml-1 p-0.5 rounded-full hover:bg-indigo-100 text-indigo-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-slate-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Type de contrat */}
                {availableContracts.length > 0 && (
                  <div className={`flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl border bg-white shadow-sm transition-all ${activeContract !== 'all' ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
                    <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <select
                      value={activeContract}
                      onChange={(e) => setActiveContract(e.target.value)}
                      className="appearance-none bg-transparent text-sm font-semibold text-gray-700 cursor-pointer focus:outline-none pr-5"
                    >
                      <option value="all">Tous les contrats</option>
                      {availableContracts.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {activeContract !== 'all' ? (
                      <button onClick={() => setActiveContract('all')} className="ml-1 p-0.5 rounded-full hover:bg-indigo-100 text-indigo-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-slate-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                )}

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
