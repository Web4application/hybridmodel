const { app, ipcMain, BrowserWindow, Menu, Tray } = require("electron");
const fs = require("fs");
const path = require("path");

let mainWindow;
let tray = null;

function createWindow() {
  if (process.platform === "linux" && process.env.APPDIR != null) {
    tray = new Tray(path.join(process.env.APPDIR, "web4_rainbow.png"));
    const contextMenu = Menu.buildFromTemplate([
      { label: "Item1", type: "radio" },
      { label: "Item2", type: "radio" },
      { label: "Item3", type: "radio", checked: true },
      { label: "Item4", type: "radio" }
    ]);
    tray.setToolTip("This is my application.");
    tray.setContextMenu(contextMenu);
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    frame: false,          // no system title bar
    transparent: true,     // transparent edges
    resizable: true,
    webPreferences: {
      nodeIntegration: true,    // allow renderer to use require
      contextIsolation: false   // required for ipcRenderer
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// Save example
ipcMain.on("saveAppData", () => {
  try {
    fs.writeFileSync(
      path.join(app.getPath("appData"), "Web4App", "testFile"),
      "test"
    );
  } catch (e) {
    if (mainWindow) {
      mainWindow.executeJavaScript(
        `console.log("userData error: ${e}")`
      );
    }
  }
});
