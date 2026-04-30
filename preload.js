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
  setSurplusTarget: (target) => ipcRenderer.invoke('set-surplus-target', target)
});
