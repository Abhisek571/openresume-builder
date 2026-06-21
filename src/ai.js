// ============================================================
// AI HOOK — STUB (not active yet)
// ============================================================
// Leave this for later. When you're ready to add AI, this is
// where Claude (Anthropic API) plugs in.
//
// IMPORTANT: never call the Anthropic API directly from this
// renderer file with your API key — the key would be exposed.
// Instead, do the actual fetch in electron/main.js (the main
// process) and call it through an IPC bridge, the same way
// save/load/export already work in preload.cjs.
//
// Rough plan when you build it:
//   1. In preload.cjs, expose:  improveText: (payload) => ipcRenderer.invoke('ai-improve', payload)
//   2. In electron/main.js, add an ipcMain.handle('ai-improve', ...)
//      that fetches https://api.anthropic.com/v1/messages with
//      your key from an env var, and returns improved text.
//   3. Replace the body of this function to call window.api.improveText(...).
//
// Example of the eventual main-process call (for reference only):
//   fetch('https://api.anthropic.com/v1/messages', {
//     method: 'POST',
//     headers: {
//       'content-type': 'application/json',
//       'x-api-key': process.env.ANTHROPIC_API_KEY,
//       'anthropic-version': '2023-06-01',
//     },
//     body: JSON.stringify({
//       model: 'claude-sonnet-4-6',
//       max_tokens: 1024,
//       messages: [{ role: 'user', content: 'Rewrite these resume bullets...' }],
//     }),
//   })
// ============================================================

export async function improveWithAI(resume) {
  console.log('AI stub called. Not configured yet.', resume);
  return null;
}
