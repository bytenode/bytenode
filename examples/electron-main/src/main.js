'use strict';

const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const window = new BrowserWindow({ width: 640, height: 360 });
  window.loadURL('data:text/html,<h1>Bytenode compiled the Electron main process</h1>');
});
