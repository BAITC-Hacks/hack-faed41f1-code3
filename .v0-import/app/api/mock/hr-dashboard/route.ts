import { NextResponse } from "next/server"
import { buildHrDashboard } from "@/lib/hr-aggregation"
import { getActivityHistory, getEmployees } from "@/lib/server/data-store"

export async function GET() {
  return NextResponse.json(buildHrDashboard(getEmployees(), getActivityHistory()))
}
