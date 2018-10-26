'use strict';

const electron = require('electron');

const { app, BrowserWindow } = require('electron');

let okHTML = `
<h1>Hello World!</h1>
<p>Feel free to use this free trial.</p>
`;

let noHTML = `
<h1>Hello World!</h1>
<p>This app is expired.</p>
`;

let mainWindow;

function createWindow() {

  mainWindow = new BrowserWindow({ width: 800, height: 600 });

  mainWindow.loadFile('index.html');

  setTimeout(function () {
    if (Date.now() > 1234567891000) {

      mainWindow.webContents.send('set-html', noHTML);
    } else {
      mainWindow.webContents.send('set-html', okHTML);
    }
  }, 1000);

  mainWindow.on('close', _ => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', _ => {

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', _ => {

  if (mainWindow === null) {
    createWindow();
  }
});

exports.app = app;
exports.mainWindow = mainWindow;