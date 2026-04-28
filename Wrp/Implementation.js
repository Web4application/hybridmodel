// wrp.ts
import { z } from "zod"

/* =========================
   1. PROTOCOL SPEC (WRP v1)
   ========================= */

export const ActionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  handler: z.string(),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("POST"),
  input: z.any().optional(),
  output: z.any().optional(),
  auth: z.enum(["public", "user", "admin"]).default("user"),
})

export const AISchema = z.object({
  capabilities: z.array(z.string()),
  provider: z.enum(["openai", "local", "custom"]),
  model: z.string(),
  endpoint: z.string(),
  temperature: z.number().min(0).max(2).optional(),
})

export const StateSchema = z.object({
  schema: z.any(),
  initial: z.any(),
  persistence: z.enum(["memory", "local", "remote"]).default("memory"),
})

export const LifecycleSchema = z.object({
  onMount: z.array(z.string()).optional(),
  onInterval: z.object({
    action: z.string(),
    ms: z.number().min(1000),
  }).optional(),
})

export const AgentSchema = z.object({
  autonomous: z.boolean().default(false),
  goals: z.array(z.string()),
  triggers: z.array(z.string()),
  policy: z.enum(["safe", "balanced", "aggressive"]).default("balanced"),
})

export const FileSchema = z.object({
  path: z.string(),
  type: z.enum([
    "registry:page",
    "registry:component",
    "registry:hook",
    "registry:lib",
  ]),
  target: z.string().optional(),
  integrity: z.string().optional(),
})

export const BlockSchema = z.object({
  protocol: z.literal("wrp@1.0.0"),

  name: z.string(),
  version: z.string(),

  title: z.string(),
  description: z.string(),

  author: z.object({
    name: z.string(),
    url: z.string().optional(),
  }),

  type: z.literal("registry:block"),

  registryDependencies: z.array(z.string()),
  dependencies: z.array(z.string()),

  files: z.array(FileSchema),
  categories: z.array(z.string()),

  ai: AISchema.optional(),
  state: StateSchema,
  actions: z.array(ActionSchema),

  lifecycle: LifecycleSchema.optional(),
  agent: AgentSchema.optional(),

  permissions: z.array(z.string()).optional(),
  events: z.array(z.string()).optional(),

  signature: z.string().optional(),
})

export type Block = z.infer<typeof BlockSchema>

/* =========================
   2. EVENT BUS
   ========================= */

type Handler = (payload: any) => void

export class EventBus {
  private listeners: Record<string, Handler[]> = {}

  on(event: string, handler: Handler) {
    this.listeners[event] = this.listeners[event] || []
    this.listeners[event].push(handler)
  }

  emit(event: string, payload: any) {
    ;(this.listeners[event] || []).forEach(h => h(payload))
  }
}

/* =========================
   3. RUNTIME ENGINE
   ========================= */

export class WRPNode {
  private state: any
  private bus: EventBus

  constructor(private block: Block, bus?: EventBus) {
    BlockSchema.parse(block)
    this.state = structuredClone(block.state.initial)
    this.bus = bus || new EventBus()
  }

  getState() {
    return this.state
  }

  async dispatch(actionName: string, payload?: any) {
    const action = this.block.actions.find(a => a.name === actionName)
    if (!action) throw new Error(`Action not found: ${actionName}`)

    const res = await fetch(action.handler, {
      method: action.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    })

    const data = await res.json()

    // basic reducer (can evolve into strategy-based reducers)
    this.state = {
      ...this.state,
      ...data,
      lastUpdated: new Date().toISOString(),
    }

    this.emit("action_executed", { action: actionName, data })
    return data
  }

  async runAI(input: any) {
    if (!this.block.ai) throw new Error("AI not configured")

    const res = await fetch(this.block.ai.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input,
        model: this.block.ai.model,
      }),
    })

    const data = await res.json()
    this.emit("ai_response", data)
    return data
  }

  startLifecycle() {
    const lc = this.block.lifecycle
    if (!lc) return

    if (lc.onMount) {
      lc.onMount.forEach(a => this.dispatch(a))
    }

    if (lc.onInterval) {
      setInterval(() => {
        this.dispatch(lc.onInterval!.action)
      }, lc.onInterval.ms)
    }
  }

  on(event: string, handler: Handler) {
    this.bus.on(event, handler)
  }

  emit(event: string, payload: any) {
    this.bus.emit(event, payload)
  }
}

/* =========================
   4. REGISTRY CLIENT
   ========================= */

export async function fetchBlock(name: string, version = "latest") {
  const res = await fetch(`https://registry.web4.dev/${name}@${version}`)
  const json = await res.json()
  return BlockSchema.parse(json)
}

/* =========================
   5. YOUR WEB4 BLOCK
   ========================= */

export const web4Block: Block = {
  protocol: "wrp@1.0.0",

  name: "web4",
  version: "1.0.0",

  title: "Dashboard",
  description: "Web4 intelligent interface.",

  author: {
    name: "Seriki Yakub",
    url: "https://ui.shadcn.com",
  },

  type: "registry:block",

  registryDependencies: ["input", "button", "card"],
  dependencies: ["zod"],

  files: [
    {
      path: "blocks/dashboard-01/page.tsx",
      type: "registry:page",
      target: "app/dashboard/page.tsx",
    },
    {
      path: "blocks/dashboard-01/components/hello-world.tsx",
      type: "registry:component",
    },
    {
      path: "blocks/dashboard-01/components/example-card.tsx",
      type: "registry:component",
    },
    {
      path: "blocks/dashboard-01/hooks/use-hello-world.ts",
      type: "registry:hook",
    },
    {
      path: "blocks/dashboard-01/lib/format-date.ts",
      type: "registry:lib",
    },
  ],

  categories: ["dashboard"],

  ai: {
    capabilities: ["predict", "summarize", "recommend"],
    provider: "openai",
    model: "gpt-4o-mini",
    endpoint: "/api/ai/insight",
  },

  state: {
    schema: z.object({
      data: z.array(z.any()),
      lastUpdated: z.string(),
    }),
    initial: {
      data: [],
      lastUpdated: new Date().toISOString(),
    },
    persistence: "memory",
  },

  actions: [
    {
      name: "refreshData",
      description: "Fetch latest dashboard data",
      handler: "/api/dashboard/refresh",
      method: "POST",
    },
    {
      name: "generateInsight",
      description: "Run AI analysis on current data",
      handler: "/api/ai/insight",
      method: "POST",
    },
  ],

  lifecycle: {
    onMount: ["refreshData"],
    onInterval: {
      action: "refreshData",
      ms: 60000,
    },
  },

  agent: {
    autonomous: true,
    goals: [
      "keep dashboard data fresh",
      "surface meaningful insights",
    ],
    triggers: ["data_change", "user_query"],
    policy: "balanced",
  },
}

/* =========================
   6. BOOTSTRAP EXAMPLE
   ========================= */

async function bootstrap() {
  const bus = new EventBus()
  const node = new WRPNode(web4Block, bus)

  node.on("action_executed", (e) => {
    console.log("Action:", e)
  })

  node.on("ai_response", (e) => {
    console.log("AI:", e)
  })

  node.startLifecycle()

  // manual trigger
  await node.dispatch("generateInsight", { query: "Summarize trends" })
}

// bootstrap()
