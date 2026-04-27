import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job, ScraperResult } from '../types';

const BASE = 'https://www.lesjeudis.com';

interface LesJeudisJob {
  id: number;
  title: string;
  organization: string;
  url?: { path: string };
  logo?: { url: string };
  address?: string[];
  published?: string;
  contractTypes?: string[];
  salaryRange?: { min?: number; max?: number; currency?: string }[];
}

interface NextData {
  props?: {
    pageProps?: Record<string, unknown>;
  };
}

function findJobsArray(obj: unknown, depth = 0): LesJeudisJob[] | null {
  if (depth > 8) return null;
  if (
    Array.isArray(obj) &&
    obj.length > 0 &&
    typeof (obj[0] as LesJeudisJob)?.title === 'string' &&
    typeof (obj[0] as LesJeudisJob)?.id === 'number'
  ) {
    return obj as LesJeudisJob[];
  }
  if (obj && typeof obj === 'object') {
    for (const v of Object.values(obj as Record<string, unknown>)) {
      const found = findJobsArray(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

async function fetchLesJeudisSkill(skill: string, skills: string[]): Promise<Job[]> {
  const jobs: Job[] = [];
  try {
    for (let page = 1; page <= 10; page++) {
      const res = await axios.get<string>(`${BASE}/recherche?q=${encodeURIComponent(skill)}&page=${page}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'fr-FR,fr;q=0.9',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(res.data);
      const nextDataText = $('#__NEXT_DATA__').text();
      if (!nextDataText) break;

      const nextData: NextData = JSON.parse(nextDataText);
      const hits = findJobsArray(nextData);
      if (!hits || hits.length === 0) break;

      for (const hit of hits) {
        const location = hit.address?.[0] ?? 'France';
        const salary =
          hit.salaryRange && hit.salaryRange.length > 0 && hit.salaryRange[0].min
            ? `${hit.salaryRange[0].min}–${hit.salaryRange[0].max ?? ''} ${hit.salaryRange[0].currency ?? '€'}`
            : undefined;
        jobs.push({
          id: `lesjeudis-${hit.id}`,
          title: hit.title,
          company: hit.organization ?? 'Entreprise confidentielle',
          companyLogo: hit.logo?.url,
          location,
          description: '',
          skills,
          salary,
          contractType: hit.contractTypes?.[0],
          publishedAt: hit.published,
          url: hit.url?.path ? `${BASE}${hit.url.path}` : `${BASE}/recherche?q=${encodeURIComponent(skill)}`,
          source: 'lesjeudis',
          country: 'fr',
        });
      }
    }
  } catch {
    // on ignore les erreurs par skill individuel
  }
  return jobs;
}

export async function scrapeLesJeudis(skills: string[]): Promise<ScraperResult> {
  try {
    // Une requête par skill en parallèle → au moins un skill suffit
    const perSkill = await Promise.all(skills.map((s) => fetchLesJeudisSkill(s, skills)));

    const seen = new Set<string>();
    const allJobs: Job[] = [];
    for (const batch of perSkill) {
      for (const job of batch) {
        if (!seen.has(job.url)) {
          seen.add(job.url);
          allJobs.push(job);
        }
      }
    }

    return { jobs: allJobs, source: 'lesjeudis' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: [], source: 'lesjeudis', error: `LesJeudis: ${message}` };
  }
}

