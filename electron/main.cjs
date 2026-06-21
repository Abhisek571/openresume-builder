const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const isDev = process.env.NODE_ENV === 'development';

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// Save resume JSON to disk
ipcMain.handle('save-resume', async (_e, data) => {
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Save Resume',
    defaultPath: 'resume.json',
    filters: [{ name: 'Resume JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { ok: false };
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return { ok: true, filePath };
});

// Load resume JSON from disk
ipcMain.handle('load-resume', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog(win, {
    title: 'Open Resume',
    properties: ['openFile'],
    filters: [{ name: 'Resume JSON', extensions: ['json'] }],
  });
  if (canceled || !filePaths.length) return { ok: false };
  const raw = await fs.readFile(filePaths[0], 'utf-8');
  return { ok: true, data: JSON.parse(raw) };
});

// Export the rendered preview to PDF
ipcMain.handle('export-pdf', async () => {
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Export PDF',
    defaultPath: 'resume.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { ok: false };
  const pdf = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  await fs.writeFile(filePath, pdf);
  return { ok: true, filePath };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
