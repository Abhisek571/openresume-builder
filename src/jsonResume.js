import { stripMarkup } from './richText.js';
import { validateResumeData } from './browser/resumeFiles.js';

const plain = (value = '') => stripMarkup(value);
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isoDate = /^[12]\d{3}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/;
const fields = (item, mapping) => Object.fromEntries(Object.entries(mapping).map(([target, source]) => [target, plain(item[source])]));
function urlFields(value, extension) {
  if (!value) return {};
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    if (['https:', 'http:'].includes(url.protocol)) return { url: url.href.replace(/\/$/, ''), [extension]: value };
  } catch { /* Preserve unrecognized input as text, never execute it. */ }
  return { [extension]: value };
}
function dates(item) {
  const result = {};
  for (const key of ['start', 'end']) {
    if (isoDate.test(item[key] || '')) result[`${key}Date`] = item[key];
    if (item[key]) result[`openresume${key === 'start' ? 'Start' : 'End'}`] = plain(item[key]);
  }
  return result;
}

export function exportJsonResume(resume) {
  validateResumeData(resume);
  const p = resume.personal;
  const output = { basics: {
    ...fields(p, { name: 'name', label: 'title', phone: 'phone', summary: 'summary' }),
    location: { city: plain(p.location) }, ...urlFields(p.website, 'openresumeWebsite'),
  } };
  if (p.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) output.basics.email = p.email;
  else if (p.email) output.basics.openresumeEmail = p.email;
  const add = (key, values) => { output[key] = [...(output[key] || []), ...values]; };
  for (const section of resume.sections) {
    const items = section.items;
    if (section.type === 'experience') add('work', items.map((i) => ({ ...fields(i, { name: 'company', position: 'role', location: 'location' }), ...dates(i), highlights: (i.bullets || []).map(plain) })));
    else if (section.type === 'education') add('education', items.map((i) => ({ ...fields(i, { institution: 'school', area: 'degree', location: 'location' }), ...dates(i), courses: (i.bullets || []).map(plain) })));
    else if (section.type === 'projects') add('projects', items.map((i) => ({ name: plain(i.name), roles: i.role ? [plain(i.role)] : [], ...urlFields(i.link, 'openresumeLink'), ...dates(i), highlights: (i.bullets || []).map(plain) })));
    else if (section.type === 'certifications') add('certificates', items.map((i) => ({ ...fields(i, { name: 'name', issuer: 'issuer' }), ...(isoDate.test(i.date || '') && i.date.length === 10 ? { date: i.date } : {}), openresumeDate: plain(i.date) })));
    else if (section.type === 'languages') add('languages', items.map((i) => fields(i, { language: 'language', fluency: 'proficiency' })));
    else if (section.type === 'skills') add('skills', [{ name: plain(section.title), keywords: items.map(plain) }]);
    else if (section.type === 'links') output.basics.profiles = [...(output.basics.profiles || []), ...items.map((i) => ({ network: plain(i.label), ...urlFields(i.url, 'openresumeUrl') }))];
    else {
      output.meta ||= { version: '1.0.0', openresumeCustom: [] };
      output.meta.openresumeCustom.push({ title: plain(section.title), items: items.map((i) => typeof i === 'string' ? plain(i) : JSON.stringify(i)) });
    }
  }
  return output;
}

