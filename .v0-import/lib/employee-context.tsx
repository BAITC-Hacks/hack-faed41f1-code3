"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { getEmployees } from "@/lib/api"
import type { ApiError } from "@/lib/types"
import type { Employee } from "@/lib/types"

interface EmployeeContextValue {
  employees: Employee[]
  selectedEmployeeId: string | null
  selectedEmployee: Employee | null
  setSelectedEmployeeId: (id: string) => void
  isLoading: boolean
  error: ApiError | null
  retry: () => void
}

const EmployeeContext = createContext<EmployeeContextValue | null>(null)

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError(null)

    getEmployees()
      .then((data) => {
        if (!isMounted) return
        setEmployees(data)
        setSelectedEmployeeId((current) => current ?? data[0]?.id ?? null)
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
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? null

  return (
    <EmployeeContext.Provider
      value={{
        employees,
        selectedEmployeeId,
        selectedEmployee,
        setSelectedEmployeeId,
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
