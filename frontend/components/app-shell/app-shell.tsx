"use client"

import Link from "next/link"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Briefcase, FileUp, LayoutDashboard, ShieldAlert, Sparkles, UserRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useEmployeeContext } from "@/lib/employee-context"
import { canAccessDemoRoute, fallbackPathForDemoRole, type DemoRole } from "@/lib/demo-access"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const NAV_ITEMS = [
  { href: "/profile", label: "Профиль сотрудника", icon: UserRound, hrOnly: false },
  { href: "/recommendations", label: "Рекомендации", icon: Sparkles, hrOnly: false },
  { href: "/hr-dashboard", label: "HR-панель", icon: LayoutDashboard, hrOnly: true },
  { href: "/import", label: "Импорт", icon: FileUp, hrOnly: true },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const {
    employees,
    selectedEmployee,
    selectedEmployeeId,
    selectEmployee,
    demoRole,
    demoEmployeeId,
    isDemoRoleReady,
    setDemoRole,
    isLoading,
  } = useEmployeeContext()
  const canAccessCurrentRoute = canAccessDemoRoute(demoRole, pathname)
  const visibleNavItems = NAV_ITEMS.filter((item) => demoRole === "hr" || !item.hrOnly)
  const showEmployeeSwitcher =
    demoRole === "hr" && pathname !== "/hr-dashboard" && pathname !== "/import"

  function hrefWithDemoContext(href: string, role: DemoRole = demoRole): string {
    const params = new URLSearchParams()
    params.set("demoRole", role)
    const employeeId = role === "employee" ? demoEmployeeId : selectedEmployeeId
    if (employeeId) params.set("employeeId", employeeId)
    return `${href}?${params.toString()}`
  }

  function handleDemoRoleChange(role: DemoRole | null) {
    if (!role) return
    setDemoRole(role)
    router.push(hrefWithDemoContext(fallbackPathForDemoRole(role), role))
  }

  useEffect(() => {
    if (!isDemoRoleReady) return
    const targetPath = canAccessCurrentRoute ? pathname : fallbackPathForDemoRole(demoRole)
    const params = new URLSearchParams(window.location.search)
    params.set("demoRole", demoRole)
    if (demoRole === "employee") {
      params.set("employeeId", demoEmployeeId)
    } else if (selectedEmployeeId) {
      params.set("employeeId", selectedEmployeeId)
    } else {
      params.delete("employeeId")
    }
    const target = `${targetPath}?${params.toString()}`
    const current = `${window.location.pathname}${window.location.search}`
    if (current !== target) router.replace(target)
  }, [canAccessCurrentRoute, demoEmployeeId, demoRole, isDemoRoleReady, pathname, router, selectedEmployeeId])

  if (!isDemoRoleReady || !canAccessCurrentRoute) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="flex max-w-md items-start gap-3 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">Проверяем границы демо-роли</p>
            <p className="mt-1">Employee mode перенаправляется только на собственный профиль.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-2">
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
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={hrefWithDemoContext(item.href)}
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

        <div className="flex items-center justify-end gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-dashed px-2 py-1">
            <div className="hidden flex-col leading-none xl:flex">
              <span className="text-xs font-medium text-foreground">Демо-роль</span>
              <span className="text-[10px] text-muted-foreground">не авторизация</span>
            </div>
            <Select value={demoRole} onValueChange={handleDemoRoleChange}>
              <SelectTrigger className="w-28" aria-label="Переключение демо-роли">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

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
          {demoRole === "employee" && !isLoading && selectedEmployee && (
            <Badge variant="outline" className="h-8 max-w-52 px-3">
              {selectedEmployee.fullName} · {selectedEmployee.id}
            </Badge>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  )
}
