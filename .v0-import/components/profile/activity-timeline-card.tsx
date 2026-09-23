import { CheckCircle2, CircleDashed, Clock, UserX, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { ActivityHistoryEntry, ActivityStatus } from "@/lib/types"

const STATUS_CONFIG: Record<ActivityStatus, { label: string; icon: typeof CheckCircle2; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "Завершено", icon: CheckCircle2, variant: "secondary" },
  in_progress: { label: "В процессе", icon: Clock, variant: "outline" },
  dropout: { label: "Не завершено", icon: XCircle, variant: "destructive" },
  no_show: { label: "Не явился", icon: UserX, variant: "destructive" },
  planned: { label: "Запланировано", icon: CircleDashed, variant: "outline" },
}

const FORMAT_LABEL: Record<ActivityHistoryEntry["format"], string> = {
  online: "Онлайн",
  offline: "Очно",
  mixed: "Смешанный",
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
}

export function ActivityTimelineCard({ activities }: { activities: ActivityHistoryEntry[] }) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader>
        <CardTitle>История активностей</CardTitle>
        <CardDescription>Последние мероприятия по развитию сотрудника.</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {activities.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleDashed />
              </EmptyMedia>
              <EmptyTitle>Активности отсутствуют</EmptyTitle>
              <EmptyDescription>У сотрудника пока нет истории активностей.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {activities.map((activity) => {
              const status = STATUS_CONFIG[activity.status]
              const Icon = status.icon
              return (
                <li
                  key={activity.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">{activity.activityName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(activity.date)} · {FORMAT_LABEL[activity.format]} · {activity.durationHours} ч
                    </span>
                  </div>
                  <Badge variant={status.variant} className="shrink-0 gap-1">
                    <Icon data-icon="inline-start" />
                    {status.label}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
