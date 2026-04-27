import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job, ScraperResult } from '../types';

// geoId Belgique : 100565514
const GEO_ID_BE = '100565514';
const BASE = 'https://www.linkedin.com';

async function fetchLinkedInSkill(skill: string, skills: string[]): Promise<Job[]> {
  const jobs: Job[] = [];

  try {
    for (let start = 0; start < 75; start += 25) {
      const res = await axios.get<string>(
        `${BASE}/jobs/search?keywords=${encodeURIComponent(skill)}&geoId=${GEO_ID_BE}&start=${start}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'fr-FR,fr;q=0.9',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 12000,
        }
      );

      const html = res.data as string;
      const $ = cheerio.load(html);

      const cards = $('[data-entity-urn]').filter((_, el) => {
        const urn = $(el).attr('data-entity-urn') ?? '';
        return urn.startsWith('urn:li:jobPosting:');
      });

      if (cards.length === 0) break;

      cards.each((_, el) => {
        const urn = $(el).attr('data-entity-urn') ?? '';
        const jobId = urn.replace('urn:li:jobPosting:', '');
        if (!jobId) return;

        const title = $(el).find('h3.base-search-card__title').text().trim();
        if (!title) return;

        const company = $(el).find('h4.base-search-card__subtitle a').text().trim()
          || $(el).find('h4.base-search-card__subtitle').text().trim();

        const location = $(el).find('span.job-search-card__location').text().trim() || 'Belgique';

        const rawUrl = $(el).find('a.base-card__full-link').attr('href')
          ?? `${BASE}/jobs/view/${jobId}`;
        // Supprimer les paramètres de tracking
        const url = rawUrl.split('?')[0];

        const dateStr = $(el).find('time').attr('datetime');

        jobs.push({
          id: `linkedin-be-${jobId}`,
          title,
          company: company || 'Entreprise confidentielle',
          location,
          description: '',
          skills,
          publishedAt: dateStr,
          url,
          source: 'linkedin',
          country: 'be',
        });
      });

      if (cards.length < 25) break;
    }
  } catch {
    // blocage ou erreur réseau — on ignore silencieusement
  }

  return jobs;
}

export async function scrapeLinkedIn(skills: string[]): Promise<ScraperResult> {
  try {
    const perSkill = await Promise.all(
      skills.map((s) => fetchLinkedInSkill(s, skills))
    );

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

    return { jobs: allJobs, source: 'linkedin' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: [], source: 'linkedin', error: `LinkedIn: ${message}` };
  }
}
