const { contextBridge, ipcRenderer } = require('electron');

// Safe bridge between the React UI and Electron's file system.
contextBridge.exposeInMainWorld('api', {
  saveResume: (data) => ipcRenderer.invoke('save-resume', data),
  loadResume: () => ipcRenderer.invoke('load-resume'),
  exportPDF: () => ipcRenderer.invoke('export-pdf'),
});
