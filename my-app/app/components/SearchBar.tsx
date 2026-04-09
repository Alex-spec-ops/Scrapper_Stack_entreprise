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

interface Props {
  onSearch: (skills: string[], sources: string[]) => void;
  loading: boolean;
}

const ALL_SOURCES = [
  { id: 'indeed', label: 'Indeed' },
  { id: 'wttj', label: 'Welcome to the Jungle' },
  { id: 'apec', label: 'APEC' },
  { id: 'francetravail', label: 'France Travail' },
  { id: 'jobteaser', label: 'Jobteaser' },
];

export default function SearchBar({ onSearch, loading }: Props) {
  const [input, setInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>(
    ALL_SOURCES.map((s) => s.id)
  );

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
        onSearch(tags, selectedSources);
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

  function handleSubmit() {
    const allTags = input.trim() ? [...tags, input.trim()] : tags;
    if (allTags.length === 0) return;
    if (input.trim()) setTags(allTags);
    setInput('');
    onSearch(allTags, selectedSources);
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Champ de recherche avec tags */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 focus-within:border-indigo-400 shadow-lg transition-all duration-200 p-3">
        <div className="flex flex-wrap items-center gap-2 min-h-[2.5rem]">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 rounded-lg px-3 py-1 text-sm font-medium"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-indigo-600 transition-colors"
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
                ? 'Ex: Python, React, Machine Learning…'
                : 'Ajouter une compétence…'
            }
            className="flex-1 min-w-[180px] outline-none text-gray-800 placeholder-gray-400 text-base bg-transparent"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || (tags.length === 0 && !input.trim())}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl px-5 py-2.5 font-semibold text-sm transition-all duration-200 shadow-sm"
          >
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Rechercher
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-2">
        Appuyez sur <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">Entrée</kbd> ou <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">,</kbd> pour ajouter une compétence
      </p>

      {/* Alertes termes ambigus */}
      {ambiguousWarnings.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {ambiguousWarnings.map(({ term, suggestion }) => (
            <div
              key={term}
              className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-1.5 text-xs"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>
                <strong>{term}</strong> est ambigu — résultats limités au titre.{' '}
                Essayez{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTags((prev) => prev.map((t) => t === term ? suggestion : t));
                  }}
                  className="underline font-semibold hover:text-amber-900"
                >
                  {suggestion}
                </button>{' '}pour des résultats plus précis.
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filtres sources */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {ALL_SOURCES.map((source) => (
          <button
            key={source.id}
            onClick={() => toggleSource(source.id)}
            type="button"
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
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
  );
}
