"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { SkillGapSummary } from "@/lib/types"

const chartConfig: ChartConfig = {
  employeesAffected: {
    label: "Сотрудников с разрывом",
    color: "var(--color-chart-1)",
  },
}

export function SkillGapsCard({ topSkillGaps }: { topSkillGaps: SkillGapSummary[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Наиболее частые разрывы в навыках</CardTitle>
        <CardDescription>Количество сотрудников, у которых текущий уровень ниже требуемого.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
          <BarChart data={topSkillGaps} layout="vertical" margin={{ left: 12, right: 24 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="skillName"
              tickLine={false}
              axisLine={false}
              width={170}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="employeesAffected" fill="var(--color-employeesAffected)" radius={4}>
              <LabelList dataKey="employeesAffected" position="right" className="fill-foreground" fontSize={12} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
