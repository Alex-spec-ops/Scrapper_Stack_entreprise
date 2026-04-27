'use client';

import { useState } from 'react';
import { Company } from '../../lib/types';
import JobCard from './JobCard';
import SourceBadge from './SourceBadge';
import { JobSource } from '../../lib/types';

interface Props {
  company: Company;
}

export default function CompanyCard({ company }: Props) {
  const [expanded, setExpanded] = useState(false);

  const sources = [...new Set(company.jobs.map((j) => j.source))] as JobSource[];

  return (
    <div className="group bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm hover:shadow-xl hover:shadow-indigo-100/30 transition-all duration-500 overflow-hidden hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 flex items-center justify-between gap-4 hover:bg-white/40 transition-colors text-left"
      >
        <div className="flex items-center gap-5 min-w-0">
          <div className="relative">
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                className="h-14 w-14 rounded-2xl object-contain border border-white/80 flex-shrink-0 bg-white shadow-sm group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200">
                <span className="text-white font-black text-xl">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-sm" title="Actif" />
          </div>

          <div className="min-w-0">
            <h3 className="font-black text-slate-900 text-xl leading-none tracking-tight truncate mb-2">
              {company.name}
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 uppercase tracking-wider">
                {company.jobCount} opportunité{company.jobCount > 1 ? 's' : ''}
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {sources.map((s) => (
                  <SourceBadge key={s} source={s} small />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${expanded ? 'bg-slate-900 text-white rotate-180' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-200'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div className={`transition-all duration-500 ease-in-out ${expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="border-t border-white/50 p-6 space-y-4 bg-indigo-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {company.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
