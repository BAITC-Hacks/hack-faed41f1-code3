"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, Clock3, MonitorPlay, RotateCw, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { completeActivity } from "@/lib/api"
import { ApiError, type Recommendation } from "@/lib/types"
import { cn } from "@/lib/utils"

const FORMAT_LABEL: Record<Recommendation["format"], string> = {
  online: "Онлайн",
  offline: "Очно",
  mixed: "Смешанный",
}

function scoreTone(score: number): string {
  if (score >= 80) return "bg-primary text-primary-foreground"
  if (score >= 60) return "bg-secondary text-secondary-foreground"
  return "bg-muted text-muted-foreground"
}

export function RecommendationCard({
  recommendation,
  employeeId,
  onCompleted,
}: {
  recommendation: Recommendation
  employeeId: string
  onCompleted: (recommendationId: string) => void | Promise<void>
}) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  async function handleComplete() {
    setIsPending(true)
    setError(null)
    try {
      await completeActivity({
        recommendationId: recommendation.id,
        employeeId,
        activityId: recommendation.activityId,
        activityName: recommendation.title,
        format: recommendation.format,
        durationHours: recommendation.durationHours,
      })
      await onCompleted(recommendation.id)
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Не удалось завершить мероприятие."))
    } finally {
      setIsPending(false)
    }
  }

  const { skillLevels } = recommendation

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="text-balance">{recommendation.title}</CardTitle>
          <CardDescription>{recommendation.description}</CardDescription>
        </div>
        <div
          className={cn(
            "flex shrink-0 flex-col items-center justify-center rounded-lg px-3 py-2 text-center",
            scoreTone(recommendation.score),
          )}
        >
          <span className="text-xl font-semibold leading-none tabular-nums">{recommendation.score}</span>
          <span className="text-[10px] leading-none opacity-90">индекс</span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {recommendation.factors.map((factor) => (
            <li key={factor.label} className="flex gap-2 rounded-lg bg-muted p-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{factor.label}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">{factor.detail}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{skillLevels.skillName}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              текущий {skillLevels.currentLevel} → ожидаемый {skillLevels.expectedLevel} · требуется{" "}
              {skillLevels.requiredLevel}
            </span>
          </div>
          <div className="relative">
            <Progress value={(skillLevels.currentLevel / 5) * 100} className="h-2" />
            <div
              className="absolute top-0 h-2 w-0.5 bg-primary"
              style={{ left: `${(skillLevels.expectedLevel / 5) * 100}%` }}
              aria-hidden
            />
            <div
              className="absolute top-0 h-2 w-px bg-foreground/60"
              style={{ left: `${(skillLevels.requiredLevel / 5) * 100}%` }}
              aria-hidden
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1">
            <MonitorPlay data-icon="inline-start" />
            {FORMAT_LABEL[recommendation.format]}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock3 data-icon="inline-start" />
            {recommendation.durationHours} ч
          </Badge>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="size-3.5" />
              {error.message}
            </span>
            <Button size="sm" variant="ghost" onClick={handleComplete} className="h-7 px-2">
              <RotateCw data-icon="inline-start" />
              Повторить
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button className="w-full" onClick={handleComplete} disabled={isPending}>
          {isPending ? <Spinner /> : <Users data-icon="inline-start" />}
          {isPending ? "Завершаем..." : "Завершить мероприятие"}
        </Button>
      </CardFooter>
    </Card>
  )
}
