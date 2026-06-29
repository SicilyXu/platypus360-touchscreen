const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const urlMod = require('url');
const { pathToFileURL } = urlMod;
const downloadFile = require('./downloadFile');
const { BrowserWindow } = require('electron');

// 引入 Electron 主进程 app
const { app } = require('electron');

/**
 * 获取用户数据目录（Roaming）下的 venueData 根目录
 */
function getRootDownloadsDir() {
  return path.join(app.getPath('userData'), 'venueData');
}

console.log('[downloadVenueData] userData path:', app.getPath('userData'));

/**
 * 生成 file:// 绝对路径
 */
function fileUri(folder, fileUrl, saveDir) {
  if (!fileUrl) return null;
  const cleaned = String(fileUrl).trim();
  if (!cleaned) return null;

  const filename = getSafeAssetFilename(cleaned);
  const absPath = path.join(saveDir, folder, filename);
  const normalized = path.normalize(absPath);

  try {
    return pathToFileURL(normalized).href;
  } catch (err) {
    console.warn('[downloadVenueData] Failed to convert to file URL:', normalized, err.message);
    return normalized;
  }
}

function getSafeAssetFilename(fileUrl) {
  const cleaned = String(fileUrl).trim().replace(/^\{+/, '').replace(/\}+$/, '');
  const hash = crypto.createHash('sha1').update(cleaned).digest('hex').slice(0, 16);

  try {
    const parsed = new URL(cleaned);
    const rawName = path.posix.basename(parsed.pathname) || 'asset';
    return buildHashedFilename(rawName, hash);
  } catch {
    const withoutQuery = cleaned.split('?')[0].split('#')[0];
    const lastSlash = withoutQuery.lastIndexOf('/');
    const rawName = lastSlash >= 0 ? withoutQuery.slice(lastSlash + 1) : withoutQuery;
    return buildHashedFilename(rawName || 'asset', hash);
  }
}

function sanitizeFilename(name) {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || 'asset';
}

function buildHashedFilename(rawName, hash) {
  const safeName = sanitizeFilename(rawName);
  const ext = path.extname(safeName);
  const base = ext ? safeName.slice(0, -ext.length) : safeName;
  return `${base}-${hash}${ext}`;
}

function loadExistingBundleData(saveDir) {
  const existingPath = path.join(saveDir, 'data.json');
  if (!fs.existsSync(existingPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
  } catch (err) {
    console.warn('[downloadVenueData] Failed to read existing data.json:', err.message);
    return null;
  }
}

/**
 * 下载并解析 JSON（GET 请求）
 */
function fetchJson(fullUrl, callback) {
  console.log('[downloadVenueData] Fetching JSON:', fullUrl);
  const parsed = urlMod.parse(fullUrl);
  const protocol = parsed.protocol === 'https:' ? https : http;
  protocol
    .get(fullUrl, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          callback(null, JSON.parse(data));
        } catch (e) {
          callback(new Error(`[downloadVenueData] Failed to parse JSON from ${fullUrl}`));
        }
      });
    })
    .on('error', err => callback(err));
}

/**
 * 确保目录存在
 */
