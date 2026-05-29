const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 读取本地 data.json
async function readLocalData(venueId) {
  const userData = await ipcRenderer.invoke('get-user-data-path');
  const abs = path.join(userData, 'venueData', venueId, 'data.json');
  console.log('[readLocalData] path =', abs);
  try {
    const raw = await fs.promises.readFile(abs, 'utf-8');
    console.log('[readLocalData] size =', raw.length);
    const parsed = JSON.parse(raw);
    console.log('[readLocalData] Successfully parsed data.json for venue:', venueId);
    return parsed;
  } catch (e) {
    console.error('[readLocalData] ❌ Failed to read or parse local data:', e);
    throw new Error(`Failed to read local data for venue ${venueId}: ${e.message}`);
  }
}

contextBridge.exposeInMainWorld('api', {
  // 判断当前运行在 Electron 中
  isElectron: () => true,

  // 读取完整配置
  getConfig: () => ipcRenderer.invoke('get-config'),

  // 设置 venueId 并更新 lastUpdated
  setConfig: (venueId) => ipcRenderer.invoke('set-config', venueId),

  // 下载离线数据
  downloadVenueData: (venueId) => ipcRenderer.invoke('download-venue-data', venueId),

  // 读取本地 data.json
  readLocalData,

  // 下载进度事件
  onDownloadProgress: (fn) => {
    ipcRenderer.on('download-progress', (_, info) => fn(info));
  },
  // 模块状态完成/失败
  onDownloadStatus: (fn) => {
    ipcRenderer.on('download-status', (_, module, status) => fn(module, status));
  },

  // 正在下载的文件（开始下载时）
  onDownloadFileStart: (fn) => {
    ipcRenderer.on('download-file-start', (_, data) => fn(data)); // { module, filename }
  },
  // 单个文件下载完成
  onDownloadFile: (fn) => {
    ipcRenderer.on('download-file', (_, data) => fn(data)); // { module, filename }
  },
  // 单个文件失败
  onDownloadFileFail: (fn) => {
    ipcRenderer.on('download-file-fail', (_, data) => fn(data)); // { module, filename }
  },
  // 下载失败汇总
  onDownloadSummary: (fn) => {
    ipcRenderer.on('download-summary', (_, summary) => fn(summary));
  },
  // 全部下载完成
  onDownloadFinish: (fn) => {
    const listener = (_, payload) => fn(payload);
    ipcRenderer.on('download-finish', listener);
    return () => ipcRenderer.removeListener('download-finish', listener);
  }
});
