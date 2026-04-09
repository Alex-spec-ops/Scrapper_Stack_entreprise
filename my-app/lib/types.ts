export type JobSource = 'indeed' | 'wttj' | 'apec' | 'francetravail' | 'jobteaser' | 'lesjeudis' | 'adzuna' | 'meteojob';

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  description: string;
  skills: string[];
  salary?: string;
  contractType?: string;
  publishedAt?: string;
  url: string;
  source: JobSource;
}

export interface Company {
  name: string;
  logo?: string;
  jobCount: number;
  jobs: Job[];
}

export interface ScraperResult {
  jobs: Job[];
  source: JobSource;
  error?: string;
}

export interface SearchResult {
  jobs: Job[];
  companies: Company[];
  totalJobs: number;
  errors: { source: string; message: string }[];
}

export const SOURCE_LABELS: Record<JobSource, string> = {
  indeed: 'Indeed',
  wttj: 'Welcome to the Jungle',
  apec: 'APEC',
  francetravail: 'France Travail',
  jobteaser: 'Jobteaser',
  lesjeudis: 'LesJeudis',
  adzuna: 'Adzuna',
  meteojob: 'Meteojob',
};

export const SOURCE_COLORS: Record<JobSource, string> = {
  indeed: 'bg-blue-100 text-blue-800',
  wttj: 'bg-purple-100 text-purple-800',
  apec: 'bg-green-100 text-green-800',
  francetravail: 'bg-red-100 text-red-800',
  jobteaser: 'bg-orange-100 text-orange-800',
  lesjeudis: 'bg-teal-100 text-teal-800',
  adzuna: 'bg-emerald-100 text-emerald-800',
  meteojob: 'bg-sky-100 text-sky-800',
};
