const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('financeAPI', {
  getAppData: (month, page) => ipcRenderer.invoke('get-app-data', month, page),
  addExpense: (data) => ipcRenderer.invoke('add-expense', data),
  deleteExpense: (month, index) => ipcRenderer.invoke('delete-expense', month, index),
  updateAsset: (data) => ipcRenderer.invoke('update-asset', data),
  manageCategory: (data) => ipcRenderer.invoke('manage-category', data),
  deleteCategory: (name) => ipcRenderer.invoke('delete-category', name),
  addAssetCategory: (name) => ipcRenderer.invoke('add-asset-category', name),
  deleteAssetCategory: (name) => ipcRenderer.invoke('delete-asset-category', name),
  recordAssetSnapshot: () => ipcRenderer.invoke('record-asset-snapshot'),
  deleteHistoryPoint: (index) => ipcRenderer.invoke('delete-history-point', index),
  setSurplusTarget: (target) => ipcRenderer.invoke('set-surplus-target', target),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  reorderCategories: (newOrder) => ipcRenderer.invoke('reorder-categories', newOrder),
  reorderAssetCategories: (newOrder) => ipcRenderer.invoke('reorder-asset-categories', newOrder),
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  onUpdateDownloadStart: (callback) => ipcRenderer.on('update-download-start', () => callback()),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (event, percent) => callback(percent)),
  onUpdateDownloadFinished: (callback) => ipcRenderer.on('update-download-finished', () => callback()),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, message) => callback(message))
});
