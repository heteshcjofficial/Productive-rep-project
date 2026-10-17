# ChronoSync backend setup

## Requirements

- Node.js 20 or newer
- A Supabase project

## Install and run locally

1. From the repository root, run `npm install`.
2. Copy `.env.example` to `.env`.
3. Add the Supabase project URL and public anon key to `.env`.
4. Run `schema.sql` in the Supabase SQL Editor.
5. Run `npm run dev` for the TypeScript development server, or `npm run build && npm start` for the compiled backend.

The server listens on `0.0.0.0` and uses `PORT` when set, otherwise port 3000. The API is under `/api`; the existing frontend is served from `public/`.

## Replit Secrets

Add these variables in Replit Secrets (do not commit real values):

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase public anon key
- `CORS_ORIGIN`: optional comma-separated browser origins, such as `https://your-domain.example`
- `PORT`: optional; Replit sets this for deployments

The app intentionally starts without Supabase credentials so the frontend can load. Database endpoints return HTTP 503 until both Supabase variables are configured. `/api/health` reports whether the database is connected.

## Deployment

The current repository branch does not include a Vercel serverless API wrapper. On Replit, the `.replit` run command starts the TypeScript development server; production can use `npm run build && npm start`. The compiled Node server serves the existing frontend from `public/` and exposes the API under `/api`.

## Security before real use

The provided SQL explicitly grants unrestricted `anon` access to all API tables to match the requested no-login setup. That means any visitor can read, create, change, or delete all records, including retrospective text. This is not safe for production personal data. Add Supabase Auth, attach a verified user ID to every row, scope RLS policies to `auth.uid()`, and remove the public `anon` policies before storing real user data. CORS does not replace authentication.

The calendar endpoints persist and compare event records but do not authenticate to Google Calendar or Outlook or sync their remote calendars.
