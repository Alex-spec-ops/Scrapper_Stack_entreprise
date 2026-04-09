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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          {company.logo ? (
            <img
              src={company.logo}
              alt={company.name}
              className="h-12 w-12 rounded-xl object-contain border border-gray-100 flex-shrink-0 bg-white"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">
                {company.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg leading-tight truncate">
              {company.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm font-medium text-indigo-600">
                {company.jobCount} offre{company.jobCount > 1 ? 's' : ''}
              </span>
              <span className="text-gray-300">·</span>
              <div className="flex gap-1 flex-wrap">
                {sources.map((s) => (
                  <SourceBadge key={s} source={s} small />
                ))}
              </div>
            </div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
          {company.jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
