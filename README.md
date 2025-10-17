# Local Video Uploader (Node.js + Express + React)

A full-stack app that scans local `.mp4` videos, converts to WebM, uploads to Supabase Storage, stores metadata in Postgres, and displays a gallery UI with date filtering.

## Tech
- Backend: Node.js + Express, `fluent-ffmpeg` + `ffmpeg-static`, `@supabase/supabase-js`
- Frontend: React (Vite) + Tailwind CSS
- Tests: Jest + Supertest

## Environment
Create `.env` at project root (do not commit):

```
SUPABASE_URL=https://isygsljzixaqtdqmdk.supabase.co
SUPABASE_KEY=<YOUR_ANON_KEY>
SUPABASE_SERVICE_KEY=<YOUR_SERVICE_ROLE_KEY>
VIDEOS_PATH=/Users/mecitmac/Desktop
PORT=3000
CONCURRENCY=3
```

## Database Schema & Policies

```sql
CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  optimized_url TEXT NOT NULL
);

-- public read for storage objects in videos bucket
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'videos');

-- allow backend service to insert to videos table
CREATE POLICY "Allow service inserts"
ON videos
FOR INSERT
USING (auth.role() = 'service_role');
```

## How to Run (dev)
1. Backend
   - `cd backend && npm install`
   - `cp ../.env ../.env` (fill keys)
   - `npm run dev`
2. Frontend
   - `cd ../frontend && npm install`
   - `npm run dev`

Backend runs at `http://localhost:3000`, API base `http://localhost:3000/api`.

## Example Requests
```bash
curl -X POST http://localhost:3000/api/videos/upload \
  -H "Content-Type: application/json" \
  -d '{"filePath":"/Users/mecitmac/Desktop/myclip.mp4"}'

curl "http://localhost:3000/api/videos?date=2025-10-16"
```

## Notes
- Never commit real keys. Service key is used server-side only.
- Concurrency is controlled via `CONCURRENCY` (default 3).
