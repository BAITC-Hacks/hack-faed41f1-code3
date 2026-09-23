import { ApiError } from "@/lib/types"
import type { ActivityFormat, ActivityHistoryEntry, Employee, HRDashboardData, Recommendation } from "@/lib/types"

// Single entry point for every network call in the app.
//
// If NEXT_PUBLIC_API_URL is set, requests go straight to the real backend.
// Otherwise they fall back to the built-in mock API routes under
// /api/mock/*, which are seeded from data/employees.json and
// data/activity_history.csv. No component may call fetch() directly —
// everything goes through the functions below, so swapping in the real
// backend later only requires setting the environment variable.

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL

function resolvePath(path: string): string {
  if (BACKEND_URL) return `${BACKEND_URL.replace(/\/$/, "")}${path}`
  return `/api/mock${path}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(resolvePath(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError("Не удалось подключиться к серверу. Проверьте соединение и попробуйте снова.")
  }

  if (!response.ok) {
    let message = `Ошибка сервера (${response.status})`
    try {
      const body = await response.json()
      if (body?.message) message = body.message
    } catch {
      // response body wasn't JSON — keep the generic message
    }
    throw new ApiError(message, response.status)
  }

  return (await response.json()) as T
}

export function getEmployees(): Promise<Employee[]> {
  return request<Employee[]>("/employees")
}

export function getEmployee(employeeId: string): Promise<Employee> {
  return request<Employee>(`/employees/${employeeId}`)
}

export function getEmployeeActivities(employeeId: string): Promise<ActivityHistoryEntry[]> {
  return request<ActivityHistoryEntry[]>(`/employees/${employeeId}/activities`)
}

export function getRecommendations(employeeId: string): Promise<Recommendation[]> {
  return request<Recommendation[]>(`/employees/${employeeId}/recommendations`)
}

export function getHRDashboard(): Promise<HRDashboardData> {
  return request<HRDashboardData>("/hr-dashboard")
}

export interface CompleteActivityInput {
  recommendationId: string
  employeeId: string
  activityId: string
  activityName: string
  format: ActivityFormat
  durationHours: number
}

export function completeActivity(input: CompleteActivityInput): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/recommendations/${input.recommendationId}/complete`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}
