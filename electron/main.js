const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const dns = require('dns');


// 判断是否开发环境
const isDev = !app.isPackaged;
// require('dotenv').config();
const baseUrl = 'https://apis.platypus360.com';
const baseHostName = new URL(baseUrl).hostname;


//如果需要指定venue，就启用下面信息
const defaultConfig ={
  venueId:'',
  lastUpdated: '',

  lastAttempt: '',
  lastSuccess: '',
  lastStatus: '',
  lastError: ''
}


// 工具函数
const reportStatus = require('./utils/reportStatus');
const downloadVenueData = require('./utils/downloadVenueData');

// 配置路径
const configPath = path.join(app.getPath('userData'), 'config.json');
const downloadsRoot = path.join(app.getPath('userData'), 'venueData');

function ensureConfigFile() {
  if (!fs.existsSync(configPath)) {
    console.log('[Config] config.json not found, creating with default values.');
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  } else {
    console.log('[Config] config.json exists.');
  }
}

let mainWindow = null;
let downloadWindow = null;

async function hasNetworkConnectivity(hostname = baseHostName) {
  try {
    await dns.promises.lookup(hostname);
    console.log(`[Network] DNS lookup succeeded for ${hostname}`);
    return true;
  } catch (err) {
    console.warn(`[Network] DNS lookup failed for ${hostname}:`, err.message);
    return false;
  }
}

/**
 * 确保 userData 路径初始化成功
 */
function ensureBootstrap() {
  if (!fs.existsSync(downloadsRoot)) {
    fs.mkdirSync(downloadsRoot, { recursive: true });
    console.log('[main] Created venueData directory:', downloadsRoot);
  }
}

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    icon: path.join(__dirname, '../react-build/Picon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../react-build/index.html'));
    // 生产默认不打开 DevTools
  }
}



/**
 * 创建下载进度窗口
 */
function createDownloadWindow() {
  if (downloadWindow) return;
  downloadWindow = new BrowserWindow({
    width: 500,
    height: 800,
    title: 'Downloading...',
    parent: mainWindow,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    }
  });
  downloadWindow.loadFile(path.join(__dirname, 'ui/download-progress.html'));
  downloadWindow.on('closed', () => { downloadWindow = null; });
}

/**
 * 自动更新检查（启动或定时触发）
 * 强制重新下载 data.json 并补全资源
 */

async function autoUpdateCheck(showProgress = true) {
  try {
    const cfg = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : {};

    if (!cfg.venueId) {
      console.warn('[AutoUpdate] No venueId in config, skip check');
      return;
    }

    const online = await hasNetworkConnectivity();
    if (!online) {
      console.warn('[AutoUpdate] Offline detected, skip auto update');
      return;
    }
    console.log('[AutoUpdate] Online, proceeding with update check');

    // 等上报 + 打印结果
    try {
      const ok = await reportStatus(cfg.venueId, baseUrl);
      console.log('[reportStatus] sent =', ok);
    } catch (e) {
      console.error('[reportStatus] failed:', e?.message || e);
    }

    if (showProgress) createDownloadWindow();

    const success = await downloadVenueData(cfg.venueId, baseUrl, showProgress ? downloadWindow : null);
    if (success) {
      cfg.lastUpdated = new Date().toISOString();
      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
      console.log('[AutoUpdate] venue data updated successfully');
    } else {
      console.warn('[AutoUpdate] Skipped updating config because download failed.');
    }
  } catch (err) {
    console.error('[AutoUpdate] Failed to update venue data:', err);
  }
}




// ── 每天凌晨 3 点自动重启 ─────────────────────────────────────────────────────

let nightlyRestartScheduled = false;
const AUTO_UPDATE_ON_START = false;
const AUTO_UPDATE_INTERVAL_MS = 0;
const ENABLE_NIGHTLY_RESTART = true;

