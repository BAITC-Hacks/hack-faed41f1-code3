"use client"

import { Bar, CartesianGrid, ComposedChart, LabelList, Line, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
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
        <CardDescription>
          Записи участия и completion rate: completed / все записи мероприятия.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
          <ComposedChart data={participationByActivity} margin={{ left: 0, right: 8, bottom: 24, top: 18 }}>
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
            <YAxis yAxisId="participants" allowDecimals={false} tickLine={false} axisLine={false} width={32} />
            <YAxis
              yAxisId="rate"
              orientation="right"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(value: number) => `${value}%`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              yAxisId="participants"
              dataKey="participants"
              fill="var(--color-participants)"
              radius={4}
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="completionRate"
              stroke="var(--color-completionRate)"
              strokeWidth={2}
              dot={{ fill: "var(--color-completionRate)", r: 3 }}
            >
              <LabelList
                dataKey="completionRate"
                position="top"
                formatter={(value) => `${value}%`}
                className="fill-foreground"
                fontSize={10}
              />
            </Line>
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
