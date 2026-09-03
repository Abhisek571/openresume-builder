import { describe, expect, it } from 'vitest';
import {
  RESUME_FILE_ACCEPT,
  ResumeImportError,
  parseResumeJson,
  readResumeFile,
  validateResumeData,
} from './resumeFiles.js';

const currentResume = {
  personal: { name: 'Ada Lovelace' },
  sections: [{ id: 'skills', type: 'skills', title: 'Skills', items: ['Math'] }],
};

describe('resume file validation', () => {
  it('accepts current resume data without stripping unknown fields', () => {
    const data = { ...currentResume, futureField: true };
    expect(validateResumeData(data)).toBe(data);
  });

  it('accepts legacy resume data that normalizeResume can migrate', () => {
    const legacy = { personal: { name: 'Grace Hopper' }, skills: ['COBOL'] };
    expect(validateResumeData(legacy)).toBe(legacy);
  });

  it.each([
    [null, 'invalid-root'],
    [[], 'invalid-root'],
    [{ personal: 'Ada', sections: [] }, 'invalid-personal'],
    [{ personal: {}, sections: {} }, 'invalid-sections'],
    [{ sections: [] }, 'missing-personal'],
    [{ personal: {}, sections: [{}] }, 'invalid-section'],
    [{ personal: {}, sections: [{ type: 'skills', items: [null] }] }, 'invalid-section-item'],
    [{ personal: {}, sections: [{ type: 'experience', items: [null] }] }, 'invalid-section-item'],
    [{ personal: {}, sections: [{ type: 'experience', items: [{ bullets: [null] }] }] }, 'invalid-bullets'],
    [{ personal: {}, sections: [{ type: 'languages', items: [{ language: {} }] }] }, 'invalid-field'],
    [{ personal: { name: {} }, sections: [] }, 'invalid-field'],
    [{ personal: {}, sections: [{ type: null, items: [] }] }, 'invalid-section-type'],
    [{ personal: {}, sections: [{ type: 'custom', title: {}, items: [] }] }, 'invalid-section-title'],
    [{ unrelated: true }, 'unrecognized-resume'],
    [{ personal: {}, skills: 'JavaScript' }, 'invalid-legacy-field'],
  ])('rejects malformed resume structures', (data, code) => {
    expect(() => validateResumeData(data)).toThrow(expect.objectContaining({ code }));
  });

  it('reports JSON syntax errors without exposing the source text', () => {
    let error;
    try {
      parseResumeJson('{"personal": SECRET');
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ResumeImportError);
    expect(error.code).toBe('invalid-json');
    expect(error.message).not.toContain('SECRET');
    expect(error.cause).toBeInstanceOf(SyntaxError);
  });
});

describe('readResumeFile', () => {
  it('reads and normalizes a legacy JSON file', async () => {
    const file = { name: 'resume.JSON', text: async () => JSON.stringify({ skills: ['JS'] }) };
    await expect(readResumeFile(file)).resolves.toMatchObject({
      personal: expect.any(Object),
      sections: [{ type: 'skills', items: ['JS'] }],
    });
  });

  it('does not mutate an already-current resume', async () => {
    const file = { name: 'resume.json', text: async () => JSON.stringify(currentResume) };
    await expect(readResumeFile(file)).resolves.toEqual(currentResume);
  });

  it('rejects missing files, other extensions, and read failures clearly', async () => {
    await expect(readResumeFile(null)).rejects.toMatchObject({ code: 'missing-file' });
    await expect(readResumeFile({ name: 'resume.txt', text: async () => '{}' })).rejects.toMatchObject({
      code: 'invalid-extension',
    });
    await expect(readResumeFile({ name: 'resume.json', text: async () => { throw new Error('denied'); } }))
      .rejects.toMatchObject({ code: 'read-failed', cause: expect.any(Error) });
  });

  it('exposes an accept value for JSON file inputs', () => {
    expect(RESUME_FILE_ACCEPT).toBe('.json,application/json');
  });
});
