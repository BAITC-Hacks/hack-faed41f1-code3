Career Quest API
Общие правила
- Base URL: /api
- Формат: JSON
- Кодировка: UTF-8
- Даты: YYYY-MM-DD
- Все ошибки имеют единый формат.
Формат ошибки
{
  "error": {
    "code": "EMPLOYEE_NOT_FOUND",
    "message": "Employee E9999 was not found",
    "details": null
  }
}

Импорт проверочных данных
- Endpoint: `POST /api/import`
- Content-Type: `multipart/form-data`
- Поле `employees`: файл `employees.json`
- Поле `activity_history`: файл `activity_history.csv`
- Оба файла обязательны и применяются атомарно.

Успешный ответ
{
  "employeesImported": 1,
  "historyRecordsImported": 3,
  "totalEmployees": 201
}

Ошибка импорта использует общий формат ошибки. Поле `details` содержит `file`,
`line`, `employee_id` или `record_id`, если соответствующий идентификатор можно
определить.
