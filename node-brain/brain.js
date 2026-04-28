const EventEmitter = require("events")
const bus = new EventEmitter()

const memory = {
  events: [],
  failures: []
}

/* =========================
   🧠 LLM ROUTER (INTENT)
========================= */

function route(task) {
  if (task.includes("code")) return "coder"
  if (task.includes("plan")) return "planner"
  return "analyst"
}

/* =========================
   🤖 AGENTS (SWARM LOGIC)
========================= */

const agents = {
  planner: (t) => `PLAN: ${t}`,
  coder: (t) => `CODE: ${t}`,
  analyst: (t) => `ANALYZE: ${t}`,
  critic: () => Math.random()
}

/* =========================
   🔁 EXECUTION CORE
========================= */

async function run(task) {
  const type = route(task)
  const result = agents[type](task)

  const score = agents.critic(result)

  memory.events.push({ task, result, score })

  if (score < 0.5) {
    memory.failures.push(task)
  }

  return { type, result, score }
}

/* =========================
   📦 PIPELINE MODE
========================= */

async function pipeline(task) {
  return {
    plan: agents.planner(task),
    code: agents.coder(task),
    analysis: agents.analyst(task)
  }
}

/* =========================
   🌐 DISTRIBUTED SWARM CALL
========================= */

async function sendRust(task) {
  const res = await fetch("http://localhost:8080/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent: "coder", task })
  })

  return res.json()
}

/* =========================
   ⚡ AUTONOMOUS LOOP
========================= */

async function autonomous(task) {
  const first = await run(task)

  if (first.score < 0.5) {
    return sendRust(task)
  }

  return first
}

module.exports = { run, pipeline, autonomous, memory }
