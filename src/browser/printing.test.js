import { describe, expect, it, vi } from 'vitest';
import { printResume } from './printing.js';

describe('printResume', () => {
  it('opens the supplied browser print dialog', () => {
    const print = vi.fn();
    printResume({ print });
    expect(print).toHaveBeenCalledOnce();
  });

  it('fails clearly when printing is unavailable', () => {
    expect(() => printResume({})).toThrow('Browser printing is not available');
  });
});
