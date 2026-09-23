import { AlarmClock, Ban, CheckCircle2, Clock3, UserX, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ActivityStatusBreakdown } from "@/lib/types"
import { cn } from "@/lib/utils"

export function StatusStatCards({ statusBreakdown }: { statusBreakdown: ActivityStatusBreakdown }) {
  const total =
    statusBreakdown.completed +
    statusBreakdown.dropped +
    statusBreakdown.declined +
    statusBreakdown.noShow +
    statusBreakdown.inProgress +
    statusBreakdown.overdue +
    statusBreakdown.planned

  const stats = [
    {
      label: "Завершено",
      value: statusBreakdown.completed,
      icon: CheckCircle2,
      tone: "text-primary",
    },
    {
      label: "Dropped",
      value: statusBreakdown.dropped,
      icon: XCircle,
      tone: "text-destructive",
    },
    {
      label: "Declined",
      value: statusBreakdown.declined,
      icon: Ban,
      tone: "text-destructive",
    },
    {
      label: "No-show",
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
    {
      label: "Просрочено",
      value: statusBreakdown.overdue,
      icon: AlarmClock,
      tone: "text-muted-foreground",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
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
                  {stat.label} · {share}% записей
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
