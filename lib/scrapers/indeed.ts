import axios from 'axios';
import * as cheerio from 'cheerio';
import { Country, Job, ScraperResult } from '../types';

const BASES: Record<Country, string> = {
  fr: 'https://fr.indeed.com',
  be: 'https://be.indeed.com',
};

interface IndeedResult {
  jobkey?: string;
  displayTitle?: string;
  company?: string;
  formattedLocation?: string;
  snippet?: string;
  pubDate?: number;
  viewJobLink?: string;
  jobTypes?: string[];
  remoteWorkModel?: { text?: string };
  salarySnippet?: { text?: string; salaryTextFormatted?: boolean };
}

interface IndeedMosaicModel {
  results?: IndeedResult[];
}

interface IndeedMosaicData {
  metaData?: {
    mosaicProviderJobCardsModel?: IndeedMosaicModel;
  };
}

function parseIndeedPage(html: string): IndeedResult[] {
  const match = html.match(
    /window\.mosaic\.providerData\["mosaic-provider-jobcards"\]=(\{.*?\});/s
  );
  if (!match) return [];
  try {
    const data: IndeedMosaicData = JSON.parse(match[1]);
    return data?.metaData?.mosaicProviderJobCardsModel?.results ?? [];
  } catch {
    return [];
  }
}

function stripHtml(html: string): string {
  const $ = cheerio.load(html);
  return $.root().text().replace(/\s+/g, ' ').trim();
}

async function fetchIndeedSkill(skill: string, skills: string[], country: Country): Promise<Job[]> {
  const BASE = BASES[country];
  const jobs: Job[] = [];

  try {
    for (let start = 0; start < 30; start += 10) {
      const res = await axios.get<string>(
        `${BASE}/emplois?q=${encodeURIComponent(skill)}&lang=fr&start=${start}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'fr-FR,fr;q=0.9',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
          },
          timeout: 12000,
        }
      );

      const results = parseIndeedPage(res.data as string);
      if (results.length === 0) break;

      for (const r of results) {
        if (!r.jobkey || !r.displayTitle) continue;
        const location = r.formattedLocation ?? (country === 'be' ? 'Belgique' : 'France');
        const description = r.snippet ? stripHtml(r.snippet) : '';
        const pubDate = r.pubDate ? new Date(r.pubDate).toISOString() : undefined;
        const contractType = r.jobTypes?.[0] ?? r.remoteWorkModel?.text;

        jobs.push({
          id: `indeed-${country}-${r.jobkey}`,
          title: r.displayTitle,
          company: r.company ?? 'Entreprise confidentielle',
          location,
          description,
          skills,
          contractType,
          publishedAt: pubDate,
          url: `${BASE}/viewjob?jk=${r.jobkey}`,
          source: 'indeed',
          country,
        });
      }

      if (results.length < 10) break;
    }
  } catch {
    // erreur réseau ou blocage — on ignore silencieusement
  }

  return jobs;
}

export async function scrapeIndeed(skills: string[], country: Country = 'be'): Promise<ScraperResult> {
  try {
    const perSkill = await Promise.all(
      skills.map((s) => fetchIndeedSkill(s, skills, country))
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

    return { jobs: allJobs, source: 'indeed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: [], source: 'indeed', error: `Indeed: ${message}` };
  }
}
