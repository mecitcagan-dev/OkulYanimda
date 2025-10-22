# BAKMTAL Tübitak Video Galerisi (Node.js + Express + React)

Tübitak projesi kapsamında geliştirilmiş, yerel `.mp4` videoları tarayan, WebM formatına dönüştüren, Supabase Storage'a yükleyen, metadata'yı Postgres'te saklayan ve tarih filtreleme ile galeri arayüzü sunan tam yığın uygulama.

## Teknoloji
- Backend: Node.js + Express, `fluent-ffmpeg` + `ffmpeg-static`, `@supabase/supabase-js`
- Frontend: React (Vite) + Tailwind CSS
- Testler: Jest + Supertest

## Ortam Değişkenleri
Proje kök dizininde `.env` dosyası oluşturun (commit etmeyin):

```
SUPABASE_URL=https://isygsljzixaqtdqmdk.supabase.co
SUPABASE_KEY=<YOUR_ANON_KEY>
SUPABASE_SERVICE_KEY=<YOUR_SERVICE_ROLE_KEY>
VIDEOS_PATH=/Users/mecitmac/Desktop
PORT=3000
CONCURRENCY=3
```

## Veritabanı Şeması ve Politikaları

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

## Çalıştırma (geliştirme)
1. Backend
   - `cd backend && npm install`
   - `cp ../.env ../.env` (anahtarları doldurun)
   - `npm run dev`
2. Frontend
   - `cd ../frontend && npm install`
   - `npm run dev`

Backend `http://localhost:3000` adresinde çalışır, API tabanı `http://localhost:3000/api`.

## Örnek İstekler
```bash
curl -X POST http://localhost:3000/api/videos/upload \
  -H "Content-Type: application/json" \
  -d '{"filePath":"/Users/mecitmac/Desktop/myclip.mp4"}'

curl "http://localhost:3000/api/videos?date=2025-10-16"
```

## Notlar
- Gerçek anahtarları asla commit etmeyin. Servis anahtarı sadece sunucu tarafında kullanılır.
- Eşzamanlılık `CONCURRENCY` ile kontrol edilir (varsayılan 3).
