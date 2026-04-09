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
  const jobs: Job[] = [];
  const maxPages = 3;

  for (let page = 0; page < maxPages; page++) {
    const start = page * 10;
    try {
      const response = await axios.get(`${INDEED_BASE}/jobs`, {
        params: { q: query, l: 'France', sort: 'date', fromage: '30', start },
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
        timeout: 10000,
        maxRedirects: 5,
      });

      const html = typeof response.data === 'string'
        ? response.data
        : Buffer.from(response.data as ArrayBuffer).toString('utf-8');

      if (html.includes('cf-browser-verification') || html.includes('Challenge_form')) {
        if (page === 0) {
          return {
            jobs: [],
            source: 'indeed',
            error: 'Indeed: Protection Cloudflare active.',
          };
        }
        break; // Stop at current page if blocked
      }

      // Parser les lignes de job (<tr> contenant data-jk)
      const trMatches = html.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
      let foundInPage = 0;

      for (const block of trMatches) {
        if (jobs.length >= 60) break;
        if (!block.includes('data-jk=') || !block.includes('jobTitle')) continue;

        const jkMatch = block.match(/data-jk="([a-z0-9]+)"/);
        if (!jkMatch) continue;
        const jk = jkMatch[1];
        if (jobs.some(j => j.id === `indeed-${jk}`)) continue;

        const titleMatch = block.match(/aria-label="[^"]*«\s*([^»]+)»/);
        const title = titleMatch ? titleMatch[1].trim() : '';
        if (!title) continue;

        const companyMatch =
          block.match(/data-testid="company-name"[^>]*>([^<]+)/) ??
          block.match(/class="[^"]*companyName[^"]*"[^>]*>([^<]+)/);
        const company = companyMatch ? stripHtml(companyMatch[1]) : 'Entreprise confidentielle';

        const locationMatch = block.match(/data-testid="text-location"[^>]*>([^<]+)/);
        const location = locationMatch ? stripHtml(locationMatch[1]) : 'France';

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
        foundInPage++;
      }

      if (foundInPage === 0) break; // Plus de résultats
      
      // Petit délai pour éviter d'être trop agressif
      if (page < maxPages - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        if (page === 0) return { jobs: [], source: 'indeed', error: 'Indeed: Accès refusé (anti-bot).' };
        break;
      }
      if (page === 0) throw err;
      break;
    }
  }

  return { jobs, source: 'indeed' };
}

