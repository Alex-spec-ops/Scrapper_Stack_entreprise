import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job, ScraperResult } from '../types';

const BASE = 'https://www.adzuna.fr';

async function fetchAdzunaSkill(skill: string, skills: string[]): Promise<Job[]> {
  const jobs: Job[] = [];
  try {
    const res = await axios.get<string>(`${BASE}/search?q=${encodeURIComponent(skill)}&w=France&p=1`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        Accept: 'text/html,application/xhtml+xml',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(res.data);
    $('article[data-aid]').each((_i, el) => {
      const aid = $(el).attr('data-aid');
      if (!aid) return;
      const titleEl = $(el).find('h2 a[data-js="jobLink"]');
      const title = titleEl.text().replace(/<[^>]+>/g, '').trim();
      if (!title) return;
      const url = titleEl.attr('href') ?? `${BASE}/details/${aid}`;
      const company = $(el).find('.ui-company').first().text().trim();
      const location = $(el).find('.ui-location').first().text().trim() || 'France';
      const logoSrc = $(el).find('.ui-logo-col img').attr('src');
      const companyLogo = logoSrc ? (logoSrc.startsWith('//') ? `https:${logoSrc}` : logoSrc) : undefined;
      const description = $(el).find('.max-snippet-height').text().trim();
      jobs.push({
        id: `adzuna-${aid}`,
        title,
        company: company || 'Entreprise confidentielle',
        companyLogo,
        location,
        description,
        skills,
        url: url.startsWith('http') ? url : `${BASE}${url}`,
        source: 'adzuna',
      });
    });
  } catch {
    // on ignore les erreurs par skill individuel
  }
  return jobs;
}

export async function scrapeAdzuna(skills: string[]): Promise<ScraperResult> {
  try {
    // Une requête par skill en parallèle → au moins un skill suffit
    const perSkill = await Promise.all(skills.map((s) => fetchAdzunaSkill(s, skills)));

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

