// utils/downloadVenueData.js

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
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
  // 如：C:\Users\xxx\AppData\Roaming\你的APP\venueData
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

  const lastSlash = cleaned.lastIndexOf('/');
  const filename = lastSlash >= 0 ? cleaned.slice(lastSlash + 1) : cleaned;
  const absPath = path.join(saveDir, folder, filename);
  const normalized = path.normalize(absPath);

  try {
    return pathToFileURL(normalized).href;
  } catch (err) {
    console.warn('[downloadVenueData] Failed to convert to file URL:', normalized, err.message);
    return normalized;
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
 * 确保某个目录存在（如已有同名文件会先删除）
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
 * 下载一批资源（图片/视频），并实时推送每个文件的进度
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

    const lastSlash = cleaned.lastIndexOf('/');
    const filename = lastSlash >= 0 ? cleaned.slice(lastSlash + 1) : cleaned;
    const savePath = path.join(baseDir, filename);

    // 【下载开始前】推送事件
    if (browserWindow && !browserWindow.isDestroyed()) {
      browserWindow.webContents.send('download-file-start', { module: moduleName, filename });
    }

    // 已存在则跳过
    if (fs.existsSync(savePath) && fs.statSync(savePath).size > 0) {
      console.log(`[downloadVenueData] Already exists, skipped: ${filename}`);
      if (browserWindow && !browserWindow.isDestroyed()) {
        browserWindow.webContents.send('download-file', { module: moduleName, filename });
      }
      resolve();
      return;
    }

    console.log(`[downloadVenueData] Downloading: ${cleaned}`);
    downloadFile(cleaned, savePath)
      .then(() => {
        console.log(`[downloadVenueData] Downloaded: ${filename}`);
        if (browserWindow && !browserWindow.isDestroyed()) {
          browserWindow.webContents.send('download-file', { module: moduleName, filename });
        }
        resolve();
      })
      .catch(err => {
        console.warn(`[downloadVenueData] Failed to download: ${cleaned}`, err.message);
        if (browserWindow && !browserWindow.isDestroyed()) {
          browserWindow.webContents.send('download-file-fail', { module: moduleName, filename });
        }
        failList && failList.push({ module: moduleName, filename, url: cleaned, err: err.message });
        resolve();
      });
  }));

  return Promise.all(tasks);
}

/**
 * 离线数据下载主流程（全流程带注释，推送实时进度）
 */
