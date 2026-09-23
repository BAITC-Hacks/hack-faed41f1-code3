import { UserCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { EmployeeWithoutRecommendation } from "@/lib/types"

export function EmployeesWithoutRecommendationCard({
  employees,
}: {
  employees: EmployeeWithoutRecommendation[]
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Сотрудники без рекомендаций</CardTitle>
        <CardDescription>У них нет открытых разрывов в навыках — программа развития не требуется.</CardDescription>
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
                <TableHead>Департамент</TableHead>
                <TableHead className="text-right">Дней без активности</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.employeeId}>
                  <TableCell className="font-medium">{employee.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{employee.department}</TableCell>
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
