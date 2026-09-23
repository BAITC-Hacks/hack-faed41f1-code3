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

## NVIDIA NIM

AI-переранжирование рекомендаций настраивается только через переменные окружения
backend (см. `.env.example`):

- `NVIDIA_API_KEY` — секретный ключ; при отсутствии NVIDIA не вызывается;
- `NVIDIA_MODEL` — идентификатор hosted NIM модели;
- `NVIDIA_BASE_URL` — необязательный URL, по умолчанию
  `https://integrate.api.nvidia.com/v1`.

Backend передаёт модели только восемь лучших допустимых кандидатов без персональных
данных. Общий лимит ожидания AI — 8 секунд; повтор выполняется один раз только при
сетевой ошибке или timeout. При любой ошибке, неверном JSON или неподтверждённых
фактах API возвращает прежние три deterministic-рекомендации. API-ключ никогда не
передаётся во frontend или API response.

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
- `POST /api/import` — multipart-поля `employees` и `activity_history`

Для совместимости с текущим frontend также доступны
`GET /api/employees/{employee_id}/activities`,
`POST /api/recommendations/{recommendation_id}/complete` и
`GET /api/hr-dashboard`.
