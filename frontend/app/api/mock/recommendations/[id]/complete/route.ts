import { NextResponse } from "next/server"
import { completeRecommendation, getEmployee } from "@/lib/server/data-store"
import type { ActivityHistoryEntry } from "@/lib/types"

interface CompleteRequestBody {
  employeeId: string
  activityId: string
  activityName: string
  format: ActivityHistoryEntry["format"]
  durationHours: number
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await request.json()) as CompleteRequestBody

  const employee = getEmployee(body.employeeId)
  if (!employee) {
    return NextResponse.json({ message: "Сотрудник не найден" }, { status: 404 })
  }

  const entry: ActivityHistoryEntry = {
    id: `hist-${id}`,
    employeeId: body.employeeId,
    activityId: body.activityId,
    activityName: body.activityName,
    date: new Date().toISOString().slice(0, 10),
    status: "completed",
    format: body.format,
    durationHours: body.durationHours,
  }

  completeRecommendation(id, entry)

  return NextResponse.json({ success: true })
}
