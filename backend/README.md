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

## Explainable hybrid recommendation engine

Rule-based scoring — основа решения: он локально отбирает и ранжирует top 8 по
effective skills, skill gaps, critical skills, career goal, prerequisites,
доступности, истории участия и `gain`/`max_level`. Каждая рекомендация содержит
подтверждённые объяснимые факторы. NVIDIA NIM — только необязательное расширение,
которое может выбрать порядок deterministic top 3. Eligibility, score, gaps, evidence и все
тексты факторов рассчитывает только backend. В NIM передаются только event ID,
название, score и подтверждённые evidence ID/facts — без профиля сотрудника,
истории, персональных данных и ключа. Ответ проходит строгую Pydantic-валидацию;
LLM не может создать событие или факт.

Создайте `backend/.env` по шаблону `.env.example` и укажите ключ NVIDIA. Значения
операционной системы имеют приоритет. При отсутствии ключа, timeout, сетевой/HTTP
ошибке или невалидном ответе используется deterministic top 3. Успешные ответы
кэшируются в памяти по сотруднику, модели и fingerprint top-8; повторный запрос
даёт безопасный лог `recommendation_source=cache result=success`.

Ручная проверка (не запускайте без ключа):

```powershell
.\.venv\Scripts\python.exe scripts/check_nvidia.py
```

После успешной проверки запустите backend, вызовите recommendations для сотрудника
и проверьте `recommendation_source=nvidia result=success` в логе. Повторите тот же
запрос: ожидается `recommendation_source=cache result=success` без нового NIM-вызова.

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
