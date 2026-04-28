"use client"

import { useEffect, useState } from "react"
import { WRPNode, web4Block, EventBus } from "@/lib/wrp"

export default function DashboardPage() {
  const [state, setState] = useState<any>(null)

  useEffect(() => {
    const bus = new EventBus()
    const node = new WRPNode(web4Block, bus)

    node.on("action_executed", () => {
      setState({ ...node.getState() })
    })

    node.on("ai_response", (res) => {
      console.log("AI Insight:", res)
    })

    node.startLifecycle()

    // optional manual trigger
    node.dispatch("generateInsight", {
      query: "Summarize dashboard performance",
    })

  }, [])

  if (!state) return <div>Loading...</div>

  return (
    <div style={{ padding: 20 }}>
      <h1>Web4 Dashboard</h1>

      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  )
}
