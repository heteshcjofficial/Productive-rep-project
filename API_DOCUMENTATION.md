# ChronoSync REST API

Base path: `/api`. Requests and responses use JSON. Resource IDs are UUIDs. The API returns snake_case database fields and uses standard HTTP status codes.

## Health

### `GET /api/health`

Returns the service status, current timestamp, uptime, and Supabase connectivity.

```json
{
  "status": "ok",
  "timestamp": "2026-10-17T08:00:00.000Z",
  "uptime_seconds": 360,
  "database": { "configured": true, "connected": true }
}
```

The endpoint returns HTTP 200 when the service is running without database credentials (with `status: "degraded"`), and HTTP 503 when configured database connectivity fails.

## Tasks

### `GET /api/tasks?phase=dawn`

Lists tasks ordered by creation time. Optional `phase` accepts `dawn`, `peak`, `twilight`, or `nocturne`.

### `POST /api/tasks`

Creates a task. `title` and `phase` are required; `strain`, `duration`, `completed`, and `source` are optional.

```json
{
  "title": "Write the project plan",
  "phase": "peak",
  "strain": "high",
  "duration": "90m",
  "completed": false,
  "source": "User"
}
```

Strain is `low`, `med`, or `high`. Duration is a positive minute string up to `480m`; common values include `15m` and `90m`.

### `PUT /api/tasks/:id`

Partially updates `title`, `phase`, `strain`, `duration`, `completed`, or `source`.

### `DELETE /api/tasks/:id`

Deletes a task. Returns HTTP 204 when deleted and 404 when no row matched.

## Habits

### `GET /api/habits`

Lists habits in creation order.

### `POST /api/habits`

Creates a habit. `title` is required. `category`, `icon`, `streak`, and `days` are optional.

```json
{
  "title": "Morning sunlight",
  "category": "Biological",
  "icon": "☀️",
  "streak": 4,
  "days": [true, true, false, true, false, false, false]
}
```

`days` is exactly seven booleans in Monday-to-Sunday order.

### `PUT /api/habits/:id`

Partially updates `title`, `category`, `icon`, `streak`, or `days`.

### `DELETE /api/habits/:id`

Deletes a habit; returns HTTP 204 on success.

## Daily retrospective

### `GET /api/retrospective?date=2026-10-17`

Lists entries newest date first. The optional date filter uses `YYYY-MM-DD`.

### `POST /api/retrospective`

Creates or replaces the reflection for the selected date. `text` (or `reflection`) is optional; `mood` and `energy` are optional integers from 1 to 100.

```json
{
  "date": "2026-10-17",
  "text": "Protected the best focus window.",
  "mood": 78,
  "energy": 64
}
```

Omitting `date` uses the server's current UTC date. There is one row per date.

## Focus sessions

### `GET /api/focus-sessions`

Lists sessions newest first.

### `POST /api/focus-sessions`

Creates a focus session. `preset` is `gamma`, `alpha`, or `theta`; duration is required as `duration_minutes` (1–480) or `duration` (for example, `90m`). `completed`, `started_at`, and `notes` are optional.

```json
{
  "preset": "alpha",
  "duration_minutes": 90,
  "completed": true,
  "started_at": "2026-10-17T08:30:00.000Z",
  "notes": "Architecture sprint"
}
```

## Calendar events and protected blocks

### `GET /api/events?from=2026-10-17T00:00:00.000Z&to=2026-10-18T00:00:00.000Z`

Lists events by start time. `from` and `to` are optional ISO 8601 timestamps.

### `POST /api/events`

Creates an event. Requires `title`, `starts_at`, and `ends_at`; timestamps must be ISO 8601 and end after start. Optional fields: `provider` (`google`, `outlook`, `apple`, or `manual`), `provider_name`, `time`, `is_protected`, `cost` (`low`, `med`, `high`), and `attendees`.

```json
{
  "provider": "manual",
  "title": "Protected deep work",
  "starts_at": "2026-10-17T08:30:00.000Z",
  "ends_at": "2026-10-17T10:00:00.000Z",
  "is_protected": true,
  "cost": "high"
}
```

The API checks stored event times before creating a protected block and checks protected blocks before adding a colliding event. Overlap returns HTTP 409 with matching events. **This endpoint stores events; it does not connect to or sync Google Calendar or Outlook.** Provider OAuth and sync jobs are a separate integration.

### `DELETE /api/events/:id`

Deletes an event; returns HTTP 204 on success.

## Access limit

### `GET /api/access-limit`

Returns the singleton access policy, or a lifetime default if none has been saved.

### `POST /api/access-limit`

Persists a policy. `mode` is `lifetime` or `custom`. Custom mode requires `days_limit` (1–36500). Optional `start_date` is an ISO 8601 timestamp; optional `unlocked_features` is a string array.

```json
{
  "mode": "custom",
  "days_limit": 30,
  "unlocked_features": ["focus-studio", "analytics"]
}
```

## Errors

Errors use `{ "error": "stable_code", "message": "Human-readable explanation" }`. Common status codes: 400 invalid input, 403 CORS/database permission denied, 404 missing resource/route, 409 calendar conflict, 500 database/server error, 503 database not configured or unhealthy.

## Security note

`schema.sql` includes permissive `anon` policies to match the requested demo setup. Those policies make every row readable and writable by anyone who can call the API. Do not store real reflections or user-specific data with those policies. Before launch, add authentication and `user_id` ownership policies, and remove public anonymous access.
