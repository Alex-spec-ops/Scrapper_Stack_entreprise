import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job, ScraperResult } from '../types';

const BASE = 'https://www.meteojob.com';

interface MeteojobOffer {
  id: string;
  title: string;
  locality?: string;
  publicationDate?: string;
  contractTypes?: string[];
  description?: string;
  profileDescription?: string;
  company?: {
    id?: number;
    name?: string;
  };
  url?: {
    logo?: string;
    jobOffer?: string;
  };
  salary?: {
    from?: number;
    to?: number;
    currency?: string;
  };
  labels?: {
    salary?: { value?: string };
    contractTypeList?: { value?: string }[];
  };
}

interface MeteojobState {
  'app:search:offers'?: {
    content?: MeteojobOffer[];
  };
}

async function fetchMeteojobSkill(skill: string, skills: string[]): Promise<Job[]> {
  const jobs: Job[] = [];
  try {
    for (let page = 1; page <= 3; page++) {
      const res = await axios.get<string>(`${BASE}/jobs?q=${encodeURIComponent(skill)}&page=${page}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'fr-FR,fr;q=0.9',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(res.data);
      const stateText = $('#candidate-front-state').text();
      if (!stateText) break;

      const state: MeteojobState = JSON.parse(stateText);
      const offers = state['app:search:offers']?.content ?? [];
      if (offers.length === 0) break;

      for (const offer of offers) {
        const logoPath = offer.url?.logo;
        const companyLogo = logoPath ? `${BASE}${logoPath}` : undefined;
        const jobPath = offer.url?.jobOffer;
        const url = jobPath ? `${BASE}${jobPath}` : `${BASE}/jobs?q=${encodeURIComponent(skill)}`;
        const rawDesc = (offer.description ?? '') + ' ' + (offer.profileDescription ?? '');
        const description = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        jobs.push({
          id: `meteojob-${offer.id}`,
          title: offer.title,
          company: offer.company?.name ?? 'Entreprise confidentielle',
          companyLogo,
          location: offer.locality ?? 'France',
          description,
          skills,
          salary: offer.labels?.salary?.value,
          contractType: offer.labels?.contractTypeList?.[0]?.value ?? offer.contractTypes?.[0],
          publishedAt: offer.publicationDate,
          url,
          source: 'meteojob',
        });
      }
    }
  } catch {
    // on ignore les erreurs par skill individuel
  }
  return jobs;
}

export async function scrapeMeteojob(skills: string[]): Promise<ScraperResult> {
  try {
    // Une requête par skill en parallèle → au moins un skill suffit
    const perSkill = await Promise.all(skills.map((s) => fetchMeteojobSkill(s, skills)));

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

    return { jobs: allJobs, source: 'meteojob' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: [], source: 'meteojob', error: `Meteojob: ${message}` };
  }
}

