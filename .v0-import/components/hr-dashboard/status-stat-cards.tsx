import { CheckCircle2, Clock3, UserX, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ActivityStatusBreakdown } from "@/lib/types"
import { cn } from "@/lib/utils"

export function StatusStatCards({ statusBreakdown }: { statusBreakdown: ActivityStatusBreakdown }) {
  const total =
    statusBreakdown.completed + statusBreakdown.dropout + statusBreakdown.noShow + statusBreakdown.inProgress

  const stats = [
    {
      label: "Завершено",
      value: statusBreakdown.completed,
      icon: CheckCircle2,
      tone: "text-primary",
    },
    {
      label: "Не завершено",
      value: statusBreakdown.dropout,
      icon: XCircle,
      tone: "text-destructive",
    },
    {
      label: "Не явился",
      value: statusBreakdown.noShow,
      icon: UserX,
      tone: "text-destructive",
    },
    {
      label: "В процессе",
      value: statusBreakdown.inProgress,
      icon: Clock3,
      tone: "text-muted-foreground",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        const share = total > 0 ? Math.round((stat.value / total) * 100) : 0
        return (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3">
              <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted", stat.tone)}>
                <Icon className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-semibold tabular-nums text-foreground">{stat.value}</span>
                <span className="text-xs text-muted-foreground">
                  {stat.label} · {share}%
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
