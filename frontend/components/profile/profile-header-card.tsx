import { CalendarClock, Target } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Employee } from "@/lib/types"

function daysUntil(isoDate: string): number {
  return Math.round((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
}

export function ProfileHeaderCard({ employee }: { employee: Employee }) {
  const daysLeft = daysUntil(employee.grade.targetDeadline)

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary text-base text-primary-foreground">
              {employee.avatarInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-balance text-foreground">{employee.fullName}</h1>
            <p className="text-sm text-muted-foreground">
              {employee.role} · {employee.department}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">Текущий грейд: {employee.grade.current}</Badge>
          <Badge className="bg-primary text-primary-foreground">Цель: {employee.grade.target}</Badge>
        </div>

        <div className="flex flex-col gap-3 rounded-lg bg-muted p-4">
          <div className="flex items-start gap-2">
            <Target className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-foreground">{employee.grade.goal}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="size-4 shrink-0" />
            <span>
              Дедлайн: {formatDate(employee.grade.targetDeadline)}
              {daysLeft >= 0 ? ` · осталось ${daysLeft} дн.` : " · срок прошёл"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
