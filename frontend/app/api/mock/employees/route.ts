import { NextResponse } from "next/server"
import { getEmployees } from "@/lib/server/data-store"

export async function GET() {
  return NextResponse.json(getEmployees())
}
