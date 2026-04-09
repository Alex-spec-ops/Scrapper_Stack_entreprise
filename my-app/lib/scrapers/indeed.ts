import axios from 'axios';
import { Job, ScraperResult } from '../types';

const INDEED_BASE = 'https://fr.indeed.com';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

// User-Agents rotatifs pour éviter la détection
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function scrapeIndeed(skills: string[]): Promise<ScraperResult> {
  const query = skills.join(' ');

  try {
    const response = await axios.get(`${INDEED_BASE}/jobs`, {
      params: { q: query, l: 'France', sort: 'date', fromage: '30' },
      headers: {
        'User-Agent': randomUA(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      },
      decompress: true,
      timeout: 20000,
      maxRedirects: 5,
    });

    const html = typeof response.data === 'string'
      ? response.data
      : Buffer.from(response.data as ArrayBuffer).toString('utf-8');

    const jobs: Job[] = [];

    // Parser les lignes de job (<tr> contenant data-jk)
    const trMatches = html.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];

    for (const block of trMatches) {
      if (jobs.length >= 20) break;
      if (!block.includes('data-jk=') || !block.includes('jobTitle')) continue;

      // Job key
      const jkMatch = block.match(/data-jk="([a-z0-9]+)"/);
      if (!jkMatch) continue;
      const jk = jkMatch[1];

      // Titre depuis aria-label="... « Titre »"
      const titleMatch = block.match(/aria-label="[^"]*«\s*([^»]+)»/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      if (!title) continue;

      // Entreprise
      const companyMatch =
        block.match(/data-testid="company-name"[^>]*>([^<]+)/) ??
        block.match(/class="[^"]*companyName[^"]*"[^>]*>([^<]+)/);
      const company = companyMatch ? stripHtml(companyMatch[1]) : 'Entreprise confidentielle';

      // Localisation
      const locationMatch = block.match(/data-testid="text-location"[^>]*>([^<]+)/);
      const location = locationMatch ? stripHtml(locationMatch[1]) : 'France';

      // Snippet
      const snippetMatch = block.match(/class="[^"]*job-snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      const description = snippetMatch ? stripHtml(snippetMatch[1]) : '';

      jobs.push({
        id: `indeed-${jk}`,
        title,
        company,
        location,
        description,
        skills,
        url: `${INDEED_BASE}/viewjob?jk=${jk}`,
        source: 'indeed',
      });
    }

    if (jobs.length === 0 && html.includes('cf-browser-verification')) {
      return {
        jobs: [],
        source: 'indeed',
        error:
          'Indeed: Protection Cloudflare active. Résultats non disponibles depuis un serveur (fonctionne normalement depuis un navigateur).',
      };
    }

    return { jobs, source: 'indeed' };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 403) {
      return {
        jobs: [],
        source: 'indeed',
        error:
          'Indeed: Accès refusé (anti-bot). Pour contourner cela, une solution avec navigateur headless (Playwright) est nécessaire.',
      };
    }
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: [], source: 'indeed', error: `Indeed: ${message}` };
  }
}
