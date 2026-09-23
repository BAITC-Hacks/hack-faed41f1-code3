import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Skill } from "@/lib/types"

const CATEGORY_LABEL: Record<Skill["category"], string> = {
  hard: "Хард-скилл",
  soft: "Софт-скилл",
  leadership: "Лидерство",
  digital: "Цифровой навык",
}

export function SkillsCard({ skills }: { skills: Skill[] }) {
  const sorted = [...skills].sort((a, b) => {
    const gapA = a.requiredLevel - a.currentLevel
    const gapB = b.requiredLevel - b.currentLevel
    if (a.critical !== b.critical) return a.critical ? -1 : 1
    return gapB - gapA
  })

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader>
        <CardTitle>Навыки: текущий и требуемый уровень</CardTitle>
        <CardDescription>Уровень от 0 до 5. Критичные навыки отмечены для целевого грейда.</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-4">
          {sorted.map((skill) => {
            const hasGap = skill.requiredLevel > skill.currentLevel
            return (
              <li key={skill.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{skill.name}</span>
                    {skill.critical && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle data-icon="inline-start" />
                        Критично
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{CATEGORY_LABEL[skill.category]}</Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {skill.currentLevel} / {skill.requiredLevel}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={(skill.currentLevel / 5) * 100} className="h-2" />
                  {hasGap && (
                    <div
                      className="absolute top-0 h-2 w-px bg-foreground/60"
                      style={{ left: `${(skill.requiredLevel / 5) * 100}%` }}
                      aria-hidden
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
