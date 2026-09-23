import { UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { EmployeeWithoutRecommendation } from "@/lib/types"

export interface EmployeeWithoutRecommendationDetails extends EmployeeWithoutRecommendation {
  targetGrade: string
  openGapCount: number | null
}

export function EmployeesWithoutRecommendationCard({
  employees,
}: {
  employees: EmployeeWithoutRecommendationDetails[]
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Сотрудники без рекомендаций</CardTitle>
        <CardDescription>
          Сотрудники, для которых система не нашла подходящих мероприятий по текущим правилам.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {employees.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UserCheck />
              </EmptyMedia>
              <EmptyTitle>Все сотрудники охвачены</EmptyTitle>
              <EmptyDescription>У каждого сотрудника есть хотя бы одна активная рекомендация.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Целевой грейд</TableHead>
                <TableHead>Открытые разрывы</TableHead>
                <TableHead>Причина</TableHead>
                <TableHead className="text-right">Дней без активности</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.employeeId}>
                  <TableCell>
                    <p className="font-medium text-foreground">{employee.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {employee.employeeId} · {employee.department}
                    </p>
                  </TableCell>
                  <TableCell>{employee.targetGrade}</TableCell>
                  <TableCell>
                    {employee.openGapCount === null ? (
                      <Badge variant="outline">Нет данных</Badge>
                    ) : employee.openGapCount > 0 ? (
                      <Badge variant="destructive">Да · {employee.openGapCount}</Badge>
                    ) : (
                      <Badge variant="secondary">Нет</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-64 text-muted-foreground">
                    {employee.openGapCount === null
                      ? "Данные профиля недоступны"
                      : employee.openGapCount === 0
                      ? "Целевые требования выполнены"
                      : "Нет подходящего мероприятия"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {employee.daysSinceLastActivity >= 0 ? employee.daysSinceLastActivity : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
