import { Company, Job, ScraperResult, SearchResult } from '../types';
import { scrapeApec } from './apec';
import { scrapeFranceTravail } from './francetravail';
import { scrapeIndeed } from './indeed';
import { scrapeJobteaser } from './jobteaser';
import { scrapeWttj } from './wttj';

/**
 * Vérifie si une compétence apparaît comme mot entier dans un texte.
 */
function skillInText(skill: string, text: string): boolean {
  if (!text) return false;
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'i').test(text);
}

/**
 * Calcule un score de confiance pour un match de compétence dans un texte.
 *
 * Pour les compétences courtes et ambiguës (ex: "Make", "Go", "Swift"),
 * un match dans un contexte technique (liste d'outils, mots-clés no-code/automation…)
 * reçoit un score élevé (2), un match isolé reçoit 1.
 * Pour les compétences longues (Docker, Kubernetes…), tout match vaut 2.
 */
function skillConfidence(skill: string, text: string): number {
  if (!skillInText(skill, text)) return 0;

  // Compétences longues (≥6 lettres) : pas ambiguës, confiance maximale
  if (skill.length >= 6) return 2;

  // Pour les termes courts/ambigus, vérifie le contexte technique :
  // la compétence apparaît-elle dans une phrase avec d'autres outils ou mots no-code ?
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const contextRegex = new RegExp(
    `(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`,
    'gi'
  );

  const TECH_CONTEXT = [
    // Autres outils d'automatisation
    'zapier', 'n8n', 'integromat', 'airtable', 'notion', 'slack', 'hubspot',
    'salesforce', 'pipedrive', 'monday', 'asana', 'jira', 'confluence',
    // Mots no-code / automation
    'automation', 'automatisation', 'workflow', 'webhook', 'trigger',
    'no-code', 'nocode', 'low-code', 'intégration', 'integration', 'scénario',
    'scenario', 'api', 'pipeline', 'orchestration',
    // Mots techniques génériques signalant un contexte d'outil
    'stack', 'outils', 'tools', 'platform', 'logiciel', 'software',
    'experience with', 'expérience avec', 'maîtrise', 'maitrise',
  ];

  // Extrait une fenêtre de 200 chars autour de chaque occurrence du terme
  let match: RegExpExecArray | null;
  while ((match = contextRegex.exec(text)) !== null) {
    const start = Math.max(0, match.index - 100);
    const end = Math.min(text.length, match.index + skill.length + 100);
    const window = text.slice(start, end).toLowerCase();
    if (TECH_CONTEXT.some((kw) => window.includes(kw))) return 2;
  }

  // Match trouvé mais pas en contexte technique
  return 1;
}

/**
 * Filtre et trie les offres par pertinence.
 *
 * Stratégie :
 * - On dispose maintenant des VRAIES missions (key_missions + profile) stockées
 *   dans job.description grâce au scraper WTTJ mis à jour.
 * - On filtre : au moins une compétence doit apparaître comme MOT ENTIER
 *   dans le titre OU dans le contenu (missions/description).
 * - Le filtre word-boundary élimine les faux positifs dans le titre/contenu
 *   ("Makeup" ne matche pas "Make", "makesense" ne matche pas "Make"…).
 * - On garde les jobs où la compétence est uniquement dans le nom d'entreprise :
 *   le moteur de recherche les a retournés, on les place juste en fin de liste.
 * - Ordre final : compétence dans le titre → dans le contenu → date décroissante.
 */
function filterAndSortByRelevance(jobs: Job[], skills: string[]): Job[] {
  type Scored = {
    job: Job;
    titleConf: number;   // confiance match dans le titre (0/1/2)
    contentConf: number; // confiance match dans les missions/description (0/1/2)
    total: number;
  };

  const scored: Scored[] = jobs.map((job) => {
    const title = job.title ?? '';
    const content = job.description ?? '';

    // Somme des scores de confiance par compétence
    const titleConf = skills.reduce((sum, s) => sum + skillConfidence(s, title), 0);
    const contentConf = skills.reduce((sum, s) => sum + skillConfidence(s, content), 0);

    return { job, titleConf, contentConf, total: titleConf + contentConf };
  });

  // Filtre : confiance totale > 0 (au moins un match technique quelque part)
  // Les termes courts sans contexte technique (confiance=1) passent aussi —
  // la recherche du moteur amont les a jugés pertinents.
  const relevant = scored.filter((s) => s.total > 0);

  return relevant
    .sort((a, b) => {
      // Priorité 1 : score total décroissant (matches techniques > matches isolés)
      if (b.total !== a.total) return b.total - a.total;
      // Priorité 2 : match dans le titre
      if (b.titleConf !== a.titleConf) return b.titleConf - a.titleConf;
      // Priorité 3 : date
      const da = a.job.publishedAt ? new Date(a.job.publishedAt).getTime() : 0;
      const db = b.job.publishedAt ? new Date(b.job.publishedAt).getTime() : 0;
      return db - da;
    })
    .map((s) => s.job)
    .slice(0, 20);
}

function groupByCompany(jobs: Job[]): Company[] {
  const map = new Map<string, Company>();

  for (const job of jobs) {
    const key = job.company.toLowerCase().trim();
    if (map.has(key)) {
      const c = map.get(key)!;
      c.jobCount += 1;
      c.jobs.push(job);
      if (!c.logo && job.companyLogo) c.logo = job.companyLogo;
    } else {
      map.set(key, {
        name: job.company,
        logo: job.companyLogo,
        jobCount: 1,
        jobs: [job],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.jobCount - a.jobCount);
}

export async function scrapeAll(
  skills: string[],
  sources?: string[]
): Promise<SearchResult> {
  const allSources = ['indeed', 'wttj', 'apec', 'francetravail', 'jobteaser'];
  const activeSources = sources?.length ? sources : allSources;

  const scrapers: Promise<ScraperResult>[] = [];

  if (activeSources.includes('indeed')) scrapers.push(scrapeIndeed(skills));
  if (activeSources.includes('wttj')) scrapers.push(scrapeWttj(skills));
  if (activeSources.includes('apec')) scrapers.push(scrapeApec(skills));
  if (activeSources.includes('francetravail')) scrapers.push(scrapeFranceTravail(skills));
  if (activeSources.includes('jobteaser')) scrapers.push(scrapeJobteaser(skills));

  const results = await Promise.allSettled(scrapers);

  const allJobs: Job[] = [];
  const errors: { source: string; message: string }[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value.jobs);
      if (result.value.error) {
        errors.push({ source: result.value.source, message: result.value.error });
      }
    } else {
      errors.push({ source: 'unknown', message: String(result.reason) });
    }
  }

  // Déduplication par URL
  const seen = new Set<string>();
  const dedupedJobs = allJobs.filter((job) => {
    if (seen.has(job.url)) return false;
    seen.add(job.url);
    return true;
  });

  // Filtre + tri par pertinence sur titre ET contenu complet (missions incluses)
  const uniqueJobs = filterAndSortByRelevance(dedupedJobs, skills);

  const companies = groupByCompany(uniqueJobs);

  return {
    jobs: uniqueJobs,
    companies,
    totalJobs: uniqueJobs.length,
    errors,
  };
}
