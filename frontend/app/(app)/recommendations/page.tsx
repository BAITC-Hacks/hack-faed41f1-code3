"use client"

import { useEffect, useState } from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, RotateCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { RecommendationCard } from "@/components/recommendations/recommendation-card"
import { getEmployeeTrajectory, getRecommendations } from "@/lib/api"
import { useEmployeeContext } from "@/lib/employee-context"
import { ApiError } from "@/lib/types"
import type { EmployeeTrajectory, Recommendation } from "@/lib/types"

export default function RecommendationsPage() {
  const { selectedEmployee, isLoading: isEmployeesLoading, error: employeesError, retry: retryEmployees, refreshSelectedEmployee } =
    useEmployeeContext()

  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [trajectory, setTrajectory] = useState<EmployeeTrajectory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [justCompletedTitle, setJustCompletedTitle] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedEmployee) {
      setRecommendations([])
      setTrajectory(null)
      setIsLoading(false)
      return
    }
    let isMounted = true
    setIsLoading(true)
    setError(null)
    setJustCompletedTitle(null)
    setRecommendations([])
    setTrajectory(null)

    Promise.all([getRecommendations(selectedEmployee.id), getEmployeeTrajectory(selectedEmployee.id)])
      .then(([recommendationData, trajectoryData]) => {
        if (!isMounted) return
        setRecommendations(recommendationData)
        setTrajectory(trajectoryData)
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof ApiError ? err : new ApiError("Не удалось загрузить данные рекомендаций."))
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedEmployee, attempt])

  const openGaps = trajectory?.skills.filter((skill) => skill.gap > 0) ?? []

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
      ) : !trajectory ? (
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle />
          <AlertTitle>Некорректный ответ API</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>Карьерная траектория сотрудника не была получена.</span>
            <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)} className="w-fit">
              <RotateCw data-icon="inline-start" />
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      ) : recommendations.length === 0 && openGaps.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircle2 />
            </EmptyMedia>
            <EmptyTitle>Требования целевого грейда выполнены</EmptyTitle>
            <EmptyDescription>
              Разрывов в навыках для грейда {trajectory.targetGrade} нет. Сотрудник готов к следующему карьерному
              шагу, поэтому развивающие мероприятия сейчас не требуются.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : recommendations.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertTriangle />
            </EmptyMedia>
            <EmptyTitle>Разрывы есть, но рекомендаций нет</EmptyTitle>
            <EmptyDescription>
              До требований грейда {trajectory.targetGrade} ещё остаются разрывы, но подходящих доступных
              мероприятий по текущим правилам допустимости сейчас нет.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="max-w-2xl items-stretch text-left">
            <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ключевые разрывы
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {openGaps.slice(0, 6).map((skill) => (
                <li key={skill.skillId} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span className="min-w-0 truncate font-medium text-foreground">{skill.skillName}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {skill.critical && <Badge variant="destructive">Критично</Badge>}
                    <span className="tabular-nums text-muted-foreground">
                      {skill.currentLevel} / {skill.requiredLevel}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </EmptyContent>
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
