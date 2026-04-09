import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job, ScraperResult } from '../types';

// APEC utilise une SPA Angular avec une API protégée.
// Fallback: scraping de leurs pages indexées par Google (format /offre-emploi/*.html)
// ou utilisation de leur flux de données publiques via leur partenariat.

const APEC_SEARCH_PAGE = 'https://www.apec.fr/candidat/recherche-emploi.html';
const APEC_BASE = 'https://www.apec.fr';

// Tentative via l'API officielle APEC si des credentials sont fournis
// (Voir https://www.apec.fr/partenaires/api-apec.html pour obtenir l'accès)
async function tryOfficialApi(skills: string[]): Promise<Job[] | null> {
  const apiKey = process.env.APEC_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await axios.get('https://api.apec.fr/v1/offres', {
      params: { motsCles: skills.join(' '), nbResultats: 20 },
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    const offres = response.data?.offres ?? [];
    return offres.map((o: Record<string, unknown>, i: number) => ({
      id: `apec-${o.id ?? i}`,
      title: (o.intitule as string) ?? 'Poste non précisé',
      company: (o.nomEntreprise as string) ?? 'Entreprise confidentielle',
      location: ((o.lieuTravail as Record<string, string>)?.libelle) ?? 'France',
      description: (o.resume as string) ?? '',
      skills,
      salary: o.salaireTexte as string | undefined,
      contractType: ((o.typeContrat as Record<string, string>)?.libelle) as string | undefined,
      publishedAt: o.datePublication as string | undefined,
      url: `${APEC_BASE}/candidat/recherche-emploi.html/emploi/${o.numeroOffre ?? o.id}`,
      source: 'apec' as const,
    }));
  } catch {
    return null;
  }
}

// Scraping HTML de la page de recherche APEC (fonctionne si SSR actif)
async function scrapeHtml(skills: string[]): Promise<Job[]> {
  const query = skills.join(' ');

  const response = await axios.get(APEC_SEARCH_PAGE, {
    params: { motsCles: query },
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'fr-FR,fr;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    decompress: true,
    timeout: 15000,
  });

  const html = typeof response.data === 'string'
    ? response.data
    : Buffer.from(response.data as ArrayBuffer).toString('utf-8');

  const $ = cheerio.load(html);
  const jobs: Job[] = [];

  // APEC est une SPA Angular - le HTML serveur ne contient pas les offres
  // Cherchons tout de même du contenu éventuel
  $('[class*="offre"], [class*="job-card"], .card-offre, article').each((i, el) => {
    if (i >= 20) return false;
    const title = $(el).find('h2, h3, [class*="title"]').first().text().trim();
    const company = $(el).find('[class*="company"], [class*="entreprise"]').first().text().trim();
    const location = $(el).find('[class*="localisation"], [class*="location"]').first().text().trim();
    const link = $(el).find('a').first().attr('href') ?? '';

    if (title) {
      jobs.push({
        id: `apec-dom-${i}`,
        title,
        company: company || 'Entreprise confidentielle',
        location: location || 'France',
        description: '',
        skills,
        url: link.startsWith('http') ? link : `${APEC_BASE}${link}`,
        source: 'apec',
      });
    }
  });

  return jobs;
}

export async function scrapeApec(skills: string[]): Promise<ScraperResult> {
  // Essai 1: API officielle APEC (si clé disponible)
  const apiJobs = await tryOfficialApi(skills);
  if (apiJobs) {
    return { jobs: apiJobs, source: 'apec' };
  }

  // Essai 2: Scraping HTML
  try {
    const htmlJobs = await scrapeHtml(skills);
    if (htmlJobs.length > 0) {
      return { jobs: htmlJobs, source: 'apec' };
    }
  } catch {
    // Ignorer, tomber sur le message d'erreur
  }

  return {
    jobs: [],
    source: 'apec',
    error:
      'APEC: Le site utilise une application Angular avec une API protégée. ' +
      'Pour activer APEC, ajoutez APEC_API_KEY dans .env.local (voir https://www.apec.fr/partenaires).',
  };
}