async function downloadVenueData(venueId, baseUrl, browserWindow = null) {
  try {
    // 统一存放目录
    const ROOT_DOWNLOADS = getRootDownloadsDir();

    // 各模块 API
    const endpoints = {
      basicInfo: `${baseUrl}/ts/${venueId}/basic-info`,
      contentTree: `${baseUrl}/ts/${venueId}/ts-content-tree`,
      ads: `${baseUrl}/ts/${venueId}/ads`,
      videos: `${baseUrl}/ts/${venueId}/videos`,
      flights: `${baseUrl}/ts/${venueId}/live-info/flights`,
      news: `${baseUrl}/ts/${venueId}/live-info/news`,
      weather: `${baseUrl}/ts/${venueId}/live-info/weather`,
      tides: `${baseUrl}/ts/${venueId}/live-info/tides`,
    };

    const saveDir = path.join(ROOT_DOWNLOADS, venueId);
    const saveDirTemp = path.join(ROOT_DOWNLOADS, venueId + '_temp');

    if (fs.existsSync(saveDirTemp)) fs.rmSync(saveDirTemp, { recursive: true });
    ensureDir(saveDirTemp);
    ensureDir(saveDir);

    // 把旧文件复制到临时目录，后续只下载新增的文件，避免重复下载
    if (fs.existsSync(saveDir)) {
      try {
        fs.cpSync(saveDir, saveDirTemp, { recursive: true });
        console.log('[downloadVenueData] Seeded temp from existing files');
      } catch (e) {
        console.warn('[downloadVenueData] Could not seed temp dir:', e.message);
      }
    }

    const savePath = path.join(saveDirTemp, 'data.json');

    // 用于保存最终 json 数据
    const finalData = {
      basicInfo: null,
      contentTree: null,
      ads: null,
      videos: null,
      liveInfo: {
        flights: null,
        news: null,
        weather: null,
        tides: null
      }
    };

    // 统计失败资源
    const failFiles = [];

    let completed = 0;
    const total = Object.keys(endpoints).length;
    let hasError = false;

    return await new Promise((resolve) => {
      const finalize = () => {
        let success = !hasError;

        if (success && failFiles.length > 0) {
          success = false;
          console.warn(
            `[downloadVenueData] ${failFiles.length} asset(s) failed to download. Keeping existing bundle instead of swapping partial data.`
          );
        }

        if (success) {
          try {
            fs.writeFileSync(savePath, JSON.stringify(finalData, null, 2), 'utf-8');

            // 用临时目录替换正式目录
            if (fs.existsSync(saveDir)) fs.rmSync(saveDir, { recursive: true });
            fs.renameSync(saveDirTemp, saveDir);
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
          }
        }

        if (!success) {
          console.warn('[downloadVenueData] Download failed, keeping existing data.');
          try { if (fs.existsSync(saveDirTemp)) fs.rmSync(saveDirTemp, { recursive: true }); } catch {}
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

      /**
       * 每完成一个模块，推送状态
       */
      function reportDone(key, err) {
        completed++;
        if (err) {
          hasError = true;
        }
        console.log(`[downloadVenueData] Module "${key}" ${err ? 'failed' : 'done'} (${completed}/${total})`);
        if (browserWindow && !browserWindow.isDestroyed()) {
          browserWindow.webContents.send('download-status', key, err ? 'fail' : 'done');
        }
        if (completed === total) {
          finalize();
        }
      }

      /**
       * 各模块实际下载和数据处理
       */
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
                const slides = Array.isArray(data.landing?.venueSlides) ? data.landing.venueSlides : [];
                const logo = data.landing?.venueLogo ? [data.landing.venueLogo] : [];
                await downloadAssets(slides, path.join(saveDirTemp, 'slides'), browserWindow, 'slides', failFiles);
                await downloadAssets(logo, path.join(saveDirTemp, 'logo'), browserWindow, 'logo', failFiles);

                data.landing.venueSlides = slides.map(u => fileUri('slides', u, saveDir));
                data.landing.venueLogo = logo.length ? fileUri('logo', logo[0], saveDir) : null;
                break;
              }
              case 'contentTree': {
                const allUrls = new Set();
                function collect(n) {
                  if (n.bannerImage) allUrls.add(n.bannerImage);
                  if (n.mapUrl) allUrls.add(n.mapUrl);
                  if (Array.isArray(n.imageUrls)) n.imageUrls.forEach(u => allUrls.add(u));
                  if (Array.isArray(n.attributes)) n.attributes.forEach(collect);
                }
                if (Array.isArray(data)) data.forEach(collect);
                else collect(data);
                await downloadAssets([...allUrls], path.join(saveDirTemp, 'content'), browserWindow, 'content', failFiles);

                function replace(n) {
                  if (n.bannerImage) n.bannerImage = fileUri('content', n.bannerImage, saveDir);
                  if (n.mapUrl) n.mapUrl = fileUri('content', n.mapUrl, saveDir);
                  if (Array.isArray(n.imageUrls))
                    n.imageUrls = n.imageUrls.map(u => fileUri('content', u, saveDir));
                  if (Array.isArray(n.attributes)) n.attributes.forEach(replace);
                }
                if (Array.isArray(data)) data.forEach(replace);
                else replace(data);
                break;
              }
              case 'news': {
                const imgs = (Array.isArray(data) ? data : []).map(i => i.img).filter(Boolean);
                const unique = Array.from(new Set(imgs));
                await downloadAssets(unique, path.join(saveDirTemp, 'news'), browserWindow, 'news', failFiles);
                data = data.map(i => ({
                  ...i,
                  img: i.img ? fileUri('news', i.img, saveDir) : null
                }));
                break;
              }
              case 'ads': {
                const adsList = Array.isArray(data) ? data : [];
                const urls = adsList
                  .flatMap(ad => [ad.image, ad.specialImage])
                  .filter(Boolean);
                const unique = Array.from(new Set(urls));
                await downloadAssets(unique, path.join(saveDirTemp, 'ads'), browserWindow, 'ads', failFiles);
                data = adsList.map(ad => ({
                  ...ad,
                  image: ad.image ? fileUri('ads', ad.image, saveDir) : null,
                  specialImage: ad.specialImage ? fileUri('ads', ad.specialImage, saveDir) : null,
                }));
                break;
              }
              case 'videos': {
                const urls = (Array.isArray(data) ? data : [])
                  .map(v => v.publicLink).filter(Boolean);
                const unique = Array.from(new Set(urls));
                await downloadAssets(unique, path.join(saveDirTemp, 'videos'), browserWindow, 'videos', failFiles);
                data = data.map(v => {
                  const localUri = v.publicLink ? fileUri('videos', v.publicLink, saveDir) : null;
                  return {
                    ...v,
                    publicLink: localUri || v.publicLink,
                    videoUrl: localUri,
                  };
                });
                break;
              }
              default:
                // liveInfo 模块（flights, weather, tides）无需额外下载
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

      // 启动所有模块的下载
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
