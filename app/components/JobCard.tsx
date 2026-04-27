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
      className="group flex flex-col bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/30 hover:border-indigo-400/20 transition-all duration-300 overflow-hidden hover:-translate-y-1 animate-in fade-in zoom-in duration-500"
    >
      <div className="flex flex-col gap-4 p-6 flex-1">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.company}
                className="h-12 w-12 rounded-xl object-contain border border-white bg-white shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center border border-indigo-100/50"><span class="text-indigo-600 font-black text-lg">${job.company.charAt(0).toUpperCase()}</span></div>`;
                }}
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center border border-indigo-100/50 shadow-sm">
                <span className="text-indigo-600 font-black text-lg">
                  {job.company.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2 text-base tracking-tight mb-1">
              {job.title}
            </h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{job.company}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.location && (
            <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-500 border border-slate-100/50 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tight">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {job.location.split(',')[0]}
            </span>
          )}
          {job.contractType && (
            <span className="inline-flex items-center gap-1.5 bg-indigo-50/50 text-indigo-600 border border-indigo-100/50 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tight">
              {job.contractType}
            </span>
          )}
          {job.salary && (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100/50 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tight">
              {job.salary}
            </span>
          )}
        </div>

        {job.description && (
          <p className="text-[13px] text-slate-500 line-clamp-3 leading-relaxed flex-1 font-medium italic">
            &ldquo;{job.description}&rdquo;
          </p>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-4 bg-slate-50/30 backdrop-blur-sm border-t border-white/50">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${SOURCE_COLORS[job.source].split(' ')[0]}`} />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">
            {SOURCE_LABELS[job.source]} • {job.publishedAt ? formatDate(job.publishedAt) : ''}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-indigo-600 group-hover:text-indigo-700 transition-all">
          Détails
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </span>
      </div>
    </a>
  );
}
