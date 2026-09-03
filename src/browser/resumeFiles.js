import { normalizeResume } from '../data.js';

export const RESUME_FILE_ACCEPT = '.json,application/json';

export class ResumeImportError extends Error {
  constructor(message, code, options) {
    super(message, options);
    this.name = 'ResumeImportError';
    this.code = code;
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const PERSONAL_FIELDS = ['name', 'title', 'email', 'phone', 'location', 'website', 'summary'];
const STRING_ITEM_TYPES = new Set(['skills', 'custom']);
const OBJECT_ITEM_FIELDS = {
  experience: ['role', 'company', 'location', 'start', 'end'],
  education: ['degree', 'school', 'location', 'start', 'end'],
  projects: ['name', 'role', 'link', 'start', 'end'],
  certifications: ['name', 'issuer', 'date'],
  languages: ['language', 'proficiency'],
  links: ['label', 'url'],
};
const BULLET_ITEM_TYPES = new Set(['experience', 'education', 'projects']);

function validateOptionalStrings(record, fields, context) {
  for (const field of fields) {
    if (record[field] !== undefined && typeof record[field] !== 'string') {
      throw new ResumeImportError(`${context} field "${field}" must be text.`, 'invalid-field');
    }
  }
}

function validateSectionItems(section) {
  if (STRING_ITEM_TYPES.has(section.type)) {
    if (section.items.some((item) => typeof item !== 'string')) {
      throw new ResumeImportError(`${section.type} section items must be text.`, 'invalid-section-item');
    }
    return;
  }

  const fields = OBJECT_ITEM_FIELDS[section.type];
  if (!fields) return;
  for (const item of section.items) {
    if (!isRecord(item)) {
      throw new ResumeImportError(`${section.type} section items must be objects.`, 'invalid-section-item');
    }
    validateOptionalStrings(item, fields, `${section.type} item`);
    if (BULLET_ITEM_TYPES.has(section.type) && item.bullets !== undefined) {
      if (!Array.isArray(item.bullets) || item.bullets.some((bullet) => typeof bullet !== 'string')) {
        throw new ResumeImportError(`${section.type} item bullets must be an array of text.`, 'invalid-bullets');
      }
    }
  }
}

// Keep validation intentionally structural. Older resume files are normalized
// below, while unknown fields and section types remain available for forward
// compatibility instead of being silently discarded.
export function validateResumeData(data) {
  if (!isRecord(data)) {
    throw new ResumeImportError('The selected file does not contain a resume object.', 'invalid-root');
  }

  if (data.personal !== undefined && !isRecord(data.personal)) {
    throw new ResumeImportError('The resume personal details must be an object.', 'invalid-personal');
  }
  if (isRecord(data.personal)) validateOptionalStrings(data.personal, PERSONAL_FIELDS, 'Personal');

  if (data.sections !== undefined) {
    if (!Array.isArray(data.sections)) {
      throw new ResumeImportError('The resume sections must be an array.', 'invalid-sections');
    }
    if (!isRecord(data.personal)) {
      throw new ResumeImportError('The resume is missing its personal details.', 'missing-personal');
    }
    for (const section of data.sections) {
      if (!isRecord(section) || !Array.isArray(section.items)) {
        throw new ResumeImportError('Every resume section must contain an items array.', 'invalid-section');
      }
      if (typeof section.type !== 'string') {
        throw new ResumeImportError('Every resume section must have a text type.', 'invalid-section-type');
      }
      if (section.title !== undefined && typeof section.title !== 'string') {
        throw new ResumeImportError('Every resume section title must be text.', 'invalid-section-title');
      }
      validateSectionItems(section);
    }
    return data;
  }

  const legacyKeys = ['experience', 'education', 'skills'];
  const hasLegacyContent = legacyKeys.some((key) => Array.isArray(data[key]));
  if (!hasLegacyContent && !isRecord(data.personal)) {
    throw new ResumeImportError('The selected JSON is not a recognized resume file.', 'unrecognized-resume');
  }
  for (const key of legacyKeys) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      throw new ResumeImportError(`The legacy resume field "${key}" must be an array.`, 'invalid-legacy-field');
    }
  }
  return data;
}

export function parseResumeJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ResumeImportError('The selected file is not valid JSON.', 'invalid-json', { cause: error });
  }
  return validateResumeData(parsed);
}

export async function readResumeFile(file) {
  if (!file || typeof file.text !== 'function') {
    throw new ResumeImportError('Select a JSON resume file to import.', 'missing-file');
  }
  if (file.name && !file.name.toLowerCase().endsWith('.json')) {
    throw new ResumeImportError('Resume imports must use a .json file.', 'invalid-extension');
  }

  let text;
  try {
    text = await file.text();
  } catch (error) {
    throw new ResumeImportError('The selected resume file could not be read.', 'read-failed', { cause: error });
  }
  return normalizeResume(parseResumeJson(text));
}
