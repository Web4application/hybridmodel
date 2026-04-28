const { app, ipcMain, BrowserWindow, Menu, Tray, nativeImage } = require("electron")
const fs = require("fs")
const path = require("path")
const EventEmitter = require("events")

/* =========================================================
   🧠 MEMORY BRAIN (EVENT + KV + VECTOR-READY)
========================================================= */

const memoryPath = path.join(app.getPath("userData"), "web4_memory.json")

let memory = fs.existsSync(memoryPath)
  ? JSON.parse(fs.readFileSync(memoryPath))
  : { events: [], insights: [], kv: {} }

function saveMemory() {
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2))
}

function logEvent(e) {
  memory.events.push({ t: Date.now(), ...e })
  saveMemory()
}

/* =========================================================
   📡 EVENT BUS (SWARM COMMUNICATION LAYER)
========================================================= */

const bus = new EventEmitter()

/* =========================================================
   🧠 LLM ROUTER (INTENT ENGINE)
========================================================= */

async function llmThink(task) {
  return {
    intent: task.includes("code") ? "coder"
          : task.includes("plan") ? "planner"
          : "analyst",
    confidence: Math.random()
  }
}

/* =========================================================
   🤖 AGENT SWARM CORE
========================================================= */

const agents = {}

function mkAgent(id, role, fn) {
  return {
    id,
    role,
    status: "idle",

    async run(task, ctx = {}) {
      setStatus(id, "busy")

      const result = await fn(task, ctx)

      const critique = await agents.critic.run({
        task,
        result
      })

      if (critique.score < 0.5) {
        memory.insights.push({
          type: "weak_output",
          agent: id,
          task,
          result
        })
      }

      setStatus(id, critique.score > 0.5 ? "idle" : "needs_fix")

      bus.emit("agent:done", { id, result, critique })
      logEvent({ type: "agent_done", id, result, critique })

      return { result, critique }
    }
  }
}

function setStatus(id, status) {
  agents[id].status = status
  bus.emit("agent:status", { id, status })
}

/* =========================================================
   🤖 CORE AGENTS
========================================================= */

agents.planner = mkAgent("planner", "Planner", async (task) => ({
  plan: `Breakdown: ${task}`
}))

agents.coder = mkAgent("coder", "Coder", async (task) => ({
  code: `// generated: ${task}`
}))

agents.analyst = mkAgent("analyst", "Analyst", async (task) => ({
  insight: `analysis: ${task}`
}))

agents.critic = mkAgent("critic", "Critic", async ({ result }) => ({
  score: Math.random(),
  feedback: "evaluated"
}))

/* =========================================================
   🧭 ORCHESTRATION LAYER (LLM + PIPELINE)
========================================================= */

async function route(task) {
  const decision = await llmThink(task)

  const agent =
    decision.intent === "coder" ? agents.coder :
    decision.intent === "planner" ? agents.planner :
    agents.analyst

  return agent.run(task)
}

async function pipeline(task) {
  const plan = await agents.planner.run(task)
  const exec = await agents.coder.run(task)
  const analysis = await agents.analyst.run(task)
  const critique = await agents.critic.run({ task, result: analysis })

  return { plan, exec, analysis, critique }
}

/* =========================================================
   🌐 DISTRIBUTED SWARM LAYER
========================================================= */

const nodes = ["localhost:3001", "localhost:3002"]

async function remoteCall(node, payload) {
  try {
    const res = await fetch(`http://${node}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    return await res.json()
  } catch {
    return { error: "node offline" }
  }
}

async function distributedRoute(task) {
  const node = nodes[Math.floor(Math.random() * nodes.length)]
  return remoteCall(node, { task })
}

/* =========================================================
   🖥️ ELECTRON CORE (WEB4 OS SHELL)
========================================================= */

let mainWindow
let tray = null

function createWindow () {
  app.setName("Web4 AI OS")

  const iconPath = path.join(__dirname, "web4logo_rainbow.png")

  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    title: "Web4 AI Control Hub",
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadURL("file://" + __dirname + "/index.html")
  mainWindow.webContents.openDevTools()

  /* =========================================================
     🧬 TRAY = CONTROL SURFACE (AI COCKPIT)
  ========================================================= */

  const icon = nativeImage.createFromPath(iconPath).resize({
    width: 16,
    height: 16
  })

  tray = new Tray(icon)

  let activeAgent = "planner"

  function buildMenu() {
    return Menu.buildFromTemplate([
      {
        label: "🤖 Agents",
        submenu: Object.values(agents).map(a => ({
          label: `${a.role} (${a.status})`,
          type: "radio",
          checked: activeAgent === a.id,
          click: () => activeAgent = a.id
        }))
      },

      { type: "separator" },

      {
        label: "⚡ Run Agent",
        click: async () => {
          const res = await agents[activeAgent].run("build system module")
          mainWindow.webContents.send("result", res)
        }
      },

      {
        label: "🧠 LLM Route",
        click: async () => {
          const res = await route("code backend API")
          mainWindow.webContents.send("result", res)
        }
      },

      {
        label: "🔁 Pipeline Mode",
        click: async () => {
          const res = await pipeline("build authentication system")
          mainWindow.webContents.send("result", res)
        }
      },

      {
        label: "🌐 Distributed Run",
        click: async () => {
          const res = await distributedRoute("generate scalable backend")
          mainWindow.webContents.send("result", res)
        }
      },

      {
        label: "🧠 Memory Snapshot",
        click: () => {
          console.log(memory.events.slice(-10))
        }
      },

      { type: "separator" },

      {
        label: "🪟 Toggle Window",
        click: () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
      },

      {
        label: "❌ Quit",
        click: () => app.quit()
      }
    ])
  }

  function refresh() {
    tray.setContextMenu(buildMenu())
  }

  tray.setToolTip("Web4 AI OS")
  refresh()

  tray.on("click", () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

/* =========================================================
   ⚙️ LIFECYCLE
========================================================= */

app.on("ready", createWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (!mainWindow) createWindow()
})

/* =========================================================
   📡 IPC BRIDGE
========================================================= */

ipcMain.on("saveAppData", () => {
  try {
    fs.writeFileSync(
      path.join(app.getPath("appData"), "Web4", "testFile"),
      "test"
    )
  } catch (e) {
    mainWindow.webContents.executeJavaScript(
      `console.log("error:", \`${e}\`)`
    )
  }
})
