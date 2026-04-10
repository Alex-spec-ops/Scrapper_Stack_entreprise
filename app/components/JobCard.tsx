'use client';

import { Job, SOURCE_LABELS, SOURCE_COLORS } from '../../lib/types';

interface Props {
  job: Job;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function JobCard({ job }: Props) {
  return (
    <a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50 hover:border-indigo-200 transition-all duration-300 overflow-hidden"
    >
      {/* Top accent bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex flex-col gap-4 p-5 flex-1">
        {/* Header : logo + titre + source */}
        <div className="flex items-start gap-3">
          {/* Logo */}
          <div className="flex-shrink-0">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.company}
                className="h-11 w-11 rounded-xl object-contain border border-slate-100 bg-white shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center"><span class="text-indigo-600 font-bold text-base">${job.company.charAt(0).toUpperCase()}</span></div>`;
                }}
              />
            ) : (
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-sm">
                <span className="text-indigo-600 font-bold text-base">
                  {job.company.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Titre + entreprise */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2 text-sm">
              {job.title}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 font-medium line-clamp-1">{job.company}</p>
          </div>

          {/* Source badge */}
          <span className={`flex-shrink-0 inline-flex items-center rounded-full font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wide ${SOURCE_COLORS[job.source]}`}>
            {SOURCE_LABELS[job.source]}
          </span>
        </div>

        {/* Chips : localisation, contrat, salaire */}
        <div className="flex flex-wrap gap-1.5">
          {job.location && (
            <span className="inline-flex items-center gap-1 bg-slate-50 text-gray-500 border border-slate-100 rounded-lg px-2.5 py-1 text-[11px] font-medium">
              <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate max-w-[120px]">{job.location}</span>
            </span>
          )}
          {job.contractType && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg px-2.5 py-1 text-[11px] font-bold">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {job.contractType}
            </span>
          )}
          {job.salary && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg px-2.5 py-1 text-[11px] font-bold">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {job.salary}
            </span>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed flex-1">
            {job.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-t border-slate-100">
        <span className="text-[11px] text-gray-400 font-medium">
          {job.publishedAt ? formatDate(job.publishedAt) : ''}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-500 group-hover:text-indigo-700 transition-colors">
          Voir l&apos;offre
          <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </span>
      </div>
    </a>
  );
}
