"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, RotateCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { RecommendationCard } from "@/components/recommendations/recommendation-card"
import { getRecommendations } from "@/lib/api"
import { useEmployeeContext } from "@/lib/employee-context"
import { ApiError } from "@/lib/types"
import type { Recommendation } from "@/lib/types"

export default function RecommendationsPage() {
  const { selectedEmployee, isLoading: isEmployeesLoading, error: employeesError, retry: retryEmployees, refreshSelectedEmployee } =
    useEmployeeContext()

  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [justCompletedTitle, setJustCompletedTitle] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedEmployee) return
    let isMounted = true
    setIsLoading(true)
    setError(null)
    setJustCompletedTitle(null)

    getRecommendations(selectedEmployee.id)
      .then((data) => {
        if (isMounted) setRecommendations(data)
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
  }, [selectedEmployee, attempt])

  async function handleCompleted(recommendationId: string) {
    const completed = recommendations.find((r) => r.id === recommendationId)
    await refreshSelectedEmployee()
    setJustCompletedTitle(completed?.title ?? null)
  }

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

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">
          Рекомендации {selectedEmployee ? `для ${selectedEmployee.fullName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Мероприятия развития, подобранные под текущие разрывы в навыках сотрудника.
        </p>
      </div>

      {justCompletedTitle && (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Мероприятие завершено</AlertTitle>
          <AlertDescription>«{justCompletedTitle}» добавлено в историю активностей сотрудника.</AlertDescription>
        </Alert>
      )}

      {isEmployeesLoading || isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : error ? (
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle />
          <AlertTitle>Не удалось загрузить рекомендации</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{error.message}</span>
            <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)} className="w-fit">
              <RotateCw data-icon="inline-start" />
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      ) : !selectedEmployee ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircle />
            </EmptyMedia>
            <EmptyTitle>Сотрудники не найдены</EmptyTitle>
            <EmptyDescription>Career Quest API не вернул доступных сотрудников.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : recommendations.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircle2 />
            </EmptyMedia>
            <EmptyTitle>Рекомендаций нет</EmptyTitle>
            <EmptyDescription>
              Все навыки сотрудника соответствуют требованиям целевого грейда. Новые рекомендации появятся при
              обновлении профиля навыков.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              employeeId={selectedEmployee!.id}
              onCompleted={handleCompleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}
