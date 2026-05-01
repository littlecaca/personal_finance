const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// --- Auto Updater Configuration ---
autoUpdater.autoDownload = true;
autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
});
autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: '更新已就绪',
    message: `新版本 ${info.version} 已下载完成。是否立即安装并重启？`,
    buttons: ['是', '否']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
});

// --- Configuration & Constants ---
const BASE_DATA_DIR = path.join(app.getPath('userData'), 'data');
const CONFIG_FILE = path.join(BASE_DATA_DIR, 'config.json');
const METADATA_FILE = path.join(BASE_DATA_DIR, 'metadata.json');
const HISTORY_FILE = path.join(BASE_DATA_DIR, 'history.json');

if (!fs.existsSync(BASE_DATA_DIR)) {
  fs.mkdirSync(BASE_DATA_DIR, { recursive: true });
}

const DEFAULT_CONFIG = {
  "assets": { "股票 (Stocks)": 0, "加密货币 (Crypto)": 0, "银行存款 (Deposits)": 0, "基金 (Funds)": 0 },
  "categories": {
    "房租水电": { "limit": 3000, "initial": 2500, "rollover": false },
    "餐饮美食": { "limit": 2000, "initial": 0, "rollover": true },
    "交通出行": { "limit": 500, "initial": 0, "rollover": false },
    "日常购物": { "limit": 1000, "initial": 0, "rollover": false }
  },
  "surplus_target": ""
};

