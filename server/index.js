import { DEFAULT_HOST, createProductionServer, resolvePort } from './app.js';

const host = process.env.HOST || DEFAULT_HOST;
const port = resolvePort();
const server = await createProductionServer();

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`OpenResume Builder could not start: http://${host}:${port} is already in use.`);
  } else {
    console.error('OpenResume Builder server failed.', error);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`OpenResume Builder is available at http://${host}:${port}`);
});
