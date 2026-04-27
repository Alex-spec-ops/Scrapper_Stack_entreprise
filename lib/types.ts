export type JobSource = 'wttj' | 'francetravail' | 'lesjeudis' | 'adzuna' | 'meteojob' | 'indeed' | 'linkedin' | 'travaillerpour' | 'stepstone';
export type Country = 'fr' | 'be';

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
  country: Country;
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
  wttj: 'Welcome to the Jungle',
  francetravail: 'France Travail',
  lesjeudis: 'LesJeudis',
  adzuna: 'Adzuna',
  meteojob: 'Meteojob',
  indeed: 'Indeed',
  linkedin: 'LinkedIn',
  travaillerpour: 'Travaillerpour.be',
  stepstone: 'StepStone',
};

export const SOURCE_COLORS: Record<JobSource, string> = {
  wttj: 'bg-purple-100 text-purple-800',
  francetravail: 'bg-red-100 text-red-800',
  lesjeudis: 'bg-teal-100 text-teal-800',
  adzuna: 'bg-emerald-100 text-emerald-800',
  meteojob: 'bg-sky-100 text-sky-800',
  indeed: 'bg-blue-100 text-blue-800',
  linkedin: 'bg-cyan-100 text-cyan-800',
  travaillerpour: 'bg-orange-100 text-orange-800',
  stepstone: 'bg-rose-100 text-rose-800',
};
