
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const TIMEOUT_MS = 30000;   // 30s 超时
const MAX_REDIRECTS = 5;    // 最多跟随 5 次重定向

/**
 * 下载远程文件并保存到本地，支持重定向和超时
 * @param {string} fileUrl - 要下载的远程文件地址（支持 http/https）
 * @param {string} savePath - 本地保存路径（包含文件名）
 * @returns {Promise<void>}
 */
function downloadFile(fileUrl, savePath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(fileUrl);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    fs.mkdirSync(path.dirname(savePath), { recursive: true });

    const file = fs.createWriteStream(savePath);

    const req = protocol.get(fileUrl, (res) => {
      // 跟随重定向 (301/302/303/307/308)
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        file.destroy();
        fs.unlink(savePath, () => {});
        const location = res.headers['location'];
        if (!location) {
          return reject(new Error(`Redirect with no Location header (${res.statusCode})`));
        }
        if (redirectCount >= MAX_REDIRECTS) {
          return reject(new Error(`Too many redirects (>${MAX_REDIRECTS})`));
        }
        // 解析相对路径重定向
        const nextUrl = new URL(location, fileUrl).href;
        return resolve(downloadFile(nextUrl, savePath, redirectCount + 1));
      }

      if (res.statusCode !== 200) {
        file.destroy();
        fs.unlink(savePath, () => {});
        return reject(new Error(`Download failed: HTTP ${res.statusCode} for ${fileUrl}`));
      }

      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', (err) => {
        fs.unlink(savePath, () => reject(err));
      });
    });

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      file.destroy();
      fs.unlink(savePath, () => {});
      reject(new Error(`Download timed out after ${TIMEOUT_MS / 1000}s: ${fileUrl}`));
    });

    req.on('error', (err) => {
      file.destroy();
      fs.unlink(savePath, () => reject(err));
    });
  });
}

module.exports = downloadFile;
