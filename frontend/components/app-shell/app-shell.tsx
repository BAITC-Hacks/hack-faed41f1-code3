"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Briefcase, FileUp, LayoutDashboard, Sparkles, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEmployeeContext } from "@/lib/employee-context"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const NAV_ITEMS = [
  { href: "/profile", label: "Профиль сотрудника", icon: UserRound },
  { href: "/recommendations", label: "Рекомендации", icon: Sparkles },
  { href: "/hr-dashboard", label: "HR-панель", icon: LayoutDashboard },
  { href: "/import", label: "Импорт", icon: FileUp },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { employees, selectedEmployeeId, selectEmployee, isLoading } = useEmployeeContext()
  const showEmployeeSwitcher = pathname !== "/hr-dashboard" && pathname !== "/import"

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Briefcase className="size-5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-foreground">Career Quest</span>
            <span className="text-xs text-muted-foreground">Карьерное развитие сотрудников банка</span>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex w-64 items-center justify-end">
          {showEmployeeSwitcher &&
            (isLoading ? (
              <Skeleton className="h-9 w-56" />
            ) : (
              <Select
                value={selectedEmployeeId ?? undefined}
                onValueChange={(value) => {
                  if (value) selectEmployee(value)
                }}
              >
                <SelectTrigger className="w-56" aria-label="Выбор сотрудника">
                  <SelectValue placeholder="Выберите сотрудника">
                    {(value: unknown) =>
                      employees.find((employee) => employee.id === value)?.fullName ?? "Выберите сотрудника"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.fullName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  )
}
