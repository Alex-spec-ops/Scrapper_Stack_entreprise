import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job, ScraperResult } from '../types';

const BASE = 'https://www.adzuna.fr';

export async function scrapeAdzuna(skills: string[]): Promise<ScraperResult> {
  const query = skills.join(' ');
  const allJobs: Job[] = [];
  const maxPages = 3;

  try {
    for (let page = 1; page <= maxPages; page++) {
      const res = await axios.get<string>(`${BASE}/search?q=${encodeURIComponent(query)}&w=France&p=${page}`, {
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
        const url = titleEl.attr('href') ?? `${BASE}/details/${aid}`;

        const company = $(el).find('.ui-company').first().text().trim();
        const location = $(el).find('.ui-location').first().text().trim() || 'France';

        const logoEl = $(el).find('.ui-logo-col img');
        const logoSrc = logoEl.attr('src');
        const companyLogo = logoSrc ? (logoSrc.startsWith('//') ? `https:${logoSrc}` : logoSrc) : undefined;

        const description = $(el).find('.max-snippet-height').text().trim();

        if (!title) return;

        jobsInPage.push({
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

      if (jobsInPage.length === 0) break;
      allJobs.push(...jobsInPage);
      
      if (page < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (allJobs.length === 0) {
      return { jobs: [], source: 'adzuna', error: 'Adzuna: aucun résultat' };
    }

    return { jobs: allJobs, source: 'adzuna' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: allJobs.length > 0 ? allJobs : [], source: 'adzuna', error: allJobs.length === 0 ? `Adzuna: ${message}` : undefined };
  }
}

