import type {
  ActivityFormat,
  Employee,
  Recommendation,
  RecommendationFactor,
  Skill,
} from "@/lib/types"

interface CatalogEntry {
  activityId: string
  title: string
  description: string
  format: ActivityFormat
  durationHours: number
  expectedLevelGain: number
}

// Curated development activities the bank currently runs, keyed by the skill
// they primarily develop. This mirrors a real L&D catalog table.
const CATALOG: Record<string, CatalogEntry> = {
  "Работа с возражениями": {
    activityId: "act-102",
    title: "Работа с возражениями: продвинутый уровень",
    description: "Тренинг по отработке сложных возражений клиентов в рознице.",
    format: "online",
    durationHours: 8,
    expectedLevelGain: 1,
  },
  "Наставничество": {
    activityId: "act-mentor",
    title: "Школа наставников банка",
    description: "Программа подготовки внутренних наставников для новых сотрудников.",
    format: "offline",
    durationHours: 12,
    expectedLevelGain: 2,
  },
  "Финансовое моделирование": {
    activityId: "act-201",
    title: "Финансовое моделирование для аналитиков",
    description: "Углублённый курс по построению финансовых моделей корпоративных заёмщиков.",
    format: "offline",
    durationHours: 24,
    expectedLevelGain: 2,
  },
  "Python для анализа данных": {
    activityId: "act-202",
    title: "Python для банковских аналитиков",
    description: "Практический курс автоматизации аналитики на Python.",
    format: "online",
    durationHours: 20,
    expectedLevelGain: 2,
  },
  "Стресс-тестирование портфеля": {
    activityId: "act-301",
    title: "Стресс-тестирование кредитного портфеля",
    description: "Методология стресс-тестирования розничного и корпоративного портфеля.",
    format: "offline",
    durationHours: 20,
    expectedLevelGain: 2,
  },
  "Data Storytelling": {
    activityId: "act-302",
    title: "Data Storytelling для аналитиков",
    description: "Визуализация и презентация аналитических выводов для руководства.",
    format: "online",
    durationHours: 12,
    expectedLevelGain: 2,
  },
  "Кибербезопасность": {
    activityId: "act-401",
    title: "Кибербезопасность для сотрудников банка",
    description: "Обязательный курс по цифровой гигиене и защите банковских систем.",
    format: "online",
    durationHours: 6,
    expectedLevelGain: 1,
  },
  "Архитектура банковских систем": {
    activityId: "act-402",
    title: "Архитектура банковских ИТ-систем",
    description: "Углублённый курс по архитектуре систем дистанционного банковского обслуживания.",
    format: "offline",
    durationHours: 24,
    expectedLevelGain: 2,
  },
  "Кадровая аналитика": {
    activityId: "act-501",
    title: "Кадровая аналитика на практике",
    description: "Работа с HR-метриками и дашбордами для бизнес-партнёров.",
    format: "online",
    durationHours: 10,
    expectedLevelGain: 2,
  },
  "Управление кадровым резервом": {
    activityId: "act-502",
    title: "Управление кадровым резервом",
    description: "Методология формирования и развития кадрового резерва банка.",
    format: "offline",
    durationHours: 16,
    expectedLevelGain: 2,
  },
  "Управление командой": {
    activityId: "act-601",
    title: "Лидерство нового уровня",
    description: "Программа развития управленческих навыков для будущих руководителей групп.",
    format: "offline",
    durationHours: 24,
    expectedLevelGain: 2,
  },
  "Антифрод-мониторинг": {
    activityId: "act-702",
    title: "Антифрод-мониторинг транзакций",
    description: "Практикум по выявлению подозрительных операций и типовых схем мошенничества.",
    format: "online",
    durationHours: 14,
    expectedLevelGain: 2,
  },
  "Требования 115-ФЗ": {
    activityId: "act-701",
    title: "Требования 115-ФЗ: обновление 2026",
    description: "Актуализация знаний по антиотмывочному законодательству.",
    format: "online",
    durationHours: 6,
    expectedLevelGain: 1,
  },
  "Продуктовая аналитика": {
    activityId: "act-801",
    title: "Продуктовая аналитика для цифровых команд",
    description: "Метрики продукта, воронки и A/B-тесты для цифровых сервисов банка.",
    format: "offline",
    durationHours: 20,
    expectedLevelGain: 2,
  },
}