function ensureDir(targetPath) {
  if (fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      console.warn(`[downloadVenueData] ${targetPath} exists but is not a directory, deleting file...`);
      fs.unlinkSync(targetPath);
      fs.mkdirSync(targetPath, { recursive: true });
    }
  } else {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

/**
 * 下载一批资源文件，并汇总失败项
 */
function downloadAssets(urls = [], baseDir, browserWindow, moduleName = '', failList = []) {
  ensureDir(baseDir);

  const tasks = urls.map(fileUrl => new Promise((resolve) => {
    let cleaned = String(fileUrl).trim();
    cleaned = cleaned.replace(/^\{+/, '').replace(/\}+$/, '');

    if (!cleaned || cleaned.toLowerCase() === 'none' || !/^https?:\/\//.test(cleaned)) {
      console.warn('[downloadVenueData] Invalid URL, skipped:', fileUrl);
      resolve();
      return;
    }

    const filename = getSafeAssetFilename(cleaned);
    const savePath = path.join(baseDir, filename);
    const tempDownloadPath = `${savePath}.download`;

    if (browserWindow && !browserWindow.isDestroyed()) {
      browserWindow.webContents.send('download-file-start', { module: moduleName, filename });
    }

    try {
      if (fs.existsSync(tempDownloadPath)) {
        fs.unlinkSync(tempDownloadPath);
      }
    } catch {}

    try {
      if (fs.existsSync(savePath)) {
        const existingStat = fs.statSync(savePath);
        if (existingStat.isFile() && existingStat.size > 0) {
          console.log(`[downloadVenueData] Already exists, skipped: ${filename}`);
          if (browserWindow && !browserWindow.isDestroyed()) {
            browserWindow.webContents.send('download-file', { module: moduleName, filename });
          }
          resolve();
          return;
        }

        fs.unlinkSync(savePath);
        console.warn(`[downloadVenueData] Re-downloading invalid local asset: ${filename}`);
      }
    } catch (err) {
      console.warn(`[downloadVenueData] Failed to inspect existing asset: ${filename}`, err.message);
    }

    console.log(`[downloadVenueData] Downloading: ${cleaned}`);

    const MAX_RETRIES = 3;

    const attemptDownload = (attempt) => {
      downloadFile(cleaned, tempDownloadPath)
        .then(() => {
          try {
            fs.renameSync(tempDownloadPath, savePath);
          } catch (err) {
            fs.copyFileSync(tempDownloadPath, savePath);
            fs.unlinkSync(tempDownloadPath);
          }

          console.log(`[downloadVenueData] Downloaded: ${filename}`);

          if (browserWindow && !browserWindow.isDestroyed()) {
            browserWindow.webContents.send('download-file', { module: moduleName, filename });
          }

          resolve();
        })
        .catch(err => {
          try {
            if (fs.existsSync(tempDownloadPath)) {
              fs.unlinkSync(tempDownloadPath);
            }
          } catch {}

          if (attempt < MAX_RETRIES) {
            const delay = 1000 * attempt;
            console.warn(`[downloadVenueData] Retry ${attempt}/${MAX_RETRIES} in ${delay}ms: ${filename}`);
            setTimeout(() => attemptDownload(attempt + 1), delay);
          } else {
            console.warn(`[downloadVenueData] Failed after ${MAX_RETRIES} attempts: ${cleaned}`, err.message);

            if (browserWindow && !browserWindow.isDestroyed()) {
              browserWindow.webContents.send('download-file-fail', { module: moduleName, filename });
            }

            failList && failList.push({ module: moduleName, filename, url: cleaned, err: err.message });

            resolve();
          }
        });
    };

    attemptDownload(1);
  }));

  return Promise.all(tasks);
}

function getAssetFailuresSince(failList, startIndex, moduleNames) {
  const names = new Set(moduleNames);
  return failList.slice(startIndex).filter((item) => names.has(item.module));
}

function assertModuleAssetsDownloaded(key, failList, startIndex, moduleNames) {
  const failures = getAssetFailuresSince(failList, startIndex, moduleNames);
  if (failures.length === 0) return;

  const filenames = failures.map((item) => item.filename || item.url || 'unknown').join(', ');
  throw new Error(`[downloadVenueData] [${key}] asset download incomplete: ${filenames}`);
}

function getPreferredAssetUri(folder, originalUrl, saveDir, candidateDirs = [saveDir]) {
  if (!originalUrl) return null;
  const localUri = fileUri(folder, originalUrl, saveDir);
  if (!localUri) return originalUrl;

  const filename = getSafeAssetFilename(originalUrl);
  for (const dir of candidateDirs) {
    try {
      const localPath = path.join(dir, folder, filename);
      if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
        return localUri;
      }
    } catch {
      // Fall back to the original remote URL below.
    }
  }

  return originalUrl;
}

