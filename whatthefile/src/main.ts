import { app, BrowserWindow, session } from "electron";
import { ipcIndexPaths, ipcSelectPaths } from "./ipcs/main";
import { registerIpc } from "./ipcs";
import path from "path";
import { readdir, stat } from "fs/promises";

async function indexPaths(path: string[]): Promise<string[]> {
  return (await Promise.all(path.map((p) => indexPath(p)))).flat();
}

async function indexPath(
  nameOrPath: string,
  parentPath = "",
  ignoreHidden = true,
): Promise<string[]> {
  try {
    if (ignoreHidden && path.basename(nameOrPath).startsWith(".")) {
      return [];
    }
    const fullPath = path.join(parentPath, nameOrPath);
    const stats = await stat(fullPath);
    if (stats.isFile()) {
      return [fullPath];
    }
    if (stats.isDirectory()) {
      const files = await readdir(fullPath);
      return indexPaths(files.map((f) => path.join(fullPath, f)));
    }
    return [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  registerIpc(ipcSelectPaths);
  registerIpc(ipcIndexPaths);

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": ["script-src 'self'"],
      },
    });
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