// --- Utilities ---
function loadJson(filePath, defaultValue) {
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return defaultValue;
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

function getMonthFile(yearMonth) {
  return path.join(BASE_DATA_DIR, `${yearMonth}.json`);
}

function formatMonth(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatDateTime(date) {
  return date.getFullYear() + '-' + 
         String(date.getMonth() + 1).padStart(2, '0') + '-' + 
         String(date.getDate()).padStart(2, '0') + ' ' + 
         String(date.getHours()).padStart(2, '0') + ':' + 
         String(date.getMinutes()).padStart(2, '0');
}

// --- Core Logic ---
let lastSurplusCheckMonth = null;

function checkAndProcessSurplus() {
  const currentMonthStr = formatMonth(new Date());
  if (lastSurplusCheckMonth === currentMonthStr) return; // Already checked this month in this session

  const config = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
  const globalTarget = config.surplus_target;
  let meta = loadJson(METADATA_FILE, { counts: {}, rolled_over_months: [] });
  const recordedMonths = Object.keys(meta.counts).sort();
  const rolledOver = new Set(meta.rolled_over_months || []);

  let changed = false;
  for (const monthStr of recordedMonths) {
    if (monthStr < currentMonthStr && !rolledOver.has(monthStr)) {
      const monthFile = getMonthFile(monthStr);
      if (!fs.existsSync(monthFile)) continue;

      let mData = loadJson(monthFile, { expenses: [], adjustments: {}, budget_snapshot: {} });
      const refCats = (mData.budget_snapshot && Object.keys(mData.budget_snapshot).length > 0) ? mData.budget_snapshot : config.categories;

      let catSpends = {};
      for (const cat in refCats) {
        catSpends[cat] = parseFloat(refCats[cat].initial || 0);
      }

      for (const exp of mData.expenses) {
        if (catSpends.hasOwnProperty(exp.category)) {
          catSpends[exp.category] += parseFloat(exp.amount);
        }
      }

      // Calculate next month
      const parts = monthStr.split('-');
      let year = parseInt(parts[0]);
      let month = parseInt(parts[1]);
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
      const nextMonthStr = `${year}-${String(month).padStart(2, '0')}`;
      const nextFile = getMonthFile(nextMonthStr);
      let nextData = loadJson(nextFile, { expenses: [], adjustments: {}, budget_snapshot: {} });
      if (!nextData.adjustments) nextData.adjustments = {};

      for (const cat in refCats) {
        const details = refCats[cat];
        const catLimit = parseFloat(details.limit) + parseFloat((mData.adjustments && mData.adjustments[cat]) || 0);
        const catSurplus = catLimit - (catSpends[cat] || 0);

        if (catSurplus > 0) {
          if (details.rollover) {
            nextData.adjustments[cat] = (nextData.adjustments[cat] || 0) + catSurplus;
          } else if (globalTarget && config.categories[globalTarget]) {
            nextData.adjustments[globalTarget] = (nextData.adjustments[globalTarget] || 0) + catSurplus;
          }
        }
      }

      saveJson(nextFile, nextData);
      if (!meta.counts[nextMonthStr]) {
        meta.counts[nextMonthStr] = nextData.expenses.length;
      }

      if (!meta.rolled_over_months) meta.rolled_over_months = [];
      meta.rolled_over_months.push(monthStr);
      changed = true;
    }
  }
  
  if (changed) {
    saveJson(METADATA_FILE, meta);
  }
  lastSurplusCheckMonth = currentMonthStr;
}

function getAppData(targetMonth, page = 1, perPage = 8) {
  const config = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
  const meta = loadJson(METADATA_FILE, { counts: {}, rolled_over_months: [] });
  const monthFile = getMonthFile(targetMonth);
  const monthData = loadJson(monthFile, { expenses: [], adjustments: {}, budget_snapshot: {} });
  const activeCategories = (monthData.budget_snapshot && Object.keys(monthData.budget_snapshot).length > 0) ? monthData.budget_snapshot : config.categories;

  let categoryTotals = {};
  let categoryLimits = {};

  for (const cat in activeCategories) {
    categoryTotals[cat] = parseFloat(activeCategories[cat].initial || 0);
    categoryLimits[cat] = parseFloat(activeCategories[cat].limit) + parseFloat((monthData.adjustments && monthData.adjustments[cat]) || 0);
  }

  for (const exp of monthData.expenses) {
    if (categoryTotals.hasOwnProperty(exp.category)) {
      categoryTotals[exp.category] += parseFloat(exp.amount);
    }
  }

  const totalCount = monthData.expenses.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  page = Math.max(1, Math.min(page, totalPages));

  return {
    "assets": config.assets,
    "history": loadJson(HISTORY_FILE, []),
    "categories": config.categories,
    "active_categories": activeCategories,
    "category_totals": categoryTotals,
    "category_limits": categoryLimits,
    "total_month_spend": Object.values(categoryTotals).reduce((a, b) => a + b, 0),
    "total_month_limit": Object.values(categoryLimits).reduce((a, b) => a + b, 0),
    "expenses": monthData.expenses.slice((page - 1) * perPage, page * perPage),
    "metadata": meta.counts,
    "current_month": targetMonth,
    "surplus_target": config.surplus_target || "",
    "pagination": { "current_page": page, "total_pages": totalPages, "total_count": totalCount, "has_next": page < totalPages, "has_prev": page > 1 }
  };
}

// --- IPC Handlers ---
ipcMain.handle('get-app-data', async (event, month, page) => {
  checkAndProcessSurplus();
  const targetMonth = month || formatMonth(new Date());
  return getAppData(targetMonth, page);
});

ipcMain.handle('add-expense', async (event, { category, amount, description }) => {
  const config = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
  const now = new Date();
  const ym = formatMonth(now);
  const mFile = getMonthFile(ym);
  let mData = loadJson(mFile, { expenses: [], adjustments: {}, budget_snapshot: {} });
  
  if (!mData.budget_snapshot || Object.keys(mData.budget_snapshot).length === 0) {
    mData.budget_snapshot = config.categories;
  }
  
  mData.expenses.unshift({
    date: formatDateTime(now),
    amount: parseFloat(amount),
    description: description,
    category: category
  });
  
  saveJson(mFile, mData);
  
  let meta = loadJson(METADATA_FILE, { counts: {} });
  meta.counts[ym] = mData.expenses.length;
  saveJson(METADATA_FILE, meta);
  return { success: true, month: ym };
});

ipcMain.handle('delete-expense', async (event, month, index) => {
  const mFile = getMonthFile(month);
  let mData = loadJson(mFile, { expenses: [], adjustments: {}, budget_snapshot: {} });
  if (index >= 0 && index < mData.expenses.length) {
    mData.expenses.splice(index, 1);
    saveJson(mFile, mData);
    let meta = loadJson(METADATA_FILE, { counts: {} });
    meta.counts[month] = mData.expenses.length;
    saveJson(METADATA_FILE, meta);
  }
  return { success: true };
});

ipcMain.handle('update-asset', async (event, { category, action, amount }) => {
  let config = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
  const amt = parseFloat(amount);
  if (config.assets.hasOwnProperty(category)) {
    if (action === 'add') config.assets[category] += amt;
    else if (action === 'set') config.assets[category] = amt;
    config.assets[category] = Math.max(0, config.assets[category]);
    saveJson(CONFIG_FILE, config);
  }
  return { success: true };
});

ipcMain.handle('manage-category', async (event, { name, limit, initial, rollover, oldName }) => {
  let config = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
  if (oldName && config.categories.hasOwnProperty(oldName)) {
    if (oldName !== name) delete config.categories[oldName];
  }
  config.categories[name] = { limit: parseFloat(limit), initial: parseFloat(initial), rollover: !!rollover };
  saveJson(CONFIG_FILE, config);

  const ym = formatMonth(new Date());
  const mFile = getMonthFile(ym);
  if (fs.existsSync(mFile)) {
    let mData = loadJson(mFile, {});
    mData.budget_snapshot = config.categories;
    saveJson(mFile, mData);
  }
  return { success: true };
});

ipcMain.handle('delete-category', async (event, name) => {
  let config = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
  if (config.categories.hasOwnProperty(name)) {
    delete config.categories[name];
    if (config.surplus_target === name) config.surplus_target = "";
    saveJson(CONFIG_FILE, config);
  }
  return { success: true };
});

ipcMain.handle('add-asset-category', async (event, name) => {
  let config = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
  if (name && !config.assets.hasOwnProperty(name)) {
    config.assets[name] = 0;
    saveJson(CONFIG_FILE, config);
  }
  return { success: true };
});

ipcMain.handle('delete-asset-category', async (event, name) => {
  let config = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
  if (config.assets.hasOwnProperty(name)) {
    delete config.assets[name];
    saveJson(CONFIG_FILE, config);
  }
  return { success: true };
});

ipcMain.handle('reorder-categories', async (event, newOrder) => {
  let config = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
  const newCats = {};
  for (const name of newOrder) {
    if (config.categories.hasOwnProperty(name)) {
      newCats[name] = config.categories[name];
    }
  }
  config.categories = newCats;
  saveJson(CONFIG_FILE, config);

  // Sync to current month snapshot if it exists
  const ym = formatMonth(new Date());
  const mFile = getMonthFile(ym);
  if (fs.existsSync(mFile)) {
    let mData = loadJson(mFile, {});
    // Filter and reorder the snapshot too
    const newSnapshot = {};
    for (const name of newOrder) {
      if (mData.budget_snapshot && mData.budget_snapshot.hasOwnProperty(name)) {
        newSnapshot[name] = mData.budget_snapshot[name];
      } else if (config.categories.hasOwnProperty(name)) {
        newSnapshot[name] = config.categories[name];
      }
    }
    mData.budget_snapshot = newSnapshot;
    saveJson(mFile, mData);
  }
  return { success: true };
});

ipcMain.handle('reorder-asset-categories', async (event, newOrder) => {
  let config = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
  const newAssets = {};
  for (const name of newOrder) {
    if (config.assets.hasOwnProperty(name)) {
      newAssets[name] = config.assets[name];
    }
  }
  config.assets = newAssets;
  saveJson(CONFIG_FILE, config);
  return { success: true };
});

ipcMain.handle('record-asset-snapshot', async (event) => {
  const config = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
  let history = loadJson(HISTORY_FILE, []);
  const total = Object.values(config.assets).reduce((a, b) => a + parseFloat(b), 0);
  history.push({
    date: formatDateTime(new Date()),
    total: total
  });
  saveJson(HISTORY_FILE, history.slice(-100));
  return { success: true };
});

ipcMain.handle('delete-history-point', async (event, index) => {
  let history = loadJson(HISTORY_FILE, []);
  if (index >= 0 && index < history.length) {
    history.splice(index, 1);
    saveJson(HISTORY_FILE, history);
  }
  return { success: true };
});

ipcMain.handle('set-surplus-target', async (event, target) => {
    let config = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
    config.surplus_target = target;
    saveJson(CONFIG_FILE, config);
    return { success: true };
});

ipcMain.handle('set-theme', async (event, theme) => {
    const { nativeTheme } = require('electron');
    nativeTheme.themeSource = theme;
    return { success: true };
});

// --- Window Management ---
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    title: 'finance paper-金融手账',
    icon: path.join(__dirname, 'logo.ico'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  // win.webContents.openDevTools();
}

app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost');

app.whenReady().then(() => {
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
