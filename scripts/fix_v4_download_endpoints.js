const fs = require('fs');

const filePath = 'D:/Codes/Touchscreen-Frontend-V4-main/Touchscreen-Frontend-V4/touchscreen-desktop/electron/utils/downloadVenueData.js';
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `const endpoints = {
      basicInfo: \`\${baseUrl}/ts/\${venueId}/basic-info\`,
      contentTree: \`\${baseUrl}/ts/\${venueId}/ts-content-tree\`,
      ads: \`\${baseUrl}/ts/\${venueId}/ads\`,
      videos: \`\${baseUrl}/ts/\${venueId}/videos\`,
      flights: \`\${baseUrl}/ts/\${venueId}/live-info/flights\`,
      news: \`\${baseUrl}/ts/\${venueId}/live-info/news\`,
      weather: \`\${baseUrl}/ts/\${venueId}/live-info/weather\`,
      tides: \`\${baseUrl}/ts/\${venueId}/live-info/tides\`,
      vline: \`\${baseUrl}/ts/\${venueId}/live-info/vline\`,
    };`;

content = content.replace(/const endpoints = \{[\s\S]*?\n\s*\};/, replacement);

fs.writeFileSync(filePath, content);
console.log('fixed endpoints block');
