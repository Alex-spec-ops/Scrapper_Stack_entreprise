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

export async function scrapeMeteojob(skills: string[]): Promise<ScraperResult> {
  const query = skills.join(' ');
  const allJobs: Job[] = [];
  const maxPages = 5;

  try {
    for (let page = 1; page <= maxPages; page++) {
      const res = await axios.get<string>(`${BASE}/jobs?q=${encodeURIComponent(query)}&page=${page}`, {
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

      const jobsInPage: Job[] = offers.map((offer) => {
        const logoPath = offer.url?.logo;
        const companyLogo = logoPath ? `${BASE}${logoPath}` : undefined;

        const jobPath = offer.url?.jobOffer;
        const url = jobPath ? `${BASE}${jobPath}` : `${BASE}/jobs?q=${encodeURIComponent(query)}`;

        const rawDesc = (offer.description ?? '') + ' ' + (offer.profileDescription ?? '');
        const description = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        const contractType =
          offer.labels?.contractTypeList?.[0]?.value ?? offer.contractTypes?.[0];

        const salary = offer.labels?.salary?.value;

        return {
          id: `meteojob-${offer.id}`,
          title: offer.title,
          company: offer.company?.name ?? 'Entreprise confidentielle',
          companyLogo,
          location: offer.locality ?? 'France',
          description,
          skills,
          salary,
          contractType,
          publishedAt: offer.publicationDate,
          url,
          source: 'meteojob',
        };
      });

      allJobs.push(...jobsInPage);
      if (offers.length < 10) break; // Arbitrary small number implies last page
    }

    if (allJobs.length === 0) {
      return { jobs: [], source: 'meteojob', error: 'Meteojob: aucun résultat' };
    }

    return { jobs: allJobs, source: 'meteojob' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: allJobs.length > 0 ? allJobs : [], source: 'meteojob', error: allJobs.length === 0 ? `Meteojob: ${message}` : undefined };
  }
}

