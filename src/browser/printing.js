export function printResume(windowObject = globalThis.window) {
  if (typeof windowObject?.print !== 'function') {
    throw new Error('Browser printing is not available in this environment.');
  }
  windowObject.print();
}
