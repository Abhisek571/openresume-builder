import { describe, it, expect } from 'vitest';
import { exportJsonResume, importJsonResume } from './jsonResume.js';
import { emptyResume } from './data.js';
import { createRequire } from 'node:module';
import schema from '../docs/jsonresume-schema-v1.0.0.json';
const require = createRequire(import.meta.url);
const Ajv = require('ajv'); // Already supplied by the existing ESLint toolchain.
const ajv = new Ajv({ schemaId: 'id', allErrors: true });
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
const valid = ajv.compile(schema);


describe('JSON Resume interchange', () => {
  it('exports portable content without markup and imports substantive fields', () => {
    const source = structuredClone(emptyResume);
    source.sections[0].items[0].bullets = ['**Built** *software*'];
    const output = exportJsonResume(source);
    expect(valid(output), JSON.stringify(valid.errors)).toBe(true);
    expect(output.work[0].highlights).toEqual(['Built software']);
    expect(output.work[0].endDate).toBeUndefined();
    expect(output.basics.url).toBe('https://github.com/janedoe');
    const { resume } = importJsonResume(output);
    expect(resume.personal).toEqual(source.personal);
    expect(resume.sections.find((s) => s.type === 'experience').items[0]).toMatchObject({ company: 'Acme Corp', start: '2022', end: 'Present', bullets: ['Built software'] });
    expect(resume.sections.find((s) => s.type === 'skills').items).toEqual(source.sections[2].items);
  });
  it('parks unsupported top-level and nested fields visibly, including unknown basics', () => {
    const { resume, notices } = importJsonResume({ basics: { name: 'A', image: 'photo.png', location: { city: 'Melbourne', countryCode: 'AU' } }, work: [{ name: 'Co', salary: 123 }], awards: [{ title: 'Medal' }] });
    const parked = resume.sections.filter((s) => s.type === 'custom');
    expect(JSON.stringify(parked)).toContain('photo.png');
    expect(JSON.stringify(parked)).toContain('Medal');
    expect(JSON.stringify(parked)).toContain('123');
    expect(resume.personal.location).toContain('AU');
    expect(notices.length).toBeGreaterThan(0);
  });
  it('rejects malformed content with readable errors', () => {
    for (const value of [null, [], {}, { basics: 'bad' }, { basics: {}, work: [null] }, { basics: {}, skills: [{ keywords: [42] }] }]) {
      expect(() => importJsonResume(value)).toThrow();
    }
  });
  it('retains custom sections and nonstandard dates without inventing dates', () => {
    const resume = { personal: {}, sections: [{ id: 'x', type: 'certifications', title: 'Certificates', items: [{ name: 'Certificate', date: '2024' }] }, { id: 'y', type: 'custom', title: 'Other', items: ['Volunteer'] }] };
    const output = exportJsonResume(resume);
    expect(output.certificates[0].date).toBeUndefined();
    const result = importJsonResume(output).resume;
    expect(result.sections.find((s) => s.type === 'certifications').items[0].date).toBe('2024');
    expect(result.sections.find((s) => s.type === 'custom')).toMatchObject({ title: 'Other', items: ['Volunteer'] });
  });
});
