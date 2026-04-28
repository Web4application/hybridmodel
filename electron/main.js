const { app, BrowserWindow, Menu, Tray, nativeImage } = require("electron")
const path = require("path")

let win, tray

function create() {
  const icon = path.join(__dirname, "web4logo.png")

  win = new BrowserWindow({
    width: 1000,
    height: 750,
    title: "Web4 AI OS",
    icon,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadURL("file://" + __dirname + "/index.html")

  const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Run Agent", click: () => win.webContents.send("agent") },
    { label: "Run Pipeline", click: () => win.webContents.send("pipeline") },
    { label: "Distributed Run", click: () => win.webContents.send("distributed") },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() }
  ]))
}

app.whenReady().then(create)
