import { NextResponse } from "next/server"
import { buildRecommendationsForEmployee } from "@/lib/activities-catalog"
import { getEmployee, isRecommendationCompleted } from "@/lib/server/data-store"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const employee = getEmployee(id)

  if (!employee) {
    return NextResponse.json({ message: "Сотрудник не найден" }, { status: 404 })
  }

  const recommendations = buildRecommendationsForEmployee(employee).filter(
    (recommendation) => !isRecommendationCompleted(recommendation.id),
  )

  return NextResponse.json(recommendations)
}