function fallbackCatalogEntry(skillName: string): CatalogEntry {
  return {
    activityId: `act-idp-${skillName.toLowerCase().replace(/\s+/g, "-")}`,
    title: `Индивидуальный план развития: «${skillName}»`,
    description: "Точечная программа развития под конкретный разрыв в навыке.",
    format: "mixed",
    durationHours: 8,
    expectedLevelGain: 1,
  }
}

function daysUntil(isoDate: string): number {
  const diff = new Date(isoDate).getTime() - Date.now()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

function buildFactors(skill: Skill, employee: Employee, catalogEntry: CatalogEntry): RecommendationFactor[] {
  const gap = skill.requiredLevel - skill.currentLevel
  const daysLeft = daysUntil(employee.grade.targetDeadline)

  const factors: RecommendationFactor[] = [
    {
      label: skill.critical ? "Критичный разрыв в навыке" : "Разрыв в навыке",
      detail: `Текущий уровень ${skill.currentLevel} из 5, требуется ${skill.requiredLevel}. ${
        skill.critical ? "Навык отмечен как критичный для целевого грейда." : "Навык входит в профиль целевого грейда."
      }`,
    },
    {
      label: "Срок достижения цели",
      detail:
        daysLeft > 0
          ? `До дедлайна цели «${employee.grade.target}» осталось ${daysLeft} дн. Мероприятие закрывает часть требуемого разрыва за один заход.`
          : `Дедлайн цели «${employee.grade.target}» уже прошёл — мероприятие поможет наверстать отставание.`,
    },
    {
      label: "Формат и нагрузка",
      detail: `Формат: ${
        catalogEntry.format === "online" ? "онлайн" : catalogEntry.format === "offline" ? "очно" : "смешанный"
      }, ${catalogEntry.durationHours} ч — совместимо с текущей загрузкой сотрудника.`,
    },
  ]

  return factors
}

function scoreRecommendation(skill: Skill, employee: Employee): number {
  const gap = skill.requiredLevel - skill.currentLevel
  const daysLeft = daysUntil(employee.grade.targetDeadline)

  let score = 50 + gap * 10
  if (skill.critical) score += 15
  if (daysLeft > 0 && daysLeft < 150) score += 10

  return Math.max(0, Math.min(100, score))
}

/**
 * Derives 1–3 activity recommendations for an employee from their current
 * skill gaps. A skill only produces a recommendation when currentLevel is
 * below requiredLevel; critical and larger gaps are prioritized.
 */
export function buildRecommendationsForEmployee(employee: Employee): Recommendation[] {
  const gappedSkills = employee.skills
    .filter((skill) => skill.requiredLevel > skill.currentLevel)
    .sort((a, b) => {
      if (a.critical !== b.critical) return a.critical ? -1 : 1
      return b.requiredLevel - b.currentLevel - (a.requiredLevel - a.currentLevel)
    })
    .slice(0, 3)

  return gappedSkills.map((skill) => {
    const catalogEntry = CATALOG[skill.name] ?? fallbackCatalogEntry(skill.name)
    const expectedLevel = Math.min(5, skill.currentLevel + catalogEntry.expectedLevelGain)

    return {
      id: `rec-${employee.id}-${skill.id}`,
      employeeId: employee.id,
      activityId: catalogEntry.activityId,
      title: catalogEntry.title,
      description: catalogEntry.description,
      score: scoreRecommendation(skill, employee),
      factors: buildFactors(skill, employee, catalogEntry),
      skillLevels: {
        skillName: skill.name,
        currentLevel: skill.currentLevel,
        expectedLevel,
        requiredLevel: skill.requiredLevel,
      },
      format: catalogEntry.format,
      durationHours: catalogEntry.durationHours,
      startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
    }
  })
}
