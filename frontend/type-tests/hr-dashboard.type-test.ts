import type { ActivityParticipation, ActivityStatusBreakdown } from "@/lib/types"

const statusBreakdown = {
  completed: 10,
  dropout: 2,
  dropped: 2,
  declined: 3,
  noShow: 4,
  inProgress: 5,
  planned: 0,
  overdue: 1,
} satisfies ActivityStatusBreakdown

const participation = {
  activityName: "System Design Workshop",
  participants: 20,
  completionRate: 75,
} satisfies ActivityParticipation

const requiredStatusValues: number[] = [
  statusBreakdown.completed,
  statusBreakdown.dropped,
  statusBreakdown.declined,
  statusBreakdown.noShow,
  statusBreakdown.inProgress,
  statusBreakdown.overdue,
]

void participation
void requiredStatusValues
