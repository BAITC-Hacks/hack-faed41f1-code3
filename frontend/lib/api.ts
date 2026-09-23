import { ApiError } from "@/lib/types"
import type { ActivityFormat, ActivityHistoryEntry, Employee, HRDashboardData, Recommendation } from "@/lib/types"

const REQUEST_TIMEOUT_MS = 10_000

function getBackendUrl(): string {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (!backendUrl) {
    throw new ApiError("Career Quest API не настроен. Укажите NEXT_PUBLIC_API_URL.")
  }
  return backendUrl.replace(/\/$/, "")
}

function resolvePath(path: string): string {
  return `${getBackendUrl()}${path}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(resolvePath(path), {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError("Не удалось подключиться к Career Quest API")
  } finally {
    window.clearTimeout(timeout)
  }

  if (!response.ok) {
    let message = `Ошибка сервера (${response.status})`
    try {
      const body = await response.json()
      if (body?.error?.message) message = body.error.message
    } catch {
      // Keep the status-based fallback when the backend response is not JSON.
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

export function getEmployeeTrajectory(employeeId: string): Promise<unknown> {
  return request<unknown>(`/employees/${employeeId}/trajectory`)
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
