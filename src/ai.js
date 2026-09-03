// ============================================================
// AI HOOK — STUB (not active yet)
// ============================================================
// Leave this for later. When you're ready to add AI, this is
// where Claude (Anthropic API) plugs in.
//
// IMPORTANT: never call the Anthropic API directly from this
// renderer file with your API key — the key would be exposed.
// Instead, do the actual fetch in a server-only service and call it through
// the focused HTTP API client. Provider credentials must never enter Vite
// environment variables or the browser bundle.
//
// Rough plan when you build it:
//   1. Add a validated server endpoint and provider service.
//   2. Keep the provider key in the server process environment.
//   3. Add the request to src/api/client.js and call it here.
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

export async function improveWithAI(_resume) {
  return null;
}
