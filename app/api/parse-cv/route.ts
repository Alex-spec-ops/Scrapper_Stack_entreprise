import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse/lib/pdf-parse';

const KNOWN_SKILLS = [
  // Langages
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'PHP', 'Ruby',
  'Go', 'Golang', 'Rust', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl',
  'Dart', 'Elixir', 'Haskell', 'Lua', 'Bash', 'Shell', 'PowerShell',
  'SQL', 'HTML', 'CSS', 'SASS', 'SCSS', 'C',

  // Frontend
  'React', 'Vue.js', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte', 'jQuery',
  'Bootstrap', 'Tailwind', 'Webpack', 'Vite', 'Redux', 'HTMX', 'Astro',
  'Ember', 'Backbone',

  // Backend
  'Node.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Spring', 'Laravel',
  'Rails', 'Express', 'NestJS', 'Symfony', 'ASP.NET', 'Gin', 'Fiber',
  'Actix', 'Hono', 'Fastify', 'Strapi',

  // Bases de données
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite',
  'Oracle', 'MariaDB', 'Cassandra', 'DynamoDB', 'Supabase', 'Firebase',
  'Neo4j', 'InfluxDB', 'Snowflake', 'BigQuery', 'Prisma', 'Sequelize',
  'Mongoose', 'CouchDB',

  // Cloud / DevOps
  'AWS', 'GCP', 'Google Cloud Platform', 'Azure', 'Docker', 'Kubernetes',
  'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'GitLab CI',
  'CircleCI', 'Helm', 'Prometheus', 'Grafana', 'Linux', 'Nginx', 'Apache',
  'Vercel', 'Heroku', 'Pulumi', 'ArgoCD', 'Istio', 'Vault',
  'DevOps', 'CI/CD', 'Microservices', 'API REST',

  // Data / IA / ML
  'Machine Learning', 'Deep Learning', 'Data Science', 'Big Data',
  'Intelligence Artificielle', 'Apprentissage automatique',
  'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'Keras',
  'OpenCV', 'Spark', 'Hadoop', 'Airflow', 'dbt', 'Power BI', 'Tableau',
  'LangChain', 'Hugging Face', 'OpenAI', 'LLM', 'RAG', 'MLOps',
  'Matplotlib', 'Seaborn', 'XGBoost', 'MLflow', 'Jupyter',
  'Data Engineering', 'Data Mining', 'Data Visualization', 'Data Warehousing',
  'NLP', 'Computer Vision', 'ETL', 'A/B Testing', 'Statistiques',
  'Modélisation prédictive', 'Réseaux de neurones', 'Analyse de données',

  // Cybersécurité
  'Sécurité informatique', 'Ethical Hacking', 'Penetration Testing',
  'Cryptographie', 'Sécurité réseau', 'SIEM', 'Gestion des vulnérabilités',
  'Analyse forensique', 'Sécurité Cloud', 'IAM', 'Firewall', 'IDS/IPS',
  'RGPD', 'ISO 27001', 'SOC', 'Threat Intelligence', 'Sécurité applicative',
  'Zero Trust', 'Incident Response', 'Risk Assessment',

  // Gestion de projet & méthodes
  'Gestion de projet', 'Agile', 'Scrum', 'Kanban', 'PMP', 'Prince2',
  'Jira', 'Confluence', 'MS Project', 'Planification stratégique',
  'Gestion des risques', 'Gestion du changement', 'Lean', 'Six Sigma',
  'SAFe', 'OKR', 'KPI', 'Roadmapping', 'Gestion des parties prenantes',
  'Budgétisation', 'Priorisation', 'Sprint Planning', 'Retrospective',
  'Backlog Management', 'Product Management', 'TDD', 'BDD',

  // Business & stratégie
  'Analyse business', 'Business Intelligence', 'Modélisation financière',
  'Analyse stratégique', 'Due Diligence', 'Business Plan', 'Market Research',
  'Analyse concurrentielle', 'Business Development', 'Stratégie digitale',
  'Transformation digitale', 'Innovation', 'Design Thinking', 'Lean Startup',
  'Value Proposition', 'Business Model Canvas', 'ROI Analysis', 'Benchmarking',
  'Analyse SWOT', 'Growth Hacking', 'Go-to-Market Strategy',
  'Partnership Development', 'Corporate Strategy',

  // Marketing & communication
  'Marketing digital', 'SEO', 'SEM', 'Google Ads', 'Facebook Ads',
  'Content Marketing', 'Email Marketing', 'Social Media Marketing',
  'Community Management', 'Branding', 'Marketing Analytics', 'Google Analytics',
  'CRM', 'Salesforce', 'HubSpot', 'Marketing Automation', 'Copywriting',
  'Storytelling', 'Relations publiques', 'Influence Marketing', 'Video Marketing',
  'Event Marketing', 'Product Marketing', 'ABM', 'Conversion Optimization',
  'UX Writing', 'Brand Strategy', 'Customer Journey Mapping', 'Marketing ROI',

  // Design & créativité
  'UX Design', 'UI Design', 'Photoshop', 'Illustrator', 'Figma', 'Sketch',
  'Adobe XD', 'InDesign', 'After Effects', 'Premiere Pro', 'Design graphique',
  'Wireframing', 'Prototyping', 'Design System', 'Motion Design', '3D Modeling',
  'Blender', 'CAD', 'User Research', 'Usability Testing',
  'Information Architecture', 'Responsive Design', 'Accessibility Design',
  'Brand Design', 'Illustration', 'Animation', 'Video Editing',

  // Finance & comptabilité
  'Comptabilité', 'Analyse financière', 'Contrôle de gestion', 'Audit',
  'Fiscalité', 'IFRS', 'Consolidation', 'Excel avancé', 'SAP FI/CO',
  'Oracle Financials', 'Reporting financier', 'Budget & Forecast',
  'Cash Management', 'Treasury', 'Valorisation d\'entreprise', 'DCF', 'LBO',
  'Corporate Finance', 'Financial Planning & Analysis', 'Gestion de trésorerie',
  'Normes comptables', 'Clôture comptable', 'Cost Accounting', 'Tax Planning',
  'Internal Controls',

  // Ressources humaines
  'Recrutement', 'Gestion des talents', 'Formation et développement', 'Paie',
  'SIRH', 'Employee Engagement', 'Performance Management',
  'Compensation & Benefits', 'Relations sociales', 'Droit du travail',
  'Onboarding', 'Talent Acquisition', 'Employer Branding', 'People Analytics',
  'Succession Planning', 'Diversity & Inclusion', 'Culture d\'entreprise',
  'Change Management', 'Coaching', 'Mentoring', 'Employee Relations',
  'HRIS', 'Workday', 'SAP HR', 'HR Strategy',

  // Vente & relation client
  'Vente B2B', 'Vente B2C', 'Négociation commerciale', 'Prospection',
  'Account Management', 'Customer Success', 'Sales Enablement',
  'Pipeline Management', 'Closing', 'Cold Calling', 'Solution Selling',
  'Consultative Selling', 'Inside Sales', 'Field Sales',
  'Key Account Management', 'Territory Management', 'Sales Operations',
  'Sales Analytics', 'CRM Management', 'Customer Retention', 'Upselling',
  'Cross-selling', 'Relationship Building', 'Customer Experience',
  'Service client',

  // Soft skills & leadership
  'Leadership', 'Management d\'équipe', 'Communication', 'Négociation',
  'Résolution de problèmes', 'Pensée critique', 'Créativité', 'Adaptabilité',
  'Intelligence émotionnelle', 'Gestion du temps', 'Prise de décision',
  'Collaboration', 'Travail en équipe', 'Empathie', 'Résilience', 'Persuasion',
  'Influence', 'Feedback', 'Délégation', 'Résolution de conflits', 'Networking',
  'Public Speaking', 'Active Listening', 'Gestion du stress', 'Autonomie',
  'Proactivité', 'Vision stratégique', 'Accountability',

  // Domaines spécialisés
  'SAP', 'ERP', 'Supply Chain Management', 'Logistique', 'Procurement',
  'Lean Manufacturing', 'Quality Management', 'Operations Management',
  'Process Improvement', 'Business Process Modeling', 'Legal Compliance',
  'Regulatory Affairs', 'Healthcare IT', 'FinTech', 'Blockchain', 'IoT',
  'Edge Computing', 'Quantum Computing', 'Sustainability', 'ESG',
  'Energy Management', 'BIM', 'GIS', 'Télécommunications', 'Biotechnologie',
  'Pharmacovigilance', 'Clinical Research', 'E-commerce', 'Retail Management',
  'Hospitality Management', 'Real Estate', 'Insurance', 'Risk Management',

  // Outils divers
  'Git', 'Postman', 'GraphQL', 'REST', 'gRPC', 'WebSocket', 'API',
  'Kafka', 'RabbitMQ', 'MQTT', 'n8n', 'Make', 'Zapier', 'Airtable',
  'Shopify', 'WordPress', 'Magento', 'OAuth', 'JWT', 'LDAP', 'SSO',
];

function extractSkills(text: string): string[] {
  const found = new Set<string>();

  for (const skill of KNOWN_SKILLS) {
    // Cherche le skill en tant que mot entier, insensible à la casse
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![a-zA-Z0-9.])${escaped}(?![a-zA-Z0-9])`, 'i');
    if (regex.test(text)) {
      // Conserve la casse canonique définie dans KNOWN_SKILLS
      found.add(skill);
    }
  }

  return Array.from(found).sort((a, b) => a.localeCompare(b, 'fr'));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('cv');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Seuls les fichiers PDF sont acceptés.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const skills = extractSkills(parsed.text);

    return NextResponse.json({ skills, charCount: parsed.text.length });
  } catch (err) {
    console.error('[API /parse-cv]', err);
    return NextResponse.json({ error: 'Impossible de lire le PDF.' }, { status: 500 });
  }
}
