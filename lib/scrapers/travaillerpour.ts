import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job, ScraperResult } from '../types';

const BASE = 'https://www.travaillerpour.be';

async function fetchTravaillerpourSkill(skill: string, skills: string[]): Promise<Job[]> {
  const jobs: Job[] = [];
  try {
    for (let page = 0; page <= 9; page++) {
      const url = `${BASE}/fr/jobs?q=${encodeURIComponent(skill)}&page=${page}`;
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
      const cards = $('article.node--type-job');
      if (cards.length === 0) break;

      cards.each((_i, el) => {
        const titleEl = $(el).find('h3 a span').first();
        const title = titleEl.text().trim();
        if (!title) return;

        const linkEl = $(el).find('h3 a').first();
        const path = linkEl.attr('href') ?? '';
        const jobUrl = path.startsWith('http') ? path : `${BASE}${path}`;

        const company = $(el).find('.organization-wrapper').text().trim() || 'Entreprise confidentielle';
        const location = $(el).find('.field--name-field-job-location').text().trim() || 'Belgique';
        const contractType = $(el).find('.field-job-contracttype').text().trim() || undefined;

        const id = path.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').slice(0, 60);

        jobs.push({
          id: `travaillerpour-${id}`,
          title,
          company,
          location,
          description: '',
          skills,
          contractType,
          url: jobUrl,
          source: 'travaillerpour',
          country: 'be',
        });
      });
    }
  } catch {
    // on ignore les erreurs par skill individuel
  }
  return jobs;
}

export async function scrapeTravaillerpour(skills: string[]): Promise<ScraperResult> {
  try {
    const perSkill = await Promise.all(skills.map((s) => fetchTravaillerpourSkill(s, skills)));

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

    return { jobs: allJobs, source: 'travaillerpour' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: [], source: 'travaillerpour', error: `Travaillerpour: ${message}` };
  }
}
