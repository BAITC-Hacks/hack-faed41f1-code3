import fs from "node:fs"
import path from "node:path"
import employeesJson from "@/data/employees.json"
import type { ActivityFormat, ActivityHistoryEntry, ActivityStatus, Employee } from "@/lib/types"

// Server-only data access. This module reads the seed files (employees.json,
// activity_history.csv) and holds the in-memory mutations created during a
// server session (e.g. completing a recommendation). It must only be
// imported from Route Handlers, never from client components.

const employees = employeesJson as Employee[]

let activityHistory: ActivityHistoryEntry[] | null = null
const completedRecommendationIds = new Set<string>()

function parseCsv(content: string): ActivityHistoryEntry[] {
  const [headerLine, ...rows] = content.trim().split("\n")
  const columns = headerLine.split(",").map((c) => c.trim())

  return rows
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      const values = line.split(",").map((v) => v.trim())
      const record = Object.fromEntries(columns.map((col, i) => [col, values[i] ?? ""]))

      return {
        id: `hist-${index + 1}`,
        employeeId: record.employee_id,
        activityId: record.activity_id,
        activityName: record.activity_name,
        date: record.date,
        status: record.status as ActivityStatus,
        format: record.format as ActivityFormat,
        durationHours: Number(record.duration_hours) || 0,
      }
    })
}

function loadActivityHistory(): ActivityHistoryEntry[] {
  if (!activityHistory) {
    const filePath = path.join(process.cwd(), "data", "activity_history.csv")
    const content = fs.readFileSync(filePath, "utf-8")
    activityHistory = parseCsv(content)
  }
  return activityHistory
}

export function getEmployees(): Employee[] {
  return employees
}

export function getEmployee(id: string): Employee | undefined {
  return employees.find((employee) => employee.id === id)
}

export function getActivityHistory(): ActivityHistoryEntry[] {
  return loadActivityHistory()
}

export function getEmployeeActivityHistory(employeeId: string): ActivityHistoryEntry[] {
  return loadActivityHistory()
    .filter((entry) => entry.employeeId === employeeId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function isRecommendationCompleted(recommendationId: string): boolean {
  return completedRecommendationIds.has(recommendationId)
}

export function completeRecommendation(recommendationId: string, entry: ActivityHistoryEntry): void {
  completedRecommendationIds.add(recommendationId)
  activityHistory = [...loadActivityHistory(), entry]
}
