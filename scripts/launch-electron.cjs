// VS Code's integrated terminal (and other Electron-based terminals) set
// ELECTRON_RUN_AS_NODE, which makes electron.exe behave as plain Node instead
// of launching the app. Delete it before spawning so `require('electron')`
// returns the real API inside main.cjs.
delete process.env.ELECTRON_RUN_AS_NODE;

const { spawn } = require('node:child_process');
const electronPath = require('electron');

const child = spawn(electronPath, ['.'], { stdio: 'inherit', env: process.env });

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
