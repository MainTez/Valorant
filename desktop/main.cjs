const path = require("node:path");
const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, shell } = require("electron");
const packageMetadata = require("../package.json");

const LOCAL_APP_URL = "http://localhost:3000";
const PACKAGED_APP_URL = packageMetadata.nexus?.appUrl || "https://molgarians-premier-hub.vercel.app";
const appUrl = (
  process.env.NEXUS_APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (app.isPackaged ? PACKAGED_APP_URL : LOCAL_APP_URL)
)
  .replace(/\/$/, "");

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let overlayHideTimer = null;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

app.setAppUserModelId("gg.nexus.teamhub");

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    title: "Nexus Team Hub",
    backgroundColor: "#030407",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  void mainWindow.loadURL(`${appUrl}/desktop`);

  mainWindow.on("close", (event) => {
    if (app.isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
  });
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 500,
    height: 230,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    show: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setIgnoreMouseEvents(true);
  positionOverlayWindow();
  void overlayWindow.loadURL(`${appUrl}/desktop/overlay`);
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip("Nexus Team Hub");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open Nexus",
        click: () => showMainWindow(),
      },
      {
        label: "Open Web Dashboard",
        click: () => shell.openExternal(`${appUrl}/dashboard`),
      },
      { type: "separator" },
      {
        label: "Launch on startup",
        type: "checkbox",
        checked: app.getLoginItemSettings().openAtLogin,
        click: (menuItem) => {
          app.setLoginItemSettings({ openAtLogin: menuItem.checked });
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", () => showMainWindow());
}

function createTrayIcon() {
  return nativeImage.createFromDataURL(
    "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="#05070d"/>
          <path d="M7 22 16 5l9 17h-6l-3-6-3 6H7Z" fill="#f3bf4c"/>
          <path d="M10 25h12" stroke="#33b8ff" stroke-width="3" stroke-linecap="round"/>
        </svg>`,
      ),
  );
}

function showMainWindow() {
  if (!mainWindow) createMainWindow();
  mainWindow.show();
  mainWindow.focus();
}

function positionOverlayWindow() {
  if (!overlayWindow) return;
  const display = require("electron").screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const bounds = overlayWindow.getBounds();
  overlayWindow.setBounds({
    x: workArea.x + workArea.width - bounds.width - 24,
    y: workArea.y + 24,
    width: bounds.width,
    height: bounds.height,
  });
}

function showOverlayMoment(moment) {
  if (!overlayWindow) createOverlayWindow();
  positionOverlayWindow();
  overlayWindow.showInactive();
  overlayWindow.webContents.send("overlay:moment", moment);

  if (overlayHideTimer) clearTimeout(overlayHideTimer);
  overlayHideTimer = setTimeout(() => {
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
  }, 7400);
}

app.whenReady().then(() => {
  app.setLoginItemSettings({ openAtLogin: true });
  createMainWindow();
  createOverlayWindow();
  createTray();

  app.on("activate", () => showMainWindow());
});

app.on("second-instance", () => showMainWindow());

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

ipcMain.on("desktop:show-moment", (_event, moment) => {
  showOverlayMoment(moment);
});
