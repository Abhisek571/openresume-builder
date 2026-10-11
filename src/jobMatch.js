import { stripMarkup } from './richText.js';

// Deterministic keyword coverage, not an ATS score or a hiring prediction.
// Deliberately bounded vocabulary; custom phrases cover non-technical roles.
const ALIASES = {
  javascript: ['js'], typescript: ['ts'], 'node.js': ['nodejs', 'node js'],
  postgresql: ['postgres'], 'c++': [], 'c#': ['c sharp'], python: [], react: ['react.js', 'reactjs'],
  sql: [], java: [], html: ['html5'], css: ['css3'], git: [], docker: [], kubernetes: ['k8s'],
  aws: ['amazon web services'], azure: [], 'google cloud': ['gcp'], linux: [], excel: [],
  'power bi': ['powerbi'], tableau: [], 'project management': [], 'customer service': [],
  leadership: [], communication: [], accessibility: ['accessible', 'wcag'], testing: ['unit tests'],
  agile: [], scrum: [], sales: [], accounting: [], budgeting: [], recruitment: [],
};
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function contains(text, phrase) {
  return new RegExp(`(?<![\\p{L}\\p{N}_+#])${escape(phrase)}(?![\\p{L}\\p{N}_+#])`, 'iu').test(text);
}

function evidenceLines(resume) {
  const lines = [];
  const add = (text, sectionId, section) => {
    if (typeof text === 'string' && text.trim()) lines.push({ text: stripMarkup(text), sectionId, section });
  };
  add(resume.personal?.title, 'personal', 'Personal');
  add(resume.personal?.summary, 'personal', 'Summary');
  for (const section of resume.sections || []) {
    for (const item of section.items || []) {
      if (typeof item === 'string') add(item, section.id, section.title || section.type);
      else if (item) {
        for (const key of ['role', 'degree', 'name', 'language', 'proficiency']) add(item[key], section.id, section.title || section.type);
        for (const bullet of item.bullets || []) add(bullet, section.id, section.title || section.type);
      }
    }
  }
  return lines;
}

export function matchJob(resume, description, customTerms = []) {
  const vocabulary = new Map(Object.entries(ALIASES));
  const knownTerms = new Set(Object.entries(ALIASES).flatMap(([term, aliases]) => [term, ...aliases]));
  for (const term of customTerms.slice(0, 100)) {
    const clean = term.trim().toLowerCase().slice(0, 100);
    if (clean && !knownTerms.has(clean)) vocabulary.set(clean, []);
  }
  const lines = evidenceLines(resume);
  const terms = [];
  // Keep description order, rather than suggesting any skill is more important.
  for (const [term, aliases] of vocabulary) {
    const variants = [term, ...aliases];
    if (!variants.some((variant) => contains(description, variant))) continue;
    const evidence = lines.filter(({ text }) => variants.some((variant) => contains(text, variant)));
    const position = Math.min(...variants.map((variant) => description.toLowerCase().indexOf(variant)).filter((n) => n >= 0));
    terms.push({ term, evidence, position });
  }
  terms.sort((a, b) => a.position - b.position);
  const missing = terms.filter(({ evidence }) => !evidence.length).map(({ term }) => term);
  return { terms, missing, coverage: terms.length ? Math.round(100 * (terms.length - missing.length) / terms.length) : null };
}
