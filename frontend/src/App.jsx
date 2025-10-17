// frontend/src/App.jsx
// Purpose: Calendar + lessons list + player based on filename pattern: <kacinciders>-<tarih>-<ders>

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchVideos, uploadScan } from './api/client.js';
import VideoGrid from './components/VideoGrid.jsx';
import CalendarView from './components/CalendarView.jsx';

// Parse filename: "<kacinciders>-<tarih>-<ders>"
function parseMeta(filename) {
  // Not: macOS dosya adında '/' kullanılamaz. Bu yüzden tarih ayraçları olarak -, _, . destekliyoruz.
  // Örnekler: 1-17-10-2025-Matematik.mp4, 2-17_10_2025-Fizik.webm, 3-17.10.2025-Kimya.mp4
  const name = filename.replace(/\.[^.]+$/, '');
  const m = name.match(/^(\d+)[-](\d{1,2})[._-](\d{1,2})[._-](\d{4})-(.+)$/);
  if (!m) return null;
  const index = Number(m[1]);
  const dd = String(m[2]).padStart(2, '0');
  const mm = String(m[3]).padStart(2, '0');
  const yyyy = m[4];
  const lesson = m[5].trim();
  const isoDate = `${yyyy}-${mm}-${dd}`;
  return { index, isoDate, lesson };
}

function formatIsoToTR(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export default function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedMeta, setSelectedMeta] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const rows = await fetchVideos();
      console.log('[App] fetched videos:', rows);
      setVideos(rows);
    } catch (e) {
      setError(String(e?.message || 'Videolar yüklenemedi'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUploadScan() {
    try {
      setUploading(true);
      setError('');
      const res = await uploadScan();
      console.log('[App] uploadScan result:', res);
      await load();
    } catch (e) {
      console.error('[App] uploadScan error:', e);
      setError(String(e?.message || 'Yükleme hatası'));
    } finally {
      setUploading(false);
    }
  }

  // Calendar marks: ONLY filename-based dates (no created-at fallback)
  const datesWithVideos = useMemo(() => {
    const set = new Set();
    videos.forEach((v) => {
      const meta = parseMeta(v.filename);
      if (meta) set.add(meta.isoDate);
    });
    console.log('[App] datesWithVideos:', Array.from(set.values()));
    return set;
  }, [videos]);

  // Lessons: ONLY filename-based dates (no created-at fallback)
  const lessonsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const list = [];
    videos.forEach((v) => {
      const meta = parseMeta(v.filename);
      if (meta && meta.isoDate === selectedDate) {
        list.push({ index: meta.index, lesson: meta.lesson, dateIso: meta.isoDate, video: v });
      }
    });
    list.sort((a, b) => a.index - b.index);
    console.log('[App] lessons for', selectedDate, list);
    return list;
  }, [videos, selectedDate]);

  const shouldHideRightPanel = selectedDate && lessonsForSelectedDate.length === 0;

  function openLesson(entry) {
    setSelectedVideo(entry.video);
    setSelectedMeta({ lesson: entry.lesson, index: isFinite(entry.index) ? entry.index : undefined, dateIso: entry.dateIso });
  }

  const filteredVideosForDate = useMemo(() => lessonsForSelectedDate.map((e) => e.video), [lessonsForSelectedDate]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">Video Gallery</h1>
          <div className="flex items-center gap-2">
            <button onClick={load} className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50" disabled={loading}>
              {loading ? 'Yükleniyor...' : 'Yenile'}
            </button>
            <button onClick={handleUploadScan} className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50" disabled={uploading}>
              {uploading ? 'Yükleniyor…' : 'Klasörü Tara & Yükle'}
            </button>
          </div>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <CalendarView datesWithVideos={datesWithVideos} onSelect={(d) => { console.log('[App] date selected', d); setSelectedDate(d); setSelectedVideo(null); setSelectedMeta(null); }} />
            {selectedDate && (
              <div className="bg-white rounded shadow p-3">
                <div className="font-semibold mb-2">{formatIsoToTR(selectedDate)}</div>
                {lessonsForSelectedDate.length === 0 ? (
                  <div className="text-sm text-gray-600">Bu tarihte video yok</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {lessonsForSelectedDate.map((e, i) => (
                      <button key={i} onClick={() => openLesson(e)} className="px-3 py-2 rounded border bg-gray-50 hover:bg-gray-100 text-left">
                        <div className="font-medium">{e.lesson}</div>
                        <div className="text-xs text-gray-600">{(isFinite(e.index) ? `${e.index}. Ders` : 'Ders')} • {formatIsoToTR(e.dateIso)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {!selectedDate ? (
              <div className="bg-white rounded shadow p-6 text-sm text-gray-600">Lütfen takvimden bir tarih seçin.</div>
            ) : shouldHideRightPanel ? (
              <div className="bg-white rounded shadow p-6 text-sm text-gray-600">Seçtiğiniz tarihte video yok.</div>
            ) : !selectedVideo ? (
              <VideoGrid videos={filteredVideosForDate} />
            ) : (
              <div className="bg-white rounded shadow p-3">
                <div className="font-semibold mb-1">{selectedMeta?.lesson || 'Ders'}</div>
                <div className="text-xs text-gray-600 mb-3">{selectedMeta?.index ? `${selectedMeta.index}. Ders • ` : ''}{formatIsoToTR(selectedMeta?.dateIso || '')}</div>
                <video className="w-full h-auto rounded" controls src={selectedVideo['optimized-url']} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
