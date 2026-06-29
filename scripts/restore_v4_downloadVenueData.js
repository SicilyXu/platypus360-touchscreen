const fs = require('fs');

const targetPath = 'D:/Codes/Touchscreen-Frontend-V4-main/Touchscreen-Frontend-V4/touchscreen-desktop/electron/utils/downloadVenueData.js';

const content = `// utils/downloadVenueData.js

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const urlMod = require('url');
const { pathToFileURL } = urlMod;
const downloadFile = require('./downloadFile');
const { BrowserWindow } = require('electron');

// 寮曞叆 Electron 涓昏繘绋?app
const { app } = require('electron');

/**
 * 鑾峰彇鐢ㄦ埛鏁版嵁鐩綍锛圧oaming锛変笅鐨?venueData 鏍圭洰褰?
 */
function getRootDownloadsDir() {
  // 濡傦細C:\\Users\\xxx\\AppData\\Roaming\\浣犵殑APP\\venueData
  return path.join(app.getPath('userData'), 'venueData');
}

console.log('[downloadVenueData] userData path:', app.getPath('userData'));

/**
 * 鐢熸垚 file:// 缁濆璺緞
 */
function fileUri(folder, fileUrl, saveDir) {
  if (!fileUrl) return null;
  const cleaned = String(fileUrl).trim();
  if (!cleaned) return null;

  const baseSegment = cleaned.split('?')[0];
  const parts = baseSegment.split('/');
  const filename = decodeURIComponent(parts[parts.length - 1]);
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
 * 涓嬭浇骞惰В鏋?JSON锛圙ET 璇锋眰锛?
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
          callback(new Error(\`[downloadVenueData] Failed to parse JSON from \${fullUrl}\`));
        }
      });
    })
    .on('error', err => callback(err));
}

/**
 * 纭繚鏌愪釜鐩綍瀛樺湪锛堝宸叉湁鍚屽悕鏂囦欢浼氬厛鍒犻櫎锛?
 */
function ensureDir(targetPath) {
  if (fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      console.warn(\`[downloadVenueData] \${targetPath} exists but is not a directory, deleting file...\`);
      fs.unlinkSync(targetPath);
      fs.mkdirSync(targetPath, { recursive: true });
    }
  } else {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

/**
 * 涓嬭浇涓€鎵硅祫婧愶紙鍥剧墖/瑙嗛锛夛紝骞跺疄鏃舵帹閫佹瘡涓枃浠剁殑杩涘害
 * @param {string[]} urls - 鏂囦欢鐨勫師濮?URL 鍒楄〃
 * @param {string} baseDir - 鏈湴淇濆瓨鐨勭洰褰?
 * @param {BrowserWindow} browserWindow - 鐢ㄤ簬鎺ㄩ€佽繘搴︾殑绐楀彛
 * @param {string} moduleName - 褰撳墠妯″潡鍚嶏紝濡?'ads'/'slides'
 * @param {object[]} failList - 澶辫触鐨勬枃浠惰褰曟暟缁?
 */
function downloadAssets(urls = [], baseDir, browserWindow, moduleName = '', failList = []) {
  ensureDir(baseDir);

  const tasks = urls.map((rawUrl, idx) => {
    let fileUrl = String(rawUrl).trim();
    fileUrl = fileUrl.replace(/^\\{+/, '').replace(/\\}+$/, '');

    if (!fileUrl || fileUrl.toLowerCase() === 'none' || !/^https?:\\/\\//.test(fileUrl)) {
      console.warn('[downloadVenueData] Invalid URL, skipped:', rawUrl);
      return Promise.resolve();
    }

    const filename = path.basename(fileUrl.split('?')[0]);
    const savePath = path.join(baseDir, filename);

    // 銆愪笅杞藉紑濮嬪墠銆戞帹閫佷簨浠?
    if (browserWindow && !browserWindow.isDestroyed()) {
      browserWindow.webContents.send('download-file-start', {
        module: moduleName,
        filename
      });
    }

    // 宸插瓨鍦ㄧ洿鎺ョ畻浣滃畬鎴?
    if (fs.existsSync(savePath)) {
      console.log(\`[downloadVenueData] Already exists, skipped: \${filename}\`);
      if (browserWindow && !browserWindow.isDestroyed()) {
        browserWindow.webContents.send('download-file', {
          module: moduleName,
          filename
        });
      }
      return Promise.resolve();
    }

    console.log(\`[downloadVenueData] Downloading: \${fileUrl}\`);
    return downloadFile(fileUrl, savePath)
      .then(() => {
        console.log(\`[downloadVenueData] Downloaded: \${filename}\`);
        if (browserWindow && !browserWindow.isDestroyed()) {
          browserWindow.webContents.send('download-file', {
            module: moduleName,
            filename
          });
        }
      })
      .catch(err => {
        console.warn(\`[downloadVenueData] Failed to download: \${fileUrl}\`, err.message);
        if (browserWindow && !browserWindow.isDestroyed()) {
          browserWindow.webContents.send('download-file-fail', {
            module: moduleName,
            filename
          });
        }
        failList && failList.push({ module: moduleName, filename, url: fileUrl, err: err.message });
      });
  });

  return Promise.all(tasks);
}

/**
 * 绂荤嚎鏁版嵁涓嬭浇涓绘祦绋嬶紙鍏ㄦ祦绋嬪甫娉ㄩ噴锛屾帹閫佸疄鏃惰繘搴︼級
 */
async function downloadVenueData(venueId, baseUrl, browserWindow = null) {
  try {
    // 缁熶竴瀛樻斁鐩綍
    const ROOT_DOWNLOADS = getRootDownloadsDir();

    // 鍚勬ā鍧?API
    const endpoints = {
      basicInfo: \`\${baseUrl}/ts/\${venueId}/basic-info\`,
      contentTree: \`\${baseUrl}/ts/\${venueId}/ts-content-tree\`,
      ads: \`\${baseUrl}/ts/\${venueId}/ads\`,
      videos: \`\${baseUrl}/ts/\${venueId}/videos\`,
      flights: \`\${baseUrl}/ts/\${venueId}/live-info/flights\`,
      news: \`\${baseUrl}/ts/\${venueId}/live-info/news\`,
      weather: \`\${baseUrl}/ts/\${venueId}/live-info/weather\`,
      tides: \`\${baseUrl}/ts/\${venueId}/live-info/tides\`,
      vline: \`\${baseUrl}/ts/\${venueId}/live-info/vline\`,
    };

    const saveDir = path.join(ROOT_DOWNLOADS, venueId);
    ensureDir(saveDir);

    const savePath = path.join(saveDir, 'data.json');

    // 鐢ㄤ簬淇濆瓨鏈€缁?json 鏁版嵁
    const finalData = {
      basicInfo: null,
      contentTree: null,
      ads: null,
      videos: null,
      liveInfo: {
        flights: null,
        news: null,
        weather: null,
        tides: null,
        vline: null
      }
    };

    // 缁熻澶辫触璧勬簮
    const failFiles = [];

    let completed = 0;
    const total = Object.keys(endpoints).length;
    let hasError = false;

    return await new Promise((resolve) => {
      const finalize = () => {
        let success = !hasError;

        if (success) {
          try {
            fs.writeFileSync(savePath, JSON.stringify(finalData, null, 2), 'utf-8');
            console.log(\`[downloadVenueData] Bundle saved to: \${savePath}\`);

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
          console.warn('[downloadVenueData] Skip writing data.json because download failed.');
        }

        const broadcastPayload = { success };
        BrowserWindow.getAllWindows().forEach(win => {
          if (!win.isDestroyed()) {
            win.webContents.send('download-finish', broadcastPayload);
          }
        });

        if (browserWindow && !browserWindow.isDestroyed()) {
          if (failFiles.length > 0) {
            const summary = {};
            failFiles.forEach(item => {
              if (!summary[item.module]) summary[item.module] = [];
              summary[item.module].push(item.filename || item.url || 'unknown');
            });
            browserWindow.webContents.send('download-summary', summary);
          }

          browserWindow.close();
        }

        resolve(success);
      };

      /**
       * 姣忓畬鎴愪竴涓ā鍧楋紝鎺ㄩ€佺姸鎬?
       */
      function reportDone(key, err) {
        completed++;
        if (err) {
          hasError = true;
        }
        console.log(\`[downloadVenueData] Module "\${key}" \${err ? 'failed' : 'done'} (\${completed}/\${total})\`);
        if (browserWindow && !browserWindow.isDestroyed()) {
          browserWindow.webContents.send('download-status', key, err ? 'fail' : 'done');
        }
        if (completed === total) {
          finalize();
        }
      }

      /**
       * 鍚勬ā鍧楀疄闄呬笅杞藉拰鏁版嵁澶勭悊
       */
      function track(key, fetchUrl, assignFn) {
        fetchJson(fetchUrl, async (err, data) => {
          if (err) {
            console.error(\`[downloadVenueData] [\${key}] fetch failed:\`, err.message);
            reportDone(key, err);
            return;
          }

          if (data == null) {
            const nullErr = new Error(\`[downloadVenueData] [\${key}] returned null/undefined\`);
            console.error(nullErr.message);
            reportDone(key, nullErr);
            return;
          }

          try {
            switch (key) {
              case 'basicInfo': {
                const slides = Array.isArray(data.landing?.venueSlides) ? data.landing.venueSlides : [];
                const logo = data.landing?.venueLogo ? [data.landing.venueLogo] : [];
                await downloadAssets(slides, path.join(saveDir, 'slides'), browserWindow, 'slides', failFiles);
                await downloadAssets(logo, path.join(saveDir, 'logo'), browserWindow, 'logo', failFiles);
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
                await downloadAssets([...allUrls], path.join(saveDir, 'content'), browserWindow, 'content', failFiles);

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
                await downloadAssets(unique, path.join(saveDir, 'news'), browserWindow, 'news', failFiles);
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
                await downloadAssets(unique, path.join(saveDir, 'ads'), browserWindow, 'ads', failFiles);
                data = adsList.map(ad => {
                  const imageUri = ad.image ? fileUri('ads', ad.image, saveDir) : null;
                  const specialImageUri = ad.specialImage ? fileUri('ads', ad.specialImage, saveDir) : null;
                  return {
                    ...ad,
                    originalImage: ad.image,
                    originalSpecialImage: ad.specialImage,
                    image: imageUri,
                    specialImage: specialImageUri,
                  };
                });
                break;
              }
              case 'videos': {
                const urls = (Array.isArray(data) ? data : [])
                  .map(v => v.publicLink).filter(Boolean);
                const unique = Array.from(new Set(urls));
                await downloadAssets(unique, path.join(saveDir, 'videos'), browserWindow, 'videos', failFiles);
                data = data.map(v => {
                  const localHref = v.publicLink ? fileUri('videos', v.publicLink, saveDir) : null;
                  return {
                    ...v,
                    originalPublicLink: v.publicLink,
                    publicLink: localHref || v.publicLink,
                    videoUrl: localHref,
                  };
                });
                break;
              }
              default:
                // liveInfo 妯″潡锛坒lights, weather, tides, vline锛夋棤闇€棰濆涓嬭浇
                break;
            }
            assignFn(data);
            reportDone(key, null);
          } catch (procErr) {
            console.error(\`[downloadVenueData] [\${key}] processing failed:\`, procErr);
            reportDone(key, procErr);
          }
        });
      }

      // 鍚姩鎵€鏈夋ā鍧楃殑涓嬭浇
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
`;

fs.writeFileSync(targetPath, content);
console.log('restored downloadVenueData.js');
