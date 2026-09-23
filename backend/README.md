# Career Quest backend

FastAPI backend для первого этапа Career Quest. Исходный датасет автоматически
находится внутри `backend/data`, загружается и валидируется один раз при старте.
Изменения после завершения мероприятий хранятся только в памяти процесса.

## Требования

- Python 3.12 или новее

## Установка

Из каталога `backend`:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Запуск

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Для подключения frontend задайте ему `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api`.

## Тесты

```powershell
.\.venv\Scripts\python.exe -m pytest
```

## Основные маршруты

- `GET /health`
- `GET /api/employees`
- `GET /api/employees/{employee_id}`
- `GET /api/employees/{employee_id}/trajectory`
- `GET /api/employees/{employee_id}/recommendations`
- `POST /api/employees/{employee_id}/complete/{event_id}`
- `GET /api/hr/dashboard`

Для совместимости с текущим frontend также доступны
`GET /api/employees/{employee_id}/activities`,
`POST /api/recommendations/{recommendation_id}/complete` и
`GET /api/hr-dashboard`.
