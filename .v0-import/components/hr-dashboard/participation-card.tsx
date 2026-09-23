"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { ActivityParticipation } from "@/lib/types"

const chartConfig: ChartConfig = {
  participants: {
    label: "Участников",
    color: "var(--color-chart-2)",
  },
  completionRate: {
    label: "Завершение, %",
    color: "var(--color-chart-1)",
  },
}

export function ParticipationCard({ participationByActivity }: { participationByActivity: ActivityParticipation[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Участие по мероприятиям</CardTitle>
        <CardDescription>Число участников и доля завершивших мероприятие.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
          <BarChart data={participationByActivity} margin={{ left: 0, right: 12, bottom: 24 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="activityName"
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={70}
              tick={{ fontSize: 10 }}
              tickFormatter={(value: string) => (value.length > 16 ? `${value.slice(0, 16)}…` : value)}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="participants" fill="var(--color-participants)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
