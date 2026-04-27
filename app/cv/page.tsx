'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const ALL_SOURCES = [
  { id: 'wttj', label: 'Welcome to the Jungle' },
  { id: 'francetravail', label: 'France Travail' },
  { id: 'lesjeudis', label: 'LesJeudis' },
  { id: 'adzuna', label: 'Adzuna' },
  { id: 'meteojob', label: 'Meteojob' },
  { id: 'indeed', label: 'Indeed' },
];

const ALL_COUNTRIES = [
  { id: 'fr', label: '🇫🇷 France' },
  { id: 'be', label: '🇧🇪 Belgique' },
];

type Step = 'upload' | 'review';

export default function CvPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const [skills, setSkills] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(ALL_SOURCES.map((s) => s.id));
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['fr']);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function parseCV(file: File) {
    if (file.type !== 'application/pdf') {
      setParseError('Seuls les fichiers PDF sont acceptés.');
      return;
    }

    setParsing(true);
    setParseError(null);
    setFileName(file.name);

    try {
      const form = new FormData();
      form.append('cv', file);

      const res = await fetch('/api/parse-cv', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Erreur lors de l\'analyse');

      setSkills(data.skills as string[]);
      setStep('review');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setParsing(false);
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    parseCV(files[0]);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b, 'fr')));
    }
    setTagInput('');
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && tagInput === '' && skills.length > 0) {
      setSkills((prev) => prev.slice(0, -1));
    }
  }

  function toggleSource(id: string) {
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function toggleCountry(id: string) {
    setSelectedCountries((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      return next.length === 0 ? prev : next;
    });
  }

  async function handleSearch() {
    if (skills.length === 0 || selectedSources.length === 0) return;

    // Vérifie l'auth avant de naviguer
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/login');
      return;
    }

    const params = new URLSearchParams({
      skills: skills.join(','),
      sources: selectedSources.join(','),
      countries: selectedCountries.join(','),
    });
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b border-white/60 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:scale-105 transition-transform cursor-pointer">
            <img src="/skill_hunt.png" alt="SkillHunt logo" className="w-8 h-8 rounded-lg object-cover shadow-lg shadow-indigo-100" />
            <span className="font-bold text-gray-900 text-lg tracking-tight">SkillHunt</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100 font-bold text-[10px] uppercase tracking-wide">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Analyser un CV
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <Link href="/" className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-indigo-600 transition-colors">
              Recherche manuelle
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ── STEP 1 : Upload ── */}
        {step === 'upload' && (
          <div className="flex flex-col items-center gap-8">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
                Analysez votre{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  CV
                </span>
              </h1>
              <p className="text-gray-500 text-lg font-medium max-w-xl mx-auto">
                Déposez votre CV en PDF — on détecte automatiquement vos compétences et on lance la recherche pour vous.
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => !parsing && fileInputRef.current?.click()}
              className={`w-full rounded-3xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-5 py-20 px-8 text-center
                ${dragging
                  ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'}
                ${parsing ? 'pointer-events-none opacity-70' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              {parsing ? (
                <>
                  <div className="relative w-16 h-16">
                    <div className="w-16 h-16 border-4 border-indigo-100 rounded-full absolute" />
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">Analyse en cours…</p>
                    <p className="text-sm text-gray-400 mt-1">{fileName}</p>
                  </div>
                </>
              ) : (
                <>
                  {/* PDF icon */}
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                    <svg className={`w-10 h-10 transition-colors ${dragging ? 'text-indigo-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-lg">
                      {dragging ? 'Relâchez pour analyser' : 'Glissez votre CV ici'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">ou cliquez pour sélectionner un fichier</p>
                    <p className="text-xs text-gray-300 mt-2 font-medium uppercase tracking-widest">PDF uniquement</p>
                  </div>
                </>
              )}
            </div>

            {parseError && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-5 py-3 text-sm font-medium w-full">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {parseError}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2 : Review ── */}
        {step === 'review' && (
          <div className="flex flex-col gap-8">
            {/* Header review */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Compétences détectées</h1>
                <p className="text-gray-400 mt-1 text-sm font-medium">depuis <span className="text-gray-600 font-bold">{fileName}</span></p>
              </div>
              <button
                onClick={() => { setStep('upload'); setSkills([]); setParseError(null); }}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors bg-white border border-slate-200 rounded-xl px-3 py-2 flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Changer de CV
              </button>
            </div>

            {skills.length === 0 ? (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
                <p className="font-bold text-amber-700 mb-1">Aucune compétence reconnue</p>
                <p className="text-sm text-amber-600">Le contenu du CV n&apos;a pas permis de détecter des compétences tech connues. Ajoutez-en manuellement ci-dessous.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {skills.length} compétence{skills.length > 1 ? 's' : ''} trouvée{skills.length > 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={() => setSkills([])}
                    className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors"
                  >
                    Tout effacer
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg px-3 py-1.5 text-sm font-semibold"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="hover:text-indigo-900 transition-colors"
                        type="button"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ajouter manuellement */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ajouter une compétence</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Ex: Docker, Python…"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <button
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all"
                >
                  Ajouter
                </button>
              </div>
            </div>

            {/* Filtres pays */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Pays</p>
              <div className="flex flex-wrap gap-2">
                {ALL_COUNTRIES.map((country) => (
                  <button
                    key={country.id}
                    onClick={() => toggleCountry(country.id)}
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedCountries.includes(country.id)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {country.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtres sources */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Sources</p>
              <div className="flex flex-wrap gap-2">
                {ALL_SOURCES.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => toggleSource(source.id)}
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedSources.includes(source.id)
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {source.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleSearch}
              disabled={skills.length === 0 || selectedSources.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white font-bold py-4 rounded-2xl text-base transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Rechercher les offres correspondantes
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
