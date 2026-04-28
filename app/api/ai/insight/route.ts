import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()

  // mock AI (swap with real OpenAI call later)
  const insight = `Insight: Based on "${body?.input?.query}", your metrics are trending upward.`

  return NextResponse.json({
    insight,
  })
}
