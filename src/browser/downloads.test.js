import { describe, expect, it, vi } from 'vitest';
import {
  DOWNLOAD_MIME,
  base64ToBytes,
  downloadBlob,
  downloadDocx,
  downloadResumeJson,
  downloadText,
} from './downloads.js';

function downloadHarness() {
  const link = { click: vi.fn(), remove: vi.fn() };
  const documentObject = {
    body: { append: vi.fn() },
    createElement: vi.fn(() => link),
  };
  const urlObject = {
    createObjectURL: vi.fn(() => 'blob:test'),
    revokeObjectURL: vi.fn(),
  };
  return { link, documentObject, urlObject };
}

describe('downloadBlob', () => {
  it('clicks a temporary download link and always cleans up its URL', () => {
    const harness = downloadHarness();
    const blob = new Blob(['resume']);
    downloadBlob(blob, 'Resume.txt', harness);

    expect(harness.urlObject.createObjectURL).toHaveBeenCalledWith(blob);
    expect(harness.documentObject.body.append).toHaveBeenCalledWith(harness.link);
    expect(harness.link).toMatchObject({ href: 'blob:test', download: 'Resume.txt', hidden: true });
    expect(harness.link.click).toHaveBeenCalledOnce();
    expect(harness.link.remove).toHaveBeenCalledOnce();
    expect(harness.urlObject.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('cleans up when clicking the link fails', () => {
    const harness = downloadHarness();
    harness.link.click.mockImplementation(() => { throw new Error('blocked'); });
    expect(() => downloadBlob(new Blob(['resume']), 'Resume.txt', harness)).toThrow('blocked');
    expect(harness.link.remove).toHaveBeenCalledOnce();
    expect(harness.urlObject.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('rejects invalid arguments and unavailable browser APIs', () => {
    expect(() => downloadBlob('text', 'Resume.txt')).toThrow(TypeError);
    expect(() => downloadBlob(new Blob(), ' ')).toThrow(TypeError);
    expect(() => downloadBlob(new Blob(), 'Resume.txt', { documentObject: {}, urlObject: {} }))
      .toThrow('Browser downloads are not available');
  });
});

describe('typed downloads', () => {
  it('creates JSON with the established pretty-print format and MIME type', async () => {
    const harness = downloadHarness();
    downloadResumeJson({ personal: { name: 'Ada' } }, 'Ada.json', harness);
    const blob = harness.urlObject.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe(DOWNLOAD_MIME.json);
    await expect(blob.text()).resolves.toBe('{\n  "personal": {\n    "name": "Ada"\n  }\n}');
  });

  it('creates UTF-8 plain-text downloads', async () => {
    const harness = downloadHarness();
    downloadText('Résumé', 'Resume.txt', harness);
    const blob = harness.urlObject.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe(DOWNLOAD_MIME.text);
    await expect(blob.text()).resolves.toBe('Résumé');
  });

  it('decodes DOCX base64 into a correctly typed binary download', async () => {
    const harness = downloadHarness();
    downloadDocx('UEsDBA==', 'Resume.docx', harness);
    const blob = harness.urlObject.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe(DOWNLOAD_MIME.docx);
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([80, 75, 3, 4]);
  });
});

describe('base64ToBytes', () => {
  it('accepts whitespace and returns exact bytes', () => {
    expect([...base64ToBytes(' SGVsbG8=\n')]).toEqual([72, 101, 108, 108, 111]);
  });

  it.each([null, '', 'not base64!', 'A'])('rejects invalid base64', (value) => {
    expect(() => base64ToBytes(value)).toThrow(TypeError);
  });
});
