import { describe, it, expect } from 'vitest';
import { matchJob } from './jobMatch.js';

const resume = { personal: { summary: 'Built Node.js services using PostgreSQL.' }, sections: [
  { id: 'skills', type: 'skills', title: 'Skills', items: ['JavaScript, C++'] },
  { id: 'work', type: 'experience', title: 'Experience', items: [{ bullets: ['Delivered accessible React applications.'] }] },
] };

describe('local keyword coverage', () => {
  it('finds aliases and locates evidence without counting repeated terms twice', () => {
    const result = matchJob(resume, 'JavaScript JS, NodeJS, Postgres, React. React. Python required.');
    expect(result.terms.map((x) => x.term)).toEqual(['javascript', 'node.js', 'postgresql', 'react', 'python']);
    expect(result.coverage).toBe(80);
    expect(result.terms.find((x) => x.term === 'react').evidence[0]).toMatchObject({ sectionId: 'work', text: 'Delivered accessible React applications.' });
    expect(result.missing).toEqual(['python']);
  });
  it('handles punctuation and boundaries rather than substring matches', () => {
    expect(matchJob(resume, 'C++ and C#').missing).toEqual(['c#']);
    expect(matchJob({ personal: {}, sections: [{ type: 'skills', items: ['NoSQL'] }] }, 'SQL').coverage).toBe(0);
  });
  it('does not score metadata, personal contact details or empty descriptions', () => {
    expect(matchJob({ personal: { email: 'python@example.org' }, sections: [] }, 'Python').coverage).toBe(0);
    expect(matchJob(resume, '').coverage).toBeNull();
    expect(matchJob(resume, 'We are looking for a great person').terms).toEqual([]);
  });
  it('ignores formatting markers and does not double-count custom aliases', () => {
    const formatted = { personal: { summary: 'Project **management** using JavaScript.' }, sections: [] };
    expect(matchJob(formatted, 'Project management and JS', ['js']).coverage).toBe(100);
    expect(matchJob(formatted, 'JS', ['js']).terms).toHaveLength(1);
  });
  it('accepts user-selected phrases for roles outside the built-in vocabulary', () => {
    expect(matchJob({ personal: { summary: 'Managed clinical trials.' }, sections: [] }, 'Clinical trials experience', ['clinical trials']).coverage).toBe(100);
  });
});
