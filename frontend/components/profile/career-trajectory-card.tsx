import Link from "next/link"
import { AlertTriangle, ArrowRight, CheckCircle2, Flag, Sparkles, Trophy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { EmployeeTrajectory, Recommendation } from "@/lib/types"
import { cn } from "@/lib/utils"

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function CareerTrajectoryCard({
  trajectory,
  recommendations,
}: {
  trajectory: EmployeeTrajectory
  recommendations: Recommendation[]
}) {
  const gaps = trajectory.skills.filter((skill) => skill.gap > 0)
  const nextSteps = recommendations.slice(0, 3)
  const isLeadWithoutNextStep =
    trajectory.currentGrade === "Lead" &&
    trajectory.targetGrade === trajectory.currentGrade &&
    trajectory.targetRole === trajectory.currentRole

  return (
    <Card>
      <CardHeader>
        <CardTitle>Карьерная траектория</CardTitle>
        <CardDescription>Готовность к целевой роли на {formatDate(trajectory.asOfDate)}.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="grid items-center gap-3 rounded-lg bg-muted p-4 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="text-xs text-muted-foreground">Сейчас</p>
            <p className="mt-1 font-medium text-foreground">{trajectory.currentRole}</p>
            <Badge variant="secondary" className="mt-2">
              {trajectory.currentGrade}
            </Badge>
          </div>
          <ArrowRight className="size-5 text-muted-foreground max-sm:rotate-90" aria-hidden />
          <div className="sm:text-right">
            <p className="text-xs text-muted-foreground">Цель</p>
            <p className="mt-1 font-medium text-foreground">{trajectory.targetRole}</p>
            <Badge className="mt-2">{trajectory.targetGrade}</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">Готовность</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {trajectory.progressPercentage}%
            </span>
          </div>
          <Progress value={trajectory.progressPercentage} aria-label="Готовность к целевой роли" />
        </div>

        {isLeadWithoutNextStep && (
          <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <Trophy className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-medium text-foreground">Следующий грейд не определён</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Сотрудник уже находится на уровне Lead, а карьерная цель следующего шага не задана.
              </p>
            </div>
          </div>
        )}

        <section className="flex flex-col gap-3" aria-labelledby="skill-gaps-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="skill-gaps-title" className="text-sm font-medium text-foreground">
              Разрывы в навыках
            </h2>
            <Badge variant="outline">{gaps.length}</Badge>
          </div>

          {gaps.length > 0 ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {gaps.map((skill) => (
                <li
                  key={skill.skillId}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border p-3",
                    skill.critical && "border-destructive/40 bg-destructive/5",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{skill.skillName}</p>
                    {skill.critical && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="size-3" aria-hidden />
                        Критичный навык
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {skill.currentLevel} / {skill.requiredLevel}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-medium text-foreground">Целевые требования выполнены</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  У сотрудника нет разрывов относительно требований целевой роли.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 border-t border-border pt-4" aria-labelledby="next-steps-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="next-steps-title" className="text-sm font-medium text-foreground">
                Следующие шаги
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">До трёх наиболее подходящих мероприятий.</p>
            </div>
            <Link href="/recommendations" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Все рекомендации
              <ArrowRight data-icon="inline-end" />
            </Link>
          </div>

          {nextSteps.length > 0 ? (
            <ul className="grid gap-2 lg:grid-cols-3">
              {nextSteps.map((recommendation) => {
                const impact = recommendation.skillLevels
                return (
                  <li key={recommendation.id} className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <p className="text-sm font-medium leading-snug text-foreground">{recommendation.title}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{impact.skillName}</span>
                      <span className="shrink-0 tabular-nums">
                        {impact.currentLevel} → {impact.expectedLevel}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : gaps.length === 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
              <Flag className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Целевые требования уже выполнены — дополнительные мероприятия сейчас не нужны.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Разрывы в навыках есть, но подходящих доступных мероприятий сейчас нет.
              </p>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
