// frontend/src/App.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchVideos } from './api/client.js';
import VideoGrid from './components/VideoGrid.jsx';
import CalendarView from './components/CalendarView.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';

// Parse filename: "<kacinciders>-<tarih>-<ders>"
function parseMeta(filename) {
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
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [gridColumns, setGridColumns] = useState(3); // 1, 2, veya 3

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

  // Calendar marks: ONLY filename-based dates
  const datesWithVideos = useMemo(() => {
    const set = new Set();
    videos.forEach((v) => {
      const meta = parseMeta(v.filename);
      if (meta) set.add(meta.isoDate);
    });
    return set;
  }, [videos]);

  // Lessons: ONLY filename-based dates
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
    return list;
  }, [videos, selectedDate]);

  const shouldHideRightPanel = selectedDate && lessonsForSelectedDate.length === 0;

  function openLesson(entry) {
    setSelectedVideo(entry.video);
    setSelectedMeta({
      lesson: entry.lesson,
      index: isFinite(entry.index) ? entry.index : undefined,
      dateIso: entry.dateIso
    });
  }

  function handleVideoClick(video, meta) {
    setSelectedVideo(video);
    setSelectedMeta({
      lesson: meta?.lesson || 'Ders',
      index: meta?.index,
      dateIso: meta?.isoDate
    });
  }

  function closePlayer() {
    setSelectedVideo(null);
    setSelectedMeta(null);
  }

  const filteredVideosForDate = useMemo(() => lessonsForSelectedDate.map((e) => e.video), [lessonsForSelectedDate]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Tübitak Project Header */}
        <div className="bg-gray-100 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">BAKMTAL Tübitak Video Galerisi</h1>
              <p className="text-sm opacity-90 text-gray-600">Tübitak Projesi - Eğitim Video Yönetim Sistemi</p>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90 text-gray-800">Tübitak</div>
              <div className="text-xs opacity-75 text-gray-600">Türkiye Bilimsel ve Teknolojik Araştırma Kurumu</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-semibold text-gray-800">Video Yönetimi</h2>
          <div className="flex items-center gap-2">
            <button onClick={load} className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50" disabled={loading}>
              {loading ? 'Yükleniyor...' : 'Yenile'}
            </button>
          </div>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <CalendarView
              datesWithVideos={datesWithVideos}
              onSelect={(d) => {
                console.log('[App] date selected', d);
                setSelectedDate(d);
                setSelectedVideo(null);
                setSelectedMeta(null);
              }}
            />
            {selectedDate && (
              <div className="bg-white rounded shadow p-3">
                <div className="font-semibold mb-2">{formatIsoToTR(selectedDate)}</div>
                {lessonsForSelectedDate.length === 0 ? (
                  <div className="text-sm text-gray-600">Bu tarihte video yok</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {lessonsForSelectedDate.map((e, i) => (
                      <button
                        key={i}
                        onClick={() => openLesson(e)}
                        className="px-3 py-2 rounded border bg-gray-50 hover:bg-gray-100 text-left"
                      >
                        <div className="font-medium">{e.lesson}</div>
                        <div className="text-xs text-gray-600">
                          {(isFinite(e.index) ? `${e.index}. Ders` : 'Ders')} • {formatIsoToTR(e.dateIso)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {!selectedDate ? (
              <div className="bg-white rounded shadow p-6 text-sm text-gray-600">
                Lütfen takvimden bir tarih seçin.
              </div>
            ) : shouldHideRightPanel ? (
              <div className="bg-white rounded shadow p-6 text-sm text-gray-600">
                Seçtiğiniz tarihte video yok.
              </div>
            ) : selectedVideo ? (
              <div className="bg-white rounded shadow p-3">
                <VideoPlayer
                  src={selectedVideo['optimized-url']}
                  title={selectedMeta?.lesson || 'Ders'}
                  subtitle={`${selectedMeta?.index ? `${selectedMeta.index}. Ders • ` : ''}${formatIsoToTR(selectedMeta?.dateIso || '')}`}
                  onClose={closePlayer}
                />
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <h4 className="font-semibold text-gray-800 mb-2">Klavye Kısayolları</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div><kbd className="px-2 py-1 bg-white border rounded">Space</kbd> Play/Pause</div>
                    <div><kbd className="px-2 py-1 bg-white border rounded">→</kbd> +10 saniye</div>
                    <div><kbd className="px-2 py-1 bg-white border rounded">←</kbd> -10 saniye</div>
                    <div><kbd className="px-2 py-1 bg-white border rounded">↑</kbd> Ses +5%</div>
                    <div><kbd className="px-2 py-1 bg-white border rounded">↓</kbd> Ses -5%</div>
                    <div><kbd className="px-2 py-1 bg-white border rounded">M</kbd> Sessiz</div>
                    <div><kbd className="px-2 py-1 bg-white border rounded">F</kbd> Tam Ekran</div>
                  </div>
                </div>
              </div>
            ) : (
              <VideoGrid
                videos={filteredVideosForDate}
                onVideoClick={handleVideoClick}
                gridColumns={gridColumns}
                onGridColumnsChange={setGridColumns}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}