export const DOWNLOAD_MIME = Object.freeze({
  json: 'application/json',
  text: 'text/plain;charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
});

function browserDependencies(options = {}) {
  const documentObject = options.documentObject ?? globalThis.document;
  const urlObject = options.urlObject ?? globalThis.URL;
  if (!documentObject?.createElement || !urlObject?.createObjectURL || !urlObject?.revokeObjectURL) {
    throw new Error('Browser downloads are not available in this environment.');
  }
  return { documentObject, urlObject };
}

export function downloadBlob(blob, filename, options) {
  if (!(blob instanceof Blob)) throw new TypeError('downloadBlob requires a Blob.');
  if (typeof filename !== 'string' || !filename.trim()) {
    throw new TypeError('downloadBlob requires a non-empty filename.');
  }

  const { documentObject, urlObject } = browserDependencies(options);
  const objectUrl = urlObject.createObjectURL(blob);
  const link = documentObject.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.hidden = true;

  try {
    documentObject.body?.append(link);
    link.click();
  } finally {
    link.remove();
    urlObject.revokeObjectURL(objectUrl);
  }
}

export function downloadResumeJson(resume, filename, options) {
  const blob = new Blob([JSON.stringify(resume, null, 2)], { type: DOWNLOAD_MIME.json });
  downloadBlob(blob, filename, options);
}

export function downloadText(text, filename, options) {
  const blob = new Blob([String(text)], { type: DOWNLOAD_MIME.text });
  downloadBlob(blob, filename, options);
}

export function base64ToBytes(base64) {
  if (typeof base64 !== 'string') throw new TypeError('DOCX data must be a base64 string.');
  const compact = base64.replace(/\s/g, '');
  if (!compact || compact.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
    throw new TypeError('DOCX data is not valid base64.');
  }

  let binary;
  try {
    binary = globalThis.atob(compact);
  } catch (error) {
    throw new TypeError('DOCX data is not valid base64.', { cause: error });
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function downloadDocx(base64, filename, options) {
  const blob = new Blob([base64ToBytes(base64)], { type: DOWNLOAD_MIME.docx });
  downloadBlob(blob, filename, options);
}