async function downloadVenueData(venueId, baseUrl, browserWindow = null, strict = false) {
  try {
    const ROOT_DOWNLOADS = getRootDownloadsDir();

    const endpoints = {
      basicInfo: `${baseUrl}/ts/${venueId}/basic-info`,
      contentTree: `${baseUrl}/ts/${venueId}/ts-content-tree`,
      ads: `${baseUrl}/ts/${venueId}/ads`,
      videos: `${baseUrl}/ts/${venueId}/videos`,
      flights: `${baseUrl}/ts/${venueId}/live-info/flights`,
      news: `${baseUrl}/ts/${venueId}/live-info/news`,
      weather: `${baseUrl}/ts/${venueId}/live-info/weather`,
      tides: `${baseUrl}/ts/${venueId}/live-info/tides`,
      vline: `${baseUrl}/ts/${venueId}/live-info/vline`,
    };

    const saveDir = path.join(ROOT_DOWNLOADS, venueId);
    const saveDirTemp = path.join(ROOT_DOWNLOADS, venueId + '_temp');

    if (fs.existsSync(saveDirTemp)) fs.rmSync(saveDirTemp, { recursive: true, force: true });
    ensureDir(saveDirTemp);
    ensureDir(saveDir);

    if (fs.existsSync(saveDir)) {
      try {
        fs.cpSync(saveDir, saveDirTemp, { recursive: true });
        console.log('[downloadVenueData] Seeded temp from existing files');
      } catch (e) {
        console.warn('[downloadVenueData] Could not seed temp dir:', e.message);
      }
    }

    const savePath = path.join(saveDirTemp, 'data.json');
    const existingData = loadExistingBundleData(saveDir) || {};

    const finalData = {
      basicInfo: existingData.basicInfo || existingData['basic-info'] || null,
      contentTree: existingData.contentTree || existingData['ts-content-tree'] || null,
      ads: existingData.ads || null,
      videos: existingData.videos || null,
      liveInfo: {
        flights: existingData.liveInfo?.flights || existingData.flights || null,
        news: existingData.liveInfo?.news || existingData.news || null,
        weather: existingData.liveInfo?.weather || existingData.weather || null,
        tides: existingData.liveInfo?.tides || existingData.tides || null,
        vline: existingData.liveInfo?.vline || existingData.vline || null
      }
    };

    const failFiles = [];
    const failedModules = [];

    let completed = 0;
    const total = Object.keys(endpoints).length;

    return await new Promise((resolve) => {
      const finalize = () => {
        let success = true;
        const backupDir = path.join(ROOT_DOWNLOADS, `${venueId}_backup`);
        if (failFiles.length > 0) {
          console.warn(
            `[downloadVenueData] ${failFiles.length} asset(s) failed to download, keeping previous data for affected modules.`
          );
        }

        if (failedModules.length > 0) {
          console.warn(
            `[downloadVenueData] ${failedModules.length} module(s) failed and will keep previous data: ${failedModules.join(', ')}`
          );
        }

        if (!finalData.basicInfo || !finalData.contentTree) {
          success = false;
          console.warn('[downloadVenueData] Missing required basicInfo/contentTree, keeping existing bundle.');
        }

        if (success) {
          try {
            fs.writeFileSync(savePath, JSON.stringify(finalData, null, 2), 'utf-8');

            if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
            if (fs.existsSync(saveDir)) fs.renameSync(saveDir, backupDir);
            fs.renameSync(saveDirTemp, saveDir);
            if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
            console.log(`[downloadVenueData] Bundle swapped to: ${saveDir}`);

            if (browserWindow && !browserWindow.isDestroyed()) {
              browserWindow.webContents.send('download-file', {
                module: 'basicInfo',
                filename: 'data.json'
              });
            }
          } catch (writeErr) {
            success = false;
            console.error('[downloadVenueData] Failed to save data.json:', writeErr);
            try {
              if (!fs.existsSync(saveDir) && fs.existsSync(backupDir)) {
                fs.renameSync(backupDir, saveDir);
              }
            } catch (restoreErr) {
              console.error('[downloadVenueData] Failed to restore backup bundle:', restoreErr);
            }
          }
        }

        if (!success) {
          console.warn('[downloadVenueData] Download failed, keeping existing data.');
          try { if (fs.existsSync(saveDirTemp)) fs.rmSync(saveDirTemp, { recursive: true, force: true }); } catch {}
          try {
            if (!fs.existsSync(saveDir) && fs.existsSync(backupDir)) {
              fs.renameSync(backupDir, saveDir);
            }
          } catch (restoreErr) {
            console.error('[downloadVenueData] Failed to restore backup bundle after unsuccessful download:', restoreErr);
          }
        }

        if (browserWindow && !browserWindow.isDestroyed()) {
          if (failFiles.length > 0) {
            const summary = {};
            failFiles.forEach(item => {
              if (!summary[item.module]) summary[item.module] = [];
              summary[item.module].push(item.filename || item.url || 'unknown');
            });
            browserWindow.webContents.send('download-summary', summary);
          }

          browserWindow.webContents.send('download-finish', success);
          browserWindow.close();
        }

        resolve(success);
      };

      function reportDone(key, err) {
        completed++;
        if (err) {
          failedModules.push(key);
        }
        console.log(`[downloadVenueData] Module "${key}" ${err ? 'failed' : 'done'} (${completed}/${total})`);
        if (browserWindow && !browserWindow.isDestroyed()) {
          browserWindow.webContents.send('download-status', key, err ? 'fail' : 'done');
        }
        if (completed === total) {
          finalize();
        }
      }

      function track(key, fetchUrl, assignFn) {
        fetchJson(fetchUrl, async (err, data) => {
          if (err) {
            console.error(`[downloadVenueData] [${key}] fetch failed:`, err.message);
            reportDone(key, err);
            return;
          }

          if (data == null) {
            const nullErr = new Error(`[downloadVenueData] [${key}] returned null/undefined`);
            console.error(nullErr.message);
            reportDone(key, nullErr);
            return;
          }

          try {
            switch (key) {
              case 'basicInfo': {
                const assetStartIndex = failFiles.length;
                const slides = Array.isArray(data.landing?.venueSlides) ? data.landing.venueSlides : [];
                const logo = data.landing?.venueLogo ? [data.landing.venueLogo] : [];
                await downloadAssets(slides, path.join(saveDirTemp, 'slides'), browserWindow, 'slides', failFiles);
                await downloadAssets(logo, path.join(saveDirTemp, 'logo'), browserWindow, 'logo', failFiles);
                assertModuleAssetsDownloaded(key, failFiles, assetStartIndex, ['slides', 'logo']);

                data.landing.venueSlides = slides.map((u) =>
                  getPreferredAssetUri('slides', u, saveDir, [saveDirTemp, saveDir])
                );
                data.landing.venueLogo = logo.length
                  ? getPreferredAssetUri('logo', logo[0], saveDir, [saveDirTemp, saveDir])
                  : null;
                break;
              }
              case 'contentTree': {
                const assetStartIndex = failFiles.length;
                const allUrls = new Set();
                function collect(n) {
                  if (n.bannerImage) allUrls.add(n.bannerImage);
                  if (n.mapUrl) allUrls.add(n.mapUrl);
                  if (n.mapData?.imageUrl) allUrls.add(n.mapData.imageUrl);
                  if (Array.isArray(n.imageUrls)) n.imageUrls.forEach(u => allUrls.add(u));
                  if (Array.isArray(n.attributes)) n.attributes.forEach(collect);
                }
                if (Array.isArray(data)) data.forEach(collect);
                else collect(data);
                await downloadAssets([...allUrls], path.join(saveDirTemp, 'content'), browserWindow, 'content', failFiles);
                assertModuleAssetsDownloaded(key, failFiles, assetStartIndex, ['content']);

                function replace(n) {
                  if (n.bannerImage) {
                    n.bannerImage = getPreferredAssetUri('content', n.bannerImage, saveDir, [saveDirTemp, saveDir]);
                  }
                  if (n.mapUrl) {
                    n.mapUrl = getPreferredAssetUri('content', n.mapUrl, saveDir, [saveDirTemp, saveDir]);
                  }
                  if (n.mapData?.imageUrl) {
                    n.mapData.imageUrl = getPreferredAssetUri('content', n.mapData.imageUrl, saveDir, [saveDirTemp, saveDir]);
                  }
                  if (Array.isArray(n.imageUrls)) {
                    n.imageUrls = n.imageUrls.map((u) =>
                      getPreferredAssetUri('content', u, saveDir, [saveDirTemp, saveDir])
                    );
                  }
                  if (Array.isArray(n.attributes)) n.attributes.forEach(replace);
                }
                if (Array.isArray(data)) data.forEach(replace);
                else replace(data);
                break;
              }
              case 'news': {
                const assetStartIndex = failFiles.length;
                const newsList = Array.isArray(data) ? data : [];
                const imgs = newsList.map(i => i.img).filter(Boolean);
                const unique = Array.from(new Set(imgs));
                await downloadAssets(unique, path.join(saveDirTemp, 'news'), browserWindow, 'news', failFiles);
                assertModuleAssetsDownloaded(key, failFiles, assetStartIndex, ['news']);
                data = newsList.map(i => ({
                  ...i,
                  img: i.img ? getPreferredAssetUri('news', i.img, saveDir, [saveDirTemp, saveDir]) : null
                }));
                break;
              }
              case 'ads': {
                const assetStartIndex = failFiles.length;
                const adsList = Array.isArray(data) ? data : [];
                const urls = adsList
                  .flatMap(ad => [ad.image, ad.specialImage])
                  .filter(Boolean);
                const unique = Array.from(new Set(urls));
                await downloadAssets(unique, path.join(saveDirTemp, 'ads'), browserWindow, 'ads', failFiles);
                assertModuleAssetsDownloaded(key, failFiles, assetStartIndex, ['ads']);
                data = adsList.map(ad => ({
                  ...ad,
                  image: ad.image ? getPreferredAssetUri('ads', ad.image, saveDir, [saveDirTemp, saveDir]) : null,
                  specialImage: ad.specialImage
                    ? getPreferredAssetUri('ads', ad.specialImage, saveDir, [saveDirTemp, saveDir])
                    : null,
                }));
                break;
              }
              case 'videos': {
                const assetStartIndex = failFiles.length;
                const videoList = Array.isArray(data) ? data : [];
                const urls = videoList
                  .map(v => v.publicLink).filter(Boolean);
                const unique = Array.from(new Set(urls));
                await downloadAssets(unique, path.join(saveDirTemp, 'videos'), browserWindow, 'videos', failFiles);
                assertModuleAssetsDownloaded(key, failFiles, assetStartIndex, ['videos']);
                data = videoList.map(v => {
                  const localUri = v.publicLink
                    ? getPreferredAssetUri('videos', v.publicLink, saveDir, [saveDirTemp, saveDir])
                    : null;
                  return {
                    ...v,
                    publicLink: localUri || v.publicLink,
                    videoUrl: localUri,
                  };
                });
                break;
              }
              default:
                break;
            }
            assignFn(data);
            reportDone(key, null);
          } catch (procErr) {
            console.error(`[downloadVenueData] [${key}] processing failed:`, procErr);
            reportDone(key, procErr);
          }
        });
      }

      Object.entries(endpoints).forEach(([key, url]) =>
        track(key, url, data => {
          if (key === 'basicInfo') finalData.basicInfo = data;
          else if (key === 'contentTree') finalData.contentTree = data;
          else if (key === 'ads') finalData.ads = data;
          else if (key === 'videos') finalData.videos = data;
          else finalData.liveInfo[key] = data;
        })
      );
    });
  } catch (err) {
    console.error('[downloadVenueData] Top-level error:', err);
    if (browserWindow && !browserWindow.isDestroyed()) {
      browserWindow.close();
    }
    throw err;
  }
}

module.exports = downloadVenueData;
