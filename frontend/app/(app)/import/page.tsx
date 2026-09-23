"use client"

import { FormEvent, useState } from "react"
import { AlertCircle, CheckCircle2, FileJson, FileSpreadsheet, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { importCareerQuestData } from "@/lib/api"
import { useEmployeeContext } from "@/lib/employee-context"
import { ApiError, type ImportResult } from "@/lib/types"


function detailLines(details: unknown): string[] {
  if (!details || typeof details !== "object") return []
  const value = details as Record<string, unknown>
  const location = [
    typeof value.file === "string" ? value.file : null,
    typeof value.line === "number" ? `строка ${value.line}` : null,
    typeof value.employee_id === "string" ? `employee_id ${value.employee_id}` : null,
    typeof value.record_id === "string" ? `record_id ${value.record_id}` : null,
  ].filter(Boolean)
  const prefix = location.length > 0 ? `${location.join(" · ")}: ` : ""

  if (Array.isArray(value.errors)) {
    return value.errors.map((error) => {
      if (!error || typeof error !== "object") return `${prefix}${String(error)}`
      const item = error as Record<string, unknown>
      const field = typeof item.field === "string" && item.field ? `${item.field}: ` : ""
      return `${prefix}${field}${String(item.message ?? "Ошибка валидации")}`
    })
  }
  if (Array.isArray(value.missing_fields)) {
    return [`${prefix}отсутствуют поля: ${value.missing_fields.join(", ")}`]
  }
  return location.length > 0 ? [location.join(" · ")] : []
}


export default function ImportPage() {
  const { retry } = useEmployeeContext()
  const [employeesFile, setEmployeesFile] = useState<File | null>(null)
  const [historyFile, setHistoryFile] = useState<File | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!employeesFile || !historyFile) return
    setIsPending(true)
    setError(null)
    setResult(null)
    try {
      const imported = await importCareerQuestData(employeesFile, historyFile)
      setResult(imported)
      retry()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Не удалось импортировать данные"))
    } finally {
      setIsPending(false)
    }
  }

  const errors = detailLines(error?.details)

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 overflow-y-auto p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">Импорт проверочных данных</h1>
        <p className="text-sm text-muted-foreground">
          Загрузите employees.json и activity_history.csv одним запросом. При ошибке данные не будут изменены.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Файлы датасета</CardTitle>
          <CardDescription>Формат должен соответствовать исходному Career Quest dataset.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground" htmlFor="employees-file">
              <span className="flex items-center gap-2"><FileJson className="size-4" /> employees.json</span>
              <input
                id="employees-file"
                type="file"
                accept=".json,application/json"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5"
                onChange={(event) => setEmployeesFile(event.target.files?.[0] ?? null)}
                disabled={isPending}
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-foreground" htmlFor="history-file">
              <span className="flex items-center gap-2"><FileSpreadsheet className="size-4" /> activity_history.csv</span>
              <input
                id="history-file"
                type="file"
                accept=".csv,text/csv"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5"
                onChange={(event) => setHistoryFile(event.target.files?.[0] ?? null)}
                disabled={isPending}
                required
              />
            </label>

            <Button type="submit" className="w-fit" disabled={!employeesFile || !historyFile || isPending}>
              {isPending ? <Spinner /> : <Upload data-icon="inline-start" />}
              {isPending ? "Импортируем..." : "Import"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Импорт завершён</AlertTitle>
          <AlertDescription>
            Добавлено сотрудников: {result.employeesImported}; записей истории: {result.historyRecordsImported}.
            Всего сотрудников: {result.totalEmployees}.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{error.code ?? "IMPORT_ERROR"}</AlertTitle>
          <AlertDescription>
            <p>{error.message}</p>
            {errors.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errors.map((line) => <li key={line}>{line}</li>)}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
