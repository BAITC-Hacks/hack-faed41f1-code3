"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { getEmployee, getEmployeeActivities, getEmployeeTrajectory, getEmployees, getRecommendations } from "@/lib/api"
import { DEMO_EMPLOYEE_ID, isDemoRole, type DemoRole } from "@/lib/demo-access"
import type { ApiError } from "@/lib/types"
import type { Employee } from "@/lib/types"

interface EmployeeContextValue {
  employees: Employee[]
  selectedEmployeeId: string | null
  selectedEmployee: Employee | null
  selectEmployee: (id: string) => void
  demoRole: DemoRole
  demoEmployeeId: string
  isDemoRoleReady: boolean
  setDemoRole: (role: DemoRole) => void
  refreshSelectedEmployee: () => Promise<void>
  isLoading: boolean
  error: ApiError | null
  retry: () => void
}

const EmployeeContext = createContext<EmployeeContextValue | null>(null)

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [requestedEmployeeId, setRequestedEmployeeId] = useState<string | null>(null)
  const [demoRole, setDemoRoleState] = useState<DemoRole>("employee")
  const [isDemoRoleReady, setIsDemoRoleReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roleFromUrl = params.get("demoRole")
    let storedRole: string | null = null
    try {
      storedRole = window.localStorage.getItem("career-quest-demo-role")
    } catch {
      // Demo mode still works when browser storage is unavailable.
    }
    const initialRole = isDemoRole(roleFromUrl)
      ? roleFromUrl
      : isDemoRole(storedRole)
        ? storedRole
        : "employee"

    setDemoRoleState(initialRole)
    setRequestedEmployeeId(params.get("employeeId"))
    setIsDemoRoleReady(true)
  }, [])

  useEffect(() => {
    if (!isDemoRoleReady) return
    let isMounted = true
    setIsLoading(true)
    setError(null)

    const employeeRequest =
      demoRole === "employee"
        ? getEmployee(DEMO_EMPLOYEE_ID).then((employee) => [employee])
        : getEmployees()

    employeeRequest
      .then((data) => {
        if (!isMounted) return
        setEmployees(data)
        setSelectedEmployeeId((current) => {
          if (demoRole === "employee") return data[0]?.id ?? null
          return (
            data.find((employee) => employee.id === current)?.id ??
            data.find((employee) => employee.id === requestedEmployeeId)?.id ??
            data[0]?.id ??
            null
          )
        })
      })
      .catch((err: ApiError) => {
        if (isMounted) setError(err)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [attempt, demoRole, isDemoRoleReady, requestedEmployeeId])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const selectEmployee = useCallback(
    (id: string) => {
      if (demoRole === "employee") {
        setSelectedEmployeeId(DEMO_EMPLOYEE_ID)
        return
      }
      setSelectedEmployeeId(id)
    },
    [demoRole],
  )
  const setDemoRole = useCallback((role: DemoRole) => {
    setIsLoading(true)
    setError(null)
    setEmployees([])
    setSelectedEmployeeId(role === "employee" ? DEMO_EMPLOYEE_ID : null)
    setDemoRoleState(role)
    setRequestedEmployeeId(role === "employee" ? DEMO_EMPLOYEE_ID : null)
    try {
      window.localStorage.setItem("career-quest-demo-role", role)
    } catch {
      // URL state remains sufficient for demo navigation.
    }
  }, [])

  const refreshSelectedEmployee = useCallback(async () => {
    if (!selectedEmployeeId) return

    const [employee] = await Promise.all([
      getEmployee(selectedEmployeeId),
      getEmployeeActivities(selectedEmployeeId),
      getEmployeeTrajectory(selectedEmployeeId),
      getRecommendations(selectedEmployeeId),
    ])
    setEmployees((current) => current.map((item) => (item.id === employee.id ? employee : item)))
  }, [selectedEmployeeId])

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? null

  return (
    <EmployeeContext.Provider
      value={{
        employees,
        selectedEmployeeId,
        selectedEmployee,
        selectEmployee,
        demoRole,
        demoEmployeeId: DEMO_EMPLOYEE_ID,
        isDemoRoleReady,
        setDemoRole,
        refreshSelectedEmployee,
        isLoading,
        error,
        retry,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  )
}

export function useEmployeeContext(): EmployeeContextValue {
  const context = useContext(EmployeeContext)
  if (!context) {
    throw new Error("useEmployeeContext должен использоваться внутри EmployeeProvider")
  }
  return context
}
