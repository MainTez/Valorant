const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nexusDesktop", {
  isElectron: true,
  showMoment(moment) {
    ipcRenderer.send("desktop:show-moment", moment);
  },
  onOverlayMoment(callback) {
    const handler = (_event, moment) => callback(moment);
    ipcRenderer.on("overlay:moment", handler);
    return () => ipcRenderer.removeListener("overlay:moment", handler);
  },
});
