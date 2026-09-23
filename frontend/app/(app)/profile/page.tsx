"use client"

import { useEffect, useState } from "react"
import { AlertCircle, RotateCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityTimelineCard } from "@/components/profile/activity-timeline-card"
import { CareerTrajectoryCard } from "@/components/profile/career-trajectory-card"
import { ProfileHeaderCard } from "@/components/profile/profile-header-card"
import { SkillsCard } from "@/components/profile/skills-card"
import { getEmployeeActivities, getEmployeeTrajectory, getRecommendations } from "@/lib/api"
import { useEmployeeContext } from "@/lib/employee-context"
import { ApiError } from "@/lib/types"
import type { ActivityHistoryEntry, EmployeeTrajectory, Recommendation } from "@/lib/types"

export default function ProfilePage() {
  const { selectedEmployee, isLoading: isEmployeesLoading, error: employeesError, retry: retryEmployees } =
    useEmployeeContext()

  const [activities, setActivities] = useState<ActivityHistoryEntry[]>([])
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true)
  const [activitiesError, setActivitiesError] = useState<ApiError | null>(null)
  const [trajectory, setTrajectory] = useState<EmployeeTrajectory | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isTrajectoryLoading, setIsTrajectoryLoading] = useState(true)
  const [trajectoryError, setTrajectoryError] = useState<ApiError | null>(null)
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

  useEffect(() => {
    if (!selectedEmployee) return
    let isMounted = true
    setIsTrajectoryLoading(true)
    setTrajectoryError(null)
    setTrajectory(null)
    setRecommendations([])

    Promise.all([getEmployeeTrajectory(selectedEmployee.id), getRecommendations(selectedEmployee.id)])
      .then(([trajectoryData, recommendationData]) => {
        if (!isMounted) return
        setTrajectory(trajectoryData)
        setRecommendations(recommendationData)
      })
      .catch((err: ApiError) => {
        if (isMounted) {
          setTrajectoryError(
            err instanceof ApiError ? err : new ApiError("Не удалось загрузить карьерную траекторию."),
          )
        }
      })
      .finally(() => {
        if (isMounted) setIsTrajectoryLoading(false)
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
      <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto p-6 xl:grid-cols-[380px_1fr]">
        <Skeleton className="min-h-72" />
        <Skeleton className="min-h-72" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <ProfileHeaderCard employee={selectedEmployee} />

          {isTrajectoryLoading ? (
            <Skeleton className="min-h-[520px]" />
          ) : trajectoryError ? (
            <Alert variant="destructive" className="self-start">
              <AlertCircle />
              <AlertTitle>Не удалось загрузить карьерную траекторию</AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <span>{trajectoryError.message}</span>
                <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)} className="w-fit">
                  <RotateCw data-icon="inline-start" />
                  Повторить
                </Button>
              </AlertDescription>
            </Alert>
          ) : trajectory ? (
            <CareerTrajectoryCard trajectory={trajectory} recommendations={recommendations} />
          ) : (
            <Alert>
              <AlertTitle>Карьерная траектория не найдена</AlertTitle>
              <AlertDescription>API не вернул данные карьерной траектории сотрудника.</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="flex min-h-[440px] flex-col">
            <SkillsCard skills={selectedEmployee.skills} />
          </div>

          <div className="flex min-h-[440px] flex-col">
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
      </div>
    </div>
  )
}
