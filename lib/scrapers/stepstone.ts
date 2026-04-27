import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job, ScraperResult } from '../types';

const BASE = 'https://www.stepstone.be';

async function fetchStepstoneSkill(skill: string, skills: string[]): Promise<Job[]> {
  const jobs: Job[] = [];
  try {
    for (let page = 1; page <= 10; page++) {
      const url =
        page === 1
          ? `${BASE}/jobs/${encodeURIComponent(skill)}/`
          : `${BASE}/jobs/${encodeURIComponent(skill)}/?page=${page}`;

      const res = await axios.get<string>(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'fr-BE,fr;q=0.9',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(res.data);

      // Each job card is an <article> with a data-at or within a list
      const cards = $('article[data-at]');
      if (cards.length === 0) break;

      cards.each((_i, el) => {
        const titleEl = $(el).find('h2 a').first();
        const title = titleEl.text().trim();
        if (!title) return;

        const path = titleEl.attr('href') ?? '';
        const jobUrl = path.startsWith('http') ? path : `${BASE}${path}`;

        // Extract ID from URL pattern: /jobs--title--location--company--{id}-inline.html
        const idMatch = jobUrl.match(/--(\d+)-inline\.html/);
        const jobId = idMatch ? idMatch[1] : jobUrl.replace(/[^a-z0-9]/gi, '-').slice(-40);

        const company =
          $(el).find('[data-at="job-item-company-name"]').text().trim() ||
          'Entreprise confidentielle';
        const location =
          $(el).find('[data-at="job-item-location"]').text().trim() || 'Belgique';

        jobs.push({
          id: `stepstone-${jobId}`,
          title,
          company,
          location,
          description: '',
          skills,
          url: jobUrl,
          source: 'stepstone',
          country: 'be',
        });
      });
    }
  } catch {
    // on ignore les erreurs par skill individuel
  }
  return jobs;
}

export async function scrapeStepstone(skills: string[]): Promise<ScraperResult> {
  try {
    const perSkill = await Promise.all(skills.map((s) => fetchStepstoneSkill(s, skills)));

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

    return { jobs: allJobs, source: 'stepstone' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: [], source: 'stepstone', error: `StepStone: ${message}` };
  }
}
