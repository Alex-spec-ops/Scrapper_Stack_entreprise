'use client';

import { useState, KeyboardEvent, useMemo } from 'react';

// Termes courants qui sont ambigus comme compétences techniques
const AMBIGUOUS_SUGGESTIONS: Record<string, string> = {
  go: 'Golang',
  c: 'C++',
  r: 'R (langage)',
  make: 'Make (Integromat)',
  swift: 'Swift (iOS)',
  rust: 'Rust (langage)',
};

const ALL_COUNTRIES = [
  { id: 'fr', label: '🇫🇷 France' },
  { id: 'be', label: '🇧🇪 Belgique' },
];

interface Props {
  onSearch: (skills: string[], sources: string[], countries: string[]) => void;
  loading: boolean;
}

const ALL_SOURCES = [
  { id: 'wttj', label: 'Welcome to the Jungle' },
  { id: 'francetravail', label: 'France Travail' },
  { id: 'lesjeudis', label: 'LesJeudis' },
  { id: 'adzuna', label: 'Adzuna' },
  { id: 'meteojob', label: 'Meteojob' },
  { id: 'indeed', label: 'Indeed' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'travaillerpour', label: 'Travaillerpour.be' },
  { id: 'stepstone', label: 'StepStone' },
];


export default function SearchBar({ onSearch, loading }: Props) {
  const [input, setInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>(
    ALL_SOURCES.map((s) => s.id)
  );
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['fr']);

  // Détecte les compétences ambiguës dans la liste de tags
  const ambiguousWarnings = useMemo(() => {
    return tags
      .filter((t) => AMBIGUOUS_SUGGESTIONS[t.toLowerCase()])
      .map((t) => ({
        term: t,
        suggestion: AMBIGUOUS_SUGGESTIONS[t.toLowerCase()],
      }));
  }, [tags]);

  function addTag(value: string) {
    const trimmed = value.trim().replace(/,+$/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) {
        addTag(input);
      } else if (tags.length > 0) {
        onSearch(tags, selectedSources, selectedCountries);
      }
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function toggleSource(id: string) {
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function toggleCountry(id: string) {
    setSelectedCountries((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      return next.length === 0 ? prev : next; // au moins un pays requis
    });
  }

  function handleSubmit() {
    const allTags = input.trim() ? [...tags, input.trim()] : tags;
    if (allTags.length === 0) return;
    if (input.trim()) setTags(allTags);
    setInput('');
    onSearch(allTags, selectedSources, selectedCountries);
  }

  return (
    <div className="w-full max-w-4xl mx-auto relative px-4">
      {/* Search Container with Glassmorphism */}
      <div className="group relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur opacity-10 group-focus-within:opacity-20 transition duration-500" />
        <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 focus-within:border-indigo-400/50 shadow-2xl shadow-indigo-100/50 transition-all duration-300 p-2 sm:p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 pl-3 text-indigo-400 group-focus-within:text-indigo-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 flex-1 min-h-[3rem]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100/50 rounded-xl px-3 py-1.5 text-sm font-bold animate-in fade-in zoom-in duration-300"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-500 transition-colors p-0.5"
                    type="button"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  tags.length === 0
                    ? 'Ex: React, Node.js, Python…'
                    : 'Ajouter une autre compétence…'
                }
                className="flex-1 min-w-[200px] outline-none text-slate-800 placeholder-slate-400 text-lg bg-transparent py-2"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || (tags.length === 0 && !input.trim())}
              className="relative group/btn overflow-hidden flex items-center gap-2 bg-slate-900 disabled:bg-slate-200 text-white rounded-xl px-8 py-3.5 font-bold text-sm transition-all duration-300 hover:shadow-xl hover:shadow-indigo-200 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Recherche…
                  </>
                ) : (
                  <>
                    Rechercher
                    <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Hint */}
      <p className="text-center text-[10px] sm:text-xs text-slate-400 mt-3 font-medium uppercase tracking-[0.2em]">
        Appuyez sur <kbd className="bg-white border shadow-sm px-2 py-0.5 rounded text-slate-600 font-mono text-xs mx-1">Entrée</kbd> pour valider un skill
      </p>

      {/* CV CTA — prominent, centered, just below search bar */}
      <div className="flex justify-center mt-5">
        <a
          href="/cv"
          className="group inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-md hover:shadow-xl hover:shadow-indigo-100/40 hover:border-indigo-300 transition-all duration-300"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Analyser mon CV</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Extraction automatique des compétences</p>
          </div>
          <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>

      {/* Alertes termes ambigus */}
      {ambiguousWarnings.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {ambiguousWarnings.map(({ term, suggestion }) => (
            <div
              key={term}
              className="inline-flex items-center gap-2 bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 text-amber-800 rounded-xl px-4 py-2 text-xs font-medium shadow-sm animate-in slide-in-from-top-2 duration-300"
            >
              <span className="text-amber-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </span>
              <span>
                <strong>{term}</strong> est un peu vague. On suggère <button
                  type="button"
                  onClick={() => {
                    setTags((prev) => prev.map((t) => t === term ? suggestion : t));
                  }}
                  className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold hover:bg-amber-200 transition-colors"
                >
                  {suggestion}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filter panel — Pays + Sources in a single, organized card */}
      <div className="mt-6 mx-auto max-w-3xl">
        <div className="bg-white/60 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 shadow-sm">
          
          {/* Row: Pays */}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] shrink-0 w-12">Pays</span>
            <div className="flex gap-2">
              {ALL_COUNTRIES.map((country) => (
                <button
                  key={country.id}
                  onClick={() => toggleCountry(country.id)}
                  type="button"
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    selectedCountries.includes(country.id)
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {country.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row: Sources */}
          <div className="flex items-start gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] shrink-0 w-12 pt-1.5">Sources</span>
            <div className="flex flex-wrap gap-2">
              {ALL_SOURCES.map((source) => (
                <button
                  key={source.id}
                  onClick={() => toggleSource(source.id)}
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-semibold transition-all duration-200 ${
                    selectedSources.includes(source.id)
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    selectedSources.includes(source.id) ? 'bg-indigo-400' : 'bg-slate-300'
                  }`} />
                  {source.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
