
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * 下载远程文件并保存到本地
 * @param {string} fileUrl - 要下载的远程文件地址（支持 http/https）
 * @param {string} savePath - 本地保存路径（包含文件名）
 * @returns {Promise<void>}
 */
function downloadFile(fileUrl, savePath) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(fileUrl); // 解析 URL
    const protocol = urlObj.protocol === 'https:' ? https : http; // 判断协议使用 https 或 http

    fs.mkdirSync(path.dirname(savePath), { recursive: true }); // 自动创建目标目录（如果不存在）

    const file = fs.createWriteStream(savePath); // 创建写入流准备写入文件
    protocol.get(fileUrl, (res) => {
      // 判断 HTTP 状态码是否为 200
      if (res.statusCode !== 200) {
        file.destroy();
        fs.unlink(savePath, () => {}); // 删除空文件，避免下次被跳过
        reject(new Error(`Download failed: ${res.statusCode}`));
        return;
      }

      res.pipe(file); // 将下载的内容导入文件流
      file.on('finish', () => {
        file.close(); // 下载完成后关闭文件
        resolve();    // 成功回调
      });
    }).on('error', (err) => {
      // 如果下载出错，删除已写入的临时文件
      fs.unlink(savePath, () => reject(err));
    });
  });
}

module.exports = downloadFile;
