import axios from 'axios';
import { Job, ScraperResult } from '../types';

const TOKEN_URL =
  'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire';
const SEARCH_URL =
  'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';

interface FTEntreprise {
  nom?: string;
  logo?: string;
  url?: string;
}

interface FTLieu {
  libelle?: string;
}

interface FTSalaire {
  libelle?: string;
}

interface FTOffre {
  id?: string;
  intitule?: string;
  entreprise?: FTEntreprise;
  lieuTravail?: FTLieu;
  description?: string;
  salaire?: FTSalaire;
  typeContrat?: string;
  dateCreation?: string;
  origineOffre?: { urlOrigine?: string };
}

interface FTResponse {
  resultats?: FTOffre[];
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'api_offresdemploiv2 o2dsoffre',
    });

    const response = await axios.post<{ access_token: string; expires_in: number }>(
      TOKEN_URL,
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 8000,
      }
    );

    cachedToken = {
      value: response.data.access_token,
      expiresAt: Date.now() + (response.data.expires_in - 60) * 1000,
    };
    return cachedToken.value;
  } catch {
    return null;
  }
}

export async function scrapeFranceTravail(skills: string[]): Promise<ScraperResult> {
  const token = await getToken();
  if (!token) {
    return {
      jobs: [],
      source: 'francetravail',
      error:
        'France Travail: Clés API manquantes. Ajoutez FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET dans .env.local',
    };
  }

  const query = skills.join(' ');
  const allJobs: Job[] = [];
  const maxPages = 3;

  try {
    for (let page = 0; page < maxPages; page++) {
      const start = page * 20;
      const end = start + 19;
      
      const response = await axios.get<FTResponse>(SEARCH_URL, {
        params: {
          motsCles: query,
          range: `${start}-${end}`,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: 10000,
      });

      const offres: FTOffre[] = response.data.resultats ?? [];
      if (offres.length === 0) break;

      const jobs: Job[] = offres.map((offre, i) => ({
        id: `ft-${offre.id ?? i}`,
        title: offre.intitule ?? 'Poste non précisé',
        company: offre.entreprise?.nom ?? 'Entreprise confidentielle',
        companyLogo: offre.entreprise?.logo,
        location: offre.lieuTravail?.libelle ?? 'France',
        description: offre.description ?? '',
        skills,
        salary: offre.salaire?.libelle,
        contractType: offre.typeContrat,
        publishedAt: offre.dateCreation,
        url:
          offre.origineOffre?.urlOrigine ??
          `https://candidat.francetravail.fr/offres/recherche/detail/${offre.id}`,
        source: 'francetravail',
      }));

      allJobs.push(...jobs);
      if (offres.length < 20) break;
    }

    return { jobs: allJobs, source: 'francetravail' };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 206) {
      // 206 Partial Content is actually used by FT when results are found
      // but the range is not fully filled. axios might throw if it's not handled.
      // But usually axios handles 2xx as success.
    }
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { jobs: allJobs.length > 0 ? allJobs : [], source: 'francetravail', error: allJobs.length === 0 ? `France Travail: ${message}` : undefined };
  }
}

