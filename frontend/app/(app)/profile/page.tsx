"use client"

import { useEffect, useState } from "react"
import { AlertCircle, RotateCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityTimelineCard } from "@/components/profile/activity-timeline-card"
import { ProfileHeaderCard } from "@/components/profile/profile-header-card"
import { SkillsCard } from "@/components/profile/skills-card"
import { getEmployeeActivities } from "@/lib/api"
import { useEmployeeContext } from "@/lib/employee-context"
import { ApiError } from "@/lib/types"
import type { ActivityHistoryEntry } from "@/lib/types"

export default function ProfilePage() {
  const { selectedEmployee, isLoading: isEmployeesLoading, error: employeesError, retry: retryEmployees } =
    useEmployeeContext()

  const [activities, setActivities] = useState<ActivityHistoryEntry[]>([])
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true)
  const [activitiesError, setActivitiesError] = useState<ApiError | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!selectedEmployee) return
    let isMounted = true
    setIsActivitiesLoading(true)
    setActivitiesError(null)

    getEmployeeActivities(selectedEmployee.id)
      .then((data) => {
        if (isMounted) setActivities(data)
      })
      .catch((err: ApiError) => {
        if (isMounted) setActivitiesError(err)
      })
      .finally(() => {
        if (isMounted) setIsActivitiesLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedEmployee, attempt])

  if (employeesError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle />
          <AlertTitle>Не удалось загрузить сотрудников</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{employeesError.message}</span>
            <Button size="sm" variant="outline" onClick={retryEmployees} className="w-fit">
              <RotateCw data-icon="inline-start" />
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isEmployeesLoading || !selectedEmployee) {
    if (!isEmployeesLoading) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <Alert className="max-w-md">
            <AlertTitle>Сотрудники не найдены</AlertTitle>
            <AlertDescription>Career Quest API не вернул доступных сотрудников.</AlertDescription>
          </Alert>
        </div>
      )
    }
    return (
      <div className="grid h-full grid-cols-1 gap-4 p-6 lg:grid-cols-[380px_1fr_420px]">
        <Skeleton className="h-full" />
        <Skeleton className="h-full" />
        <Skeleton className="h-full" />
      </div>
    )
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto p-6 lg:h-full lg:grid-cols-[380px_1fr_420px] lg:overflow-hidden">
      <div className="flex flex-col gap-4 lg:h-full">
        <ProfileHeaderCard employee={selectedEmployee} />
      </div>

      <div className="flex min-h-0 flex-col lg:h-full">
        <SkillsCard skills={selectedEmployee.skills} />
      </div>

      <div className="flex min-h-0 flex-col lg:h-full">
        {isActivitiesLoading ? (
          <Skeleton className="h-full" />
        ) : activitiesError ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Не удалось загрузить активности</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <span>{activitiesError.message}</span>
              <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)} className="w-fit">
                <RotateCw data-icon="inline-start" />
                Повторить
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <ActivityTimelineCard activities={activities} />
        )}
      </div>
    </div>
  )
}
