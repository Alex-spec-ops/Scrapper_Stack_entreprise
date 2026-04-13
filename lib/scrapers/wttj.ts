import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job, ScraperResult } from '../types';

const WTTJ_HOME = 'https://www.welcometothejungle.com';
const ALGOLIA_DSN = 'https://CSEKHVMS53-dsn.algolia.net';

interface AlgoliaHit {
  objectID?: string;
  name?: string;
  contract_type?: string;
  offices?: { city?: string; country_code?: string }[];
  office?: { city?: string; country_code?: string };
  // Algolia indexe key_missions (tableau de strings) et profile (texte Markdown)
  key_missions?: string | string[];
  profile?: string;
  summary?: string;
  salary_minimum?: number;
  salary_maximum?: number;
  salary_currency?: string;
  published_at?: string;
  slug?: string;
  organization?: {
    name?: string;
    logo?: string | { url?: string };
    slug?: string;
  };
}

interface AlgoliaResponse {
  hits?: AlgoliaHit[];
  nbHits?: number;
  message?: string;
}

interface WttjEnv {
  ALGOLIA_API_KEY_CLIENT?: string;
  ALGOLIA_APPLICATION_ID?: string;
  ALGOLIA_JOBS_INDEX_PREFIX?: string;
}

async function getAlgoliaConfig(): Promise<WttjEnv | null> {
  try {
    const response = await axios.get(`${WTTJ_HOME}/fr/jobs`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data as string);
    const html = $.html();
    const match = html.match(/window\.env\s*=\s*(\{[^;]+\})/);
    if (match) {
      return JSON.parse(match[1]) as WttjEnv;
    }
  } catch {
    // Utiliser les valeurs par défaut
  }
  return null;
}

function buildSalary(hit: AlgoliaHit): string | undefined {
  if (hit.salary_minimum && hit.salary_maximum) {
    return `${hit.salary_minimum}–${hit.salary_maximum} ${hit.salary_currency ?? '€'}`;
  }
  return undefined;
}

/** Concatène les missions (tableau ou string) en texte brut. */
function extractMissions(hit: AlgoliaHit): string {
  const parts: string[] = [];
  if (Array.isArray(hit.key_missions)) {
    parts.push(...hit.key_missions);
  } else if (typeof hit.key_missions === 'string') {
    parts.push(hit.key_missions);
  }
  if (hit.profile) parts.push(hit.profile);
  if (hit.summary) parts.push(hit.summary);
  // Supprime les balises HTML éventuelles
  return parts.join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getLogoUrl(organization?: AlgoliaHit['organization']): string | undefined {
  if (!organization?.logo) return undefined;
  if (typeof organization.logo === 'string') return organization.logo;
  return organization.logo?.url;
}

/**
 * Construit la requête Algolia en OR explicite.
 * Chaque compétence est entourée de guillemets (matching exact, pas de troncature)
 * et séparée par OR pour qu'un job n'ait besoin de correspondre qu'à UNE seule
 * compétence (le filtre de pertinence côté serveur affine ensuite).
 * Ex: ["Python", "React"] → '"Python" OR "React"'
 */
function buildAlgoliaQuery(skills: string[]): string {
  return skills.map((s) => `"${s}"`).join(' OR ');
}

export async function scrapeWttj(skills: string[]): Promise<ScraperResult> {
  const query = buildAlgoliaQuery(skills);

  // Récupérer la config Algolia dynamique
  const envConfig = await getAlgoliaConfig();
  const appId = envConfig?.ALGOLIA_APPLICATION_ID ?? 'CSEKHVMS53';
  const apiKey = envConfig?.ALGOLIA_API_KEY_CLIENT ?? '4bd8f6215d0cc52b26430765769e65a0';
  const indexPrefix = envConfig?.ALGOLIA_JOBS_INDEX_PREFIX ?? 'wttj_jobs_production';
  const index = `${indexPrefix}_fr`;

  const allJobs: Job[] = [];
  const maxPages = 5;

  try {
    for (let page = 0; page < maxPages; page++) {
      const response = await axios.post<AlgoliaResponse>(
        `https://${appId}-dsn.algolia.net/1/indexes/${index}/query`,
        {
          query,
          page,
          hitsPerPage: 40,
          advancedSyntax: true,
          typoTolerance: false,
          attributesToRetrieve: [
            'objectID',
            'name',
            'contract_type',
            'offices',
            'key_missions',
            'profile',
            'summary',
            'salary_minimum',
            'salary_maximum',
            'salary_currency',
            'published_at',
            'slug',
            'organization',
          ],
        },
        {
          headers: {
            'X-Algolia-Application-Id': appId,
            'X-Algolia-API-Key': apiKey,
            'Content-Type': 'application/json',
            Referer: `${WTTJ_HOME}/`,
            Origin: WTTJ_HOME,
          },
          timeout: 10000,
        }
      );

      const hits: AlgoliaHit[] = response.data.hits ?? [];
      if (hits.length === 0) break;

      const jobs: Job[] = hits.map((hit) => {
        const city = hit.offices?.[0]?.city ?? hit.office?.city ?? 'France';
        const missions = extractMissions(hit);
        return {
          id: `wttj-${hit.objectID ?? Math.random()}`,
          title: hit.name ?? 'Poste non précisé',
          company: hit.organization?.name ?? 'Entreprise confidentielle',
          companyLogo: getLogoUrl(hit.organization),
          location: city,
          description: missions,
          skills,
          salary: buildSalary(hit),
          contractType: hit.contract_type,
          publishedAt: hit.published_at,
          url:
            hit.slug && hit.organization?.slug
              ? `${WTTJ_HOME}/fr/companies/${hit.organization.slug}/jobs/${hit.slug}`
              : `${WTTJ_HOME}/fr/jobs`,
          source: 'wttj',
        };
      });

      allJobs.push(...jobs);
      if (hits.length < 40) break; // Moins de hits que demandés = fin des résultats
    }

    return { jobs: allJobs, source: 'wttj' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: [], source: 'wttj', error: `WTTJ: ${message}` };
  }
}

