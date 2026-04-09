export type JobSource = 'indeed' | 'wttj' | 'apec' | 'francetravail' | 'jobteaser';

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
};

export const SOURCE_COLORS: Record<JobSource, string> = {
  indeed: 'bg-blue-100 text-blue-800',
  wttj: 'bg-purple-100 text-purple-800',
  apec: 'bg-green-100 text-green-800',
  francetravail: 'bg-red-100 text-red-800',
  jobteaser: 'bg-orange-100 text-orange-800',
};
