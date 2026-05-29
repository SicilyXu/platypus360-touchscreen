const { BrowserWindow } = require('electron');

let downloadWin = null;

function createDownloadWindow() {
  downloadWin = new BrowserWindow({
    width: 400,
    height: 500,
    title: 'Downloading Data',
    webPreferences: {
      nodeIntegration: true,
    },
  });

  downloadWin.loadFile(path.join(__dirname, '../ui/download-progress.html'));
}
