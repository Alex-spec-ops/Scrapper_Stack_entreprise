import axios from 'axios';
import { Job, ScraperResult } from '../types';

// Jobteaser est une SPA React complète.
// Leur API REST interne requiert une auth session.
// Alternative : utilisation de leur widget public embed ou API partenaire.

const JT_WIDGET_API = 'https://api.jobteaser.com/v1';
const JT_BASE = 'https://www.jobteaser.com';

interface JTJob {
  id?: string | number;
  title?: string;
  company?: { name?: string; logo_url?: string; slug?: string };
  location?: { city?: string; country?: string };
  description?: string;
  contract_type?: string;
  published_at?: string;
  slug?: string;
  url?: string;
}

// Tentative via l'API partenaire Jobteaser (si token disponible)
async function tryPartnerApi(skills: string[]): Promise<Job[] | null> {
  const token = process.env.JOBTEASER_API_TOKEN;
  if (!token) return null;

  try {
    const response = await axios.get<{ data?: JTJob[] }>(`${JT_WIDGET_API}/job-offers`, {
      params: { q: skills.join(' '), per_page: 20, country: 'FR' },
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    const list = response.data?.data ?? [];
    return list.map((job, i) => ({
      id: `jt-${job.id ?? i}`,
      title: job.title ?? 'Poste non précisé',
      company: job.company?.name ?? 'Entreprise confidentielle',
      companyLogo: job.company?.logo_url,
      location: job.location?.city ?? 'France',
      description: job.description ?? '',
      skills,
      contractType: job.contract_type,
      publishedAt: job.published_at,
      url:
        job.url ??
        (job.slug
          ? `${JT_BASE}/fr/offres-d-emploi/${job.slug}`
          : `${JT_BASE}/fr/offres-d-emploi`),
      source: 'jobteaser' as const,
    }));
  } catch {
    return null;
  }
}

// Tentative via leur embed widget public (pour les entreprises partenaires)
async function tryPublicWidget(skills: string[]): Promise<Job[]> {
  // Jobteaser expose parfois une API de widget non-authentifiée
  // pour les intégrations sur les sites corporate
  const query = encodeURIComponent(skills.join(' '));

  const response = await axios.get(
    `${JT_WIDGET_API}/public/job-offers?keywords=${query}&country_code=FR&per_page=20`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
        Referer: JT_BASE,
        Origin: JT_BASE,
      },
      timeout: 10000,
    }
  );

  const list: JTJob[] = response.data?.data ?? response.data?.job_offers ?? [];

  return list.map((job, i) => ({
    id: `jt-${job.id ?? i}`,
    title: job.title ?? 'Poste non précisé',
    company: job.company?.name ?? 'Entreprise confidentielle',
    companyLogo: job.company?.logo_url,
    location: job.location?.city ?? 'France',
    description: job.description ?? '',
    skills,
    contractType: job.contract_type,
    publishedAt: job.published_at,
    url: job.url ?? `${JT_BASE}/fr/offres-d-emploi`,
    source: 'jobteaser' as const,
  }));
}

export async function scrapeJobteaser(skills: string[]): Promise<ScraperResult> {
  // Essai 1: API partenaire avec token
  const partnerJobs = await tryPartnerApi(skills);
  if (partnerJobs) {
    return { jobs: partnerJobs, source: 'jobteaser' };
  }

  // Essai 2: Widget public
  try {
    const widgetJobs = await tryPublicWidget(skills);
    if (widgetJobs.length > 0) {
      return { jobs: widgetJobs, source: 'jobteaser' };
    }
  } catch {
    // Ignoré
  }

  return {
    jobs: [],
    source: 'jobteaser',
    error:
      'Jobteaser: Le site est une SPA avec API protégée. ' +
      'Pour activer Jobteaser, ajoutez JOBTEASER_API_TOKEN dans .env.local (voir https://www.jobteaser.com/fr/entreprises/api).',
  };
}
