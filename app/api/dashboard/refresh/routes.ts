import { NextResponse } from "next/server"

export async function POST() {
  // fake data source (replace with DB, chain, analytics, etc.)
  const data = [
    { id: 1, metric: "users", value: Math.floor(Math.random() * 1000) },
    { id: 2, metric: "revenue", value: Math.floor(Math.random() * 5000) },
  ]

  return NextResponse.json({
    data,
  })
}