async function performNightlyRestart() {
  console.log('[NightlyRestart] Running checks...');

  let cfg = {};

  try {
    // 1. 读取配置
    cfg = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : {};

    // 记录本次尝试
    cfg.lastAttempt = new Date().toISOString();
    cfg.lastStatus = 'running';
    cfg.lastError = '';

    fs.writeFileSync(
      configPath,
      JSON.stringify(cfg, null, 2),
      'utf-8'
    );

    // 2. 没有配置 venue，跳过
    if (!cfg.venueId) {
      cfg.lastStatus = 'failed';
      cfg.lastError = 'No venueId configured';

      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');

      console.log('[NightlyRestart] No venueId, skip');
      return;
    }

    // 3. 没有网络，跳过
    const online = await hasNetworkConnectivity();
    if (!online) {
      cfg.lastStatus = 'failed';
      cfg.lastError = 'No network connectivity';

      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');

      console.log('[NightlyRestart] Offline, skip');
      return;
    }

    // 4. 下载最新数据
    console.log('[NightlyRestart] Downloading fresh data before restart...');
    const success = await downloadVenueData(
      cfg.venueId,
      baseUrl,
      null,
      true
    );

    if (!success) {
      cfg.lastStatus = 'failed';
      cfg.lastError = 'downloadVenueData returned false';

      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');

      console.log('[NightlyRestart] Download failed, skip restart to keep existing content');
      return;
    }

    // 5. 更新成功状态
    const now = new Date().toISOString();

    cfg.lastUpdated = now;
    cfg.lastSuccess = now;
    cfg.lastStatus = 'success';
    cfg.lastError = '';

    fs.writeFileSync(
      configPath,
      JSON.stringify(cfg, null, 2),
      'utf-8'
    );

    // 6. 重启
    console.log('[NightlyRestart] All checks passed, relaunching...');
    app.relaunch();
    app.exit(0);

  } catch (err) {

    try {
      cfg.lastStatus = 'failed';
      cfg.lastError = err?.message || String(err);

      fs.writeFileSync(
        configPath,
        JSON.stringify(cfg, null, 2),
        'utf-8'
      );
    } catch {}

    console.error('[NightlyRestart] Unexpected error, skip restart:', err);
  }
}

function scheduleNightlyRestart() {
  if (nightlyRestartScheduled) return;
  nightlyRestartScheduled = true;

  const now = new Date();
  const target = new Date();
  target.setHours(3, 0, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);

  const delay = target.getTime() - now.getTime();
  console.log(`[NightlyRestart] Scheduled for ${target.toLocaleString()} (in ${Math.round(delay / 60000)} min)`);

  setTimeout(async () => {
    nightlyRestartScheduled = false;
    await performNightlyRestart();
    scheduleNightlyRestart(); // 无论重启与否都安排下一天（重启成功则进程已退出，不会执行到这里）
  }, delay);
}

// 启动
app.whenReady().then(() => {
  // 开机启动
  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath,
    args: isDev ? [] : ['--open-at-login'],
  });

  ensureBootstrap();
  ensureConfigFile();
  createWindow();
  if (AUTO_UPDATE_ON_START) {
    setTimeout(() => autoUpdateCheck(true), 2000);
  }
  if (ENABLE_NIGHTLY_RESTART) {
    scheduleNightlyRestart();
  }
});


// macOS 行为
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 每 6 小时定时自动更新
if (AUTO_UPDATE_INTERVAL_MS > 0) {
  setInterval(() => {
    autoUpdateCheck(false);
  }, AUTO_UPDATE_INTERVAL_MS);
}
// ---------------- IPC 通信 ----------------

ipcMain.handle('get-config', () => {
  try {
    return fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : {};
  } catch (err) {
    console.error('[IPC:get-config] Failed to read config.json:', err);
    throw new Error('Failed to read config.json (see main process log)');
  }
});

ipcMain.handle('set-config', (evt, venueId) => {
  try {
    const cfg = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : {};
    cfg.venueId = venueId;
    cfg.lastUpdated = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
    return cfg;
  } catch (err) {
    console.error('[IPC:set-config] Failed to write config.json:', err);
    throw new Error('Failed to write config.json (see main process log)');
  }
});

ipcMain.handle('get-user-data-path', () => app.getPath('userData'));

ipcMain.handle('download-venue-data', async (evt, venueId) => {
  try {
    console.log('[IPC:download-venue-data] Requested download for venue:', venueId);

    const online = await hasNetworkConnectivity();
    if (!online) {
      console.warn('[IPC:download-venue-data] Abort download because device is offline');
      throw new Error('Device is offline. Please connect to the internet and try again.');
    }

    createDownloadWindow();

    const success = await downloadVenueData(venueId, baseUrl, downloadWindow);

    if (!success) {
      throw new Error('Download did not complete successfully.');
    }

    const cfg = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : {};
    cfg.venueId = venueId;
    cfg.lastUpdated = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');

    return cfg;
  } catch (err) {
    console.error('[IPC:download-venue-data] Download failed:', err);
    throw new Error(err.message || 'Failed to download offline data (see main process log)');
  }
});
