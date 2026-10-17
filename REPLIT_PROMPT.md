# ChronoSync backend implementation brief

Build and maintain the TypeScript Node.js REST API for ChronoSync, a circadian-oriented task and focus tracker, in the existing repository.

## Runtime and architecture

- Node.js 20+, TypeScript in `backend/src/server.ts`.
- Express 5 API mounted at `/api`; Supabase PostgreSQL through `@supabase/supabase-js`.
- Compile CommonJS to `backend/server.js`; run the API as a Node server.
- Use `PORT || 3000`, bind to `0.0.0.0`, and start even when Supabase credentials are absent.
- Keep the existing frontend files and make no unrelated UI changes.
- Read `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CORS_ORIGIN`, and `PORT` from the environment.

## Endpoints

- Tasks: GET/POST `/api/tasks`, PUT/DELETE `/api/tasks/:id`; phase filter; dawn, peak, twilight, nocturne; strain low/med/high; minute durations.
- Habits: GET/POST `/api/habits`, PUT/DELETE `/api/habits/:id`; category, emoji, streak, seven Monday–Sunday completion booleans.
- Retrospectives: GET/POST `/api/retrospective`; one entry per date with reflection text and optional 1–100 mood/energy scores.
- Focus sessions: GET/POST `/api/focus-sessions`; gamma, alpha, theta preset and sprint duration.
- Calendar events: GET/POST `/api/events`, DELETE `/api/events/:id`; timestamped blocks and collision checks for protected work.
- Access policy: GET/POST `/api/access-limit`; lifetime or custom day limit.
- Health: GET `/api/health`; include timestamp, uptime, and database status.

## Database and validation

- Keep the schema in `schema.sql`; enable RLS for each table.
- Validate API payloads and query parameters, use parameterized Supabase queries, return 404 for missing IDs and 409 for event collisions.
- Never log credential values.
- The requested SQL anon policies are demo-only and must be removed before storing private/user-specific records.
- Calendar provider fields are labels only: actual Google/Outlook OAuth sync is outside this implementation.

## Commands

- `npm run dev`: TypeScript watch server.
- `npm run build`: type-check and compile to `backend/server.js`.
- `npm test`: build and run API smoke tests.
