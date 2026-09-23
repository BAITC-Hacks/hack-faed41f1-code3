import { buildRecommendationsForEmployee } from "@/lib/activities-catalog"
import type {
  ActivityHistoryEntry,
  Employee,
  EmployeeWithoutRecommendation,
  HRDashboardData,
  SkillGapSummary,
} from "@/lib/types"

function buildTopSkillGaps(employees: Employee[]): SkillGapSummary[] {
  const gaps = new Map<string, SkillGapSummary>()

  for (const employee of employees) {
    for (const skill of employee.skills) {
      if (skill.requiredLevel <= skill.currentLevel) continue
      const existing = gaps.get(skill.name)
      if (existing) {
        existing.employeesAffected += 1
      } else {
        gaps.set(skill.name, {
          skillName: skill.name,
          category: skill.category,
          employeesAffected: 1,
        })
      }
    }
  }

  return [...gaps.values()].sort((a, b) => b.employeesAffected - a.employeesAffected).slice(0, 6)
}

function buildEmployeesWithoutRecommendation(
  employees: Employee[],
  history: ActivityHistoryEntry[],
): EmployeeWithoutRecommendation[] {
  return employees
    .filter((employee) => buildRecommendationsForEmployee(employee).length === 0)
    .map((employee) => {
      const employeeHistory = history
        .filter((entry) => entry.employeeId === employee.id)
        .sort((a, b) => b.date.localeCompare(a.date))

      const lastDate = employeeHistory[0]?.date
      const daysSinceLastActivity = lastDate
        ? Math.max(0, Math.round((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)))
        : -1

      return {
        employeeId: employee.id,
        fullName: employee.fullName,
        department: employee.department,
        daysSinceLastActivity,
      }
    })
}

export function buildHrDashboard(employees: Employee[], history: ActivityHistoryEntry[]): HRDashboardData {
  const statusBreakdown = {
    completed: 0,
    dropout: 0,
    noShow: 0,
    inProgress: 0,
    planned: 0,
  }

  const participationMap = new Map<string, { participants: number; completed: number }>()

  for (const entry of history) {
    if (entry.status === "completed") statusBreakdown.completed += 1
    else if (entry.status === "dropout") statusBreakdown.dropout += 1
    else if (entry.status === "no_show") statusBreakdown.noShow += 1
    else if (entry.status === "in_progress") statusBreakdown.inProgress += 1
    else if (entry.status === "planned") statusBreakdown.planned += 1

    const bucket = participationMap.get(entry.activityName) ?? { participants: 0, completed: 0 }
    bucket.participants += 1
    if (entry.status === "completed") bucket.completed += 1
    participationMap.set(entry.activityName, bucket)
  }

  const participationByActivity = [...participationMap.entries()]
    .map(([activityName, { participants, completed }]) => ({
      activityName,
      participants,
      completionRate: participants > 0 ? Math.round((completed / participants) * 100) : 0,
    }))
    .sort((a, b) => b.participants - a.participants)
    .slice(0, 8)

  return {
    topSkillGaps: buildTopSkillGaps(employees),
    employeesWithoutRecommendation: buildEmployeesWithoutRecommendation(employees, history),
    statusBreakdown,
    participationByActivity,
    totalEmployees: employees.length,
  }
}