export function importJsonResume(input) {
  if (!record(input) || !record(input.basics)) throw new Error('JSON Resume must contain a basics object.');
  const resume = { personal: {}, sections: [] };
  const notices = [];
  let id = 0;
  const nextId = () => `import-${++id}`;
  const text = (value, path) => {
    if (value === undefined) return '';
    if (typeof value !== 'string') throw new Error(`${path} must be text.`);
    return value;
  };
  const array = (value, path) => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error(`${path} must be an array.`);
    return value;
  };
  const strings = (value, path) => array(value, path).map((v) => text(v, path));
  const section = (type, title, items) => { if (items.length) resume.sections.push({ id: nextId(), type, title, items }); };
  const park = (path, value) => {
    section('custom', `Imported: ${path}`, [typeof value === 'string' ? value : JSON.stringify(value)]);
    notices.push(`Preserved ${path} in a custom section.`);
  };
  const extras = (obj, used, path) => {
    for (const [key, value] of Object.entries(obj)) if (!used.includes(key)) park(`${path}.${key}`, value);
  };
  const p = input.basics;
  for (const [key, source] of Object.entries({ name: 'name', title: 'label', email: 'email', phone: 'phone', website: 'url', summary: 'summary' })) resume.personal[key] = text(p[source], `basics.${source}`);
  if (p.openresumeWebsite !== undefined) resume.personal.website = text(p.openresumeWebsite, 'basics.openresumeWebsite');
  if (p.openresumeEmail !== undefined) resume.personal.email = text(p.openresumeEmail, 'basics.openresumeEmail');
  if (p.location !== undefined && !record(p.location)) throw new Error('basics.location must be an object.');
  const location = p.location || {};
  const locationKeys = ['address', 'city', 'region', 'postalCode', 'countryCode'];
  resume.personal.location = locationKeys.map((key) => text(location[key], `basics.location.${key}`)).filter(Boolean).join(', ');
  extras(location, locationKeys, 'basics.location');
  extras(p, ['name', 'label', 'email', 'phone', 'url', 'summary', 'location', 'profiles', 'openresumeWebsite', 'openresumeEmail'], 'basics');
  const mapItems = (key, type, title, mapper) => {
    section(type, title, array(input[key], key).map((item, index) => {
      if (!record(item)) throw new Error(`${key}[${index}] must be an object.`);
      const used = new Set();
      const get = (name) => { used.add(name); return text(item[name], `${key}[${index}].${name}`); };
      const list = (name) => { used.add(name); return strings(item[name], `${key}[${index}].${name}`); };
      const result = { id: nextId(), ...mapper(get, list) };
      extras(item, [...used], `${key}[${index}]`);
      return result;
    }));
  };
  const dateFields = (get) => {
    const start = get('startDate'), end = get('endDate');
    return { start: get('openresumeStart') || start, end: get('openresumeEnd') || end };
  };
  mapItems('work', 'experience', 'Experience', (get, list) => ({ company: get('name'), role: get('position'), location: get('location'), ...dateFields(get), bullets: [get('summary'), ...list('highlights')].filter(Boolean) }));
  mapItems('education', 'education', 'Education', (get, list) => ({ school: get('institution'), degree: [get('studyType'), get('area')].filter(Boolean).join(' '), location: get('location'), ...dateFields(get), bullets: list('courses') }));
  mapItems('projects', 'projects', 'Projects', (get, list) => {
    const url = get('url');
    return { name: get('name'), role: list('roles').join(', '), link: get('openresumeLink') || url, ...dateFields(get), bullets: [get('description'), ...list('highlights')].filter(Boolean) };
  });
  mapItems('certificates', 'certifications', 'Certifications', (get) => { const date = get('date'); return { name: get('name'), issuer: get('issuer'), date: get('openresumeDate') || date }; });
  mapItems('languages', 'languages', 'Languages', (get) => ({ language: get('language'), proficiency: get('fluency') }));
  for (const [index, skill] of array(input.skills, 'skills').entries()) {
    if (!record(skill)) throw new Error('Each skill must be an object.');
    section('skills', text(skill.name, 'skills.name') || 'Skills', strings(skill.keywords, 'skills.keywords').length ? strings(skill.keywords, 'skills.keywords') : [text(skill.name, 'skills.name')].filter(Boolean));
    extras(skill, ['name', 'keywords'], `skills[${index}]`);
  }
  section('links', 'Links', array(p.profiles, 'basics.profiles').map((profile, index) => {
    if (!record(profile)) throw new Error('Each social profile must be an object.');
    extras(profile, ['network', 'url', 'openresumeUrl'], `basics.profiles[${index}]`);
    return { id: nextId(), label: text(profile.network, 'profile.network'), url: text(profile.openresumeUrl ?? profile.url, 'profile.url') };
  }));
  if (input.meta !== undefined) {
    if (!record(input.meta)) throw new Error('meta must be an object.');
    for (const custom of array(input.meta.openresumeCustom, 'meta.openresumeCustom')) {
      if (!record(custom)) throw new Error('Custom section must be an object.');
      section('custom', text(custom.title, 'custom.title') || 'Custom', strings(custom.items, 'custom.items'));
      extras(custom, ['title', 'items'], 'meta.openresumeCustom');
    }
    extras(input.meta, ['openresumeCustom'], 'meta');
  }
  extras(input, ['basics', 'work', 'education', 'projects', 'certificates', 'languages', 'skills', 'meta', '$schema'], 'resume');
  validateResumeData(resume);
  return { resume, notices };
}
