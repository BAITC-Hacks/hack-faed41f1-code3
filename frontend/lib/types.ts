// Shared domain types for Career Quest.
// These describe the exact shape returned by the Career Quest API.

export type SkillCategory = "hard" | "soft" | "leadership" | "digital"

export interface Skill {
  id: string
  name: string
  category: SkillCategory
  currentLevel: number // 0-5
  requiredLevel: number // 0-5
  critical: boolean
}

export type ActivityFormat = "online" | "offline" | "mixed"

export type ActivityStatus = "completed" | "in_progress" | "dropout" | "no_show" | "planned"

export interface ActivityHistoryEntry {
  id: string
  employeeId: string
  activityId: string
  activityName: string
  date: string // ISO date
  status: ActivityStatus
  format: ActivityFormat
  durationHours: number
}

export interface GradeInfo {
  current: string
  target: string
  targetDeadline: string // ISO date
  goal: string
}

export interface Employee {
  id: string
  fullName: string
  role: string
  department: string
  avatarInitials: string
  grade: GradeInfo
  skills: Skill[]
}

export interface TrajectorySkill {
  skillId: string
  skillName: string
  currentLevel: number
  requiredLevel: number
  gap: number
  critical: boolean
}

export interface EmployeeTrajectory {
  employeeId: string
  currentRole: string
  currentGrade: string
  targetRole: string
  targetGrade: string
  asOfDate: string // ISO date
  progressPercentage: number // 0-100
  skills: TrajectorySkill[]
}

export interface RecommendationFactor {
  label: string
  detail: string
}

export interface RecommendationSkillLevels {
  skillName: string
  currentLevel: number
  expectedLevel: number
  requiredLevel: number
}

export interface Recommendation {
  id: string
  employeeId: string
  activityId: string
  title: string
  description: string
  score: number // 0-100
  factors: RecommendationFactor[]
  skillLevels: RecommendationSkillLevels
  format: ActivityFormat
  durationHours: number
  startDate: string // ISO date
}

export interface SkillGapSummary {
  skillName: string
  category: SkillCategory
  employeesAffected: number
}

export interface EmployeeWithoutRecommendation {
  employeeId: string
  fullName: string
  department: string
  daysSinceLastActivity: number
}

export interface ActivityStatusBreakdown {
  completed: number
  dropout: number
  dropped: number
  declined: number
  noShow: number
  inProgress: number
  planned: number
  overdue: number
}

export interface ActivityParticipation {
  activityName: string
  participants: number
  completionRate: number // 0-100
}

export interface HRDashboardData {
  topSkillGaps: SkillGapSummary[]
  employeesWithoutRecommendation: EmployeeWithoutRecommendation[]
  statusBreakdown: ActivityStatusBreakdown
  participationByActivity: ActivityParticipation[]
  totalEmployees: number
}

export interface ImportResult {
  employeesImported: number
  historyRecordsImported: number
  totalEmployees: number
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}
