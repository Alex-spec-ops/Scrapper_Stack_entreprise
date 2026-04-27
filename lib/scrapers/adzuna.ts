import axios from 'axios';
import * as cheerio from 'cheerio';
import { Country, Job, ScraperResult } from '../types';

const BASES: Record<Country, string> = {
  fr: 'https://www.adzuna.fr',
  be: 'https://www.adzuna.be',
};
const LOCATION_PARAM: Record<Country, string> = {
  fr: '&w=France',
  be: '',
};

async function fetchAdzunaSkill(skill: string, skills: string[], country: Country): Promise<Job[]> {
  const BASE = BASES[country];
  const locationParam = LOCATION_PARAM[country];
  const jobs: Job[] = [];
  try {
    for (let page = 1; page <= 10; page++) {
      const res = await axios.get<string>(`${BASE}/search?q=${encodeURIComponent(skill)}${locationParam}&p=${page}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'fr-FR,fr;q=0.9',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(res.data);
      const jobsInPage: Job[] = [];
      $('article[data-aid]').each((_i, el) => {
        const aid = $(el).attr('data-aid');
        if (!aid) return;
        const titleEl = $(el).find('h2 a[data-js="jobLink"]');
        const title = titleEl.text().replace(/<[^>]+>/g, '').trim();
        if (!title) return;
        const url = titleEl.attr('href') ?? `${BASE}/details/${aid}`;
        const company = $(el).find('.ui-company').first().text().trim();
        const defaultLocation = country === 'be' ? 'Belgique' : 'France';
        const location = $(el).find('.ui-location').first().text().trim() || defaultLocation;
        const logoSrc = $(el).find('.ui-logo-col img').attr('src');
        const companyLogo = logoSrc ? (logoSrc.startsWith('//') ? `https:${logoSrc}` : logoSrc) : undefined;
        const description = $(el).find('.max-snippet-height').text().trim();
        jobsInPage.push({
          id: `adzuna-${country}-${aid}`,
          title,
          company: company || 'Entreprise confidentielle',
          companyLogo,
          location,
          description,
          skills,
          url: url.startsWith('http') ? url : `${BASE}${url}`,
          source: 'adzuna',
          country,
        });
      });
      if (jobsInPage.length === 0) break;
      jobs.push(...jobsInPage);
    }
  } catch {
    // on ignore les erreurs par skill individuel
  }
  return jobs;
}

export async function scrapeAdzuna(skills: string[], country: Country = 'fr'): Promise<ScraperResult> {
  try {
    const perSkill = await Promise.all(skills.map((s) => fetchAdzunaSkill(s, skills, country)));

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

    return { jobs: allJobs, source: 'adzuna' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: [], source: 'adzuna', error: `Adzuna: ${message}` };
  }
}

