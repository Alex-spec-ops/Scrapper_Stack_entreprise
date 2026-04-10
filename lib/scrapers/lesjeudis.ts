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

export async function scrapeLesJeudis(skills: string[]): Promise<ScraperResult> {
  const query = skills.join(' ');
  const allJobs: Job[] = [];
  const maxPages = 5;

  try {
    for (let page = 1; page <= maxPages; page++) {
      const res = await axios.get<string>(`${BASE}/recherche?q=${encodeURIComponent(query)}&page=${page}`, {
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

      const jobsInPage: Job[] = hits.map((hit) => {
        const location = hit.address?.[0] ?? 'France';
        const salary =
          hit.salaryRange && hit.salaryRange.length > 0 && hit.salaryRange[0].min
            ? `${hit.salaryRange[0].min}–${hit.salaryRange[0].max ?? ''} ${hit.salaryRange[0].currency ?? '€'}`
            : undefined;

        return {
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
          url: hit.url?.path ? `${BASE}${hit.url.path}` : `${BASE}/recherche?q=${encodeURIComponent(query)}&page=${page}`,
          source: 'lesjeudis',
        };
      });

      allJobs.push(...jobsInPage);
      if (hits.length < 10) break; // Arbitrary small number
    }

    if (allJobs.length === 0) {
      return { jobs: [], source: 'lesjeudis', error: 'LesJeudis: aucun résultat' };
    }

    return { jobs: allJobs, source: 'lesjeudis' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: allJobs.length > 0 ? allJobs : [], source: 'lesjeudis', error: allJobs.length === 0 ? `LesJeudis: ${message}` : undefined };
  }
}

