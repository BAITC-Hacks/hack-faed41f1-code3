import { NextResponse } from "next/server"
import { getEmployee, getEmployeeActivityHistory } from "@/lib/server/data-store"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!getEmployee(id)) {
    return NextResponse.json({ message: "Сотрудник не найден" }, { status: 404 })
  }

  return NextResponse.json(getEmployeeActivityHistory(id))
}
