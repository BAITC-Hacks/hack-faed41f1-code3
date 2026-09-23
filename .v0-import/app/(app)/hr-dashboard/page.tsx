"use client"

import { useEffect, useState } from "react"
import { AlertCircle, RotateCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmployeesWithoutRecommendationCard } from "@/components/hr-dashboard/employees-without-recommendation-card"
import { ParticipationCard } from "@/components/hr-dashboard/participation-card"
import { SkillGapsCard } from "@/components/hr-dashboard/skill-gaps-card"
import { StatusStatCards } from "@/components/hr-dashboard/status-stat-cards"
import { getHRDashboard } from "@/lib/api"
import { ApiError } from "@/lib/types"
import type { HRDashboardData } from "@/lib/types"

export default function HrDashboardPage() {
  const [data, setData] = useState<HRDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError(null)

    getHRDashboard()
      .then((result) => {
        if (isMounted) setData(result)
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

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle />
          <AlertTitle>Не удалось загрузить HR-панель</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{error.message}</span>
            <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)} className="w-fit">
              <RotateCw data-icon="inline-start" />
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-full" />
          <Skeleton className="h-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6 lg:overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">HR-панель</h1>
          <p className="text-sm text-muted-foreground">
            Обзор развития персонала · {data.totalEmployees} сотрудников
          </p>
        </div>
      </div>

      <StatusStatCards statusBreakdown={data.statusBreakdown} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <SkillGapsCard topSkillGaps={data.topSkillGaps} />
        <ParticipationCard participationByActivity={data.participationByActivity} />
      </div>

      <div className="min-h-0 lg:h-64">
        <EmployeesWithoutRecommendationCard employees={data.employeesWithoutRecommendation} />
      </div>
    </div>
  )
}
