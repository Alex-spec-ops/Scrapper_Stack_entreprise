import { NextRequest, NextResponse } from 'next/server';
import { scrapeAll } from '../../../lib/scrapers/index';

export const maxDuration = 60; // Vercel: 60 secondes max

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { skills, sources, countries } = body as {
      skills?: string[];
      sources?: string[];
      countries?: string[];
    };

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json(
        { error: 'Veuillez fournir au moins une compétence.' },
        { status: 400 }
      );
    }

    // Nettoyage des compétences
    const cleanedSkills = skills
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 10); // Max 10 compétences

    if (cleanedSkills.length === 0) {
      return NextResponse.json(
        { error: 'Compétences invalides.' },
        { status: 400 }
      );
    }

    const result = await scrapeAll(cleanedSkills, sources, countries);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API /scrape]', err);
    return NextResponse.json(
      { error: 'Erreur serveur. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
