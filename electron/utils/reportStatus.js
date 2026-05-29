// electron/utils/reportStatus.js
const https = require('https');

function reportStatus(venueId, baseUrl, whenISO) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/ts/${encodeURIComponent(venueId)}/update-statuslog`, baseUrl);
    const payload = JSON.stringify({
      lastUpdated: whenISO || new Date().toISOString(),
    });

    const options = {
      method: 'PATCH',
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search, // 关键：带上 search
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    console.log('[reportStatus] URL =', url.toString());
    console.log('[reportStatus] payload =', payload);

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        console.log('[reportStatus] status =', res.statusCode, 'body =', body || '(empty)');
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve(true);
        return reject(new Error(`HTTP ${res.statusCode}: ${body || 'No body'}`));
      });
    });

    req.on('error', (e) => {
      console.error('[reportStatus] network error:', e);
      reject(e);
    });

    req.write(payload);
    req.end();
  });
}

module.exports = reportStatus;
