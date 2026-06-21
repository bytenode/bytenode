"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// This is exposing 'encodeMessage' to renderer process,
// it can be called in renderer process by `window.encodeMessage`
contextBridge.exposeInMainWorld("encodeMessage", (...args) =>
  ipcRenderer.invoke("encode-message", ...args)
);
