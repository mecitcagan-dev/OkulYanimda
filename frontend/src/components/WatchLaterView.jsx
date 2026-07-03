// frontend/src/components/WatchLaterView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { getWatchLater, removeFromWatchLater } from '../api/playlistStorage.js';
import { getProgress } from '../api/videoProgress.js';
import VideoPlayer from './VideoPlayer.jsx';
import Toast from './Toast.jsx';

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

// Lazy loading video thumbnail with progress
function LazyWatchLaterThumbnail({ video, index, isActive, progress, onClick, onRemove }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const meta = parseMeta(video.filename);
  const progressPercentage = progress ? progress.percentage : 0;

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`flex gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 transition group relative ${isActive ? 'bg-blue-50 border-blue-300 border' : 'border border-transparent'
        }`}
    >
      <div className="w-32 aspect-video bg-gray-200 rounded flex-shrink-0 relative">
        {!thumbnailLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <svg className="w-8 h-8 text-gray-600 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}

        {isVisible && (
          <video
            src={`${video['optimized-url']}#t=2`}
            className="w-full h-full object-cover rounded"
            preload="metadata"
            onLoadedData={() => setThumbnailLoaded(true)}
            muted
            playsInline
          />
        )}

        {progressPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
            <div
              className="h-full bg-red-600"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}

        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
          {index + 1}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate text-gray-800">
          {meta?.lesson || 'Ders'}
        </div>
        <div className="text-xs text-gray-600 truncate">
          {meta?.index ? `${meta.index}. Ders • ` : ''}
          {formatIsoToTR(meta?.isoDate || '')}
        </div>
      </div>

      <button
        onClick={onRemove}
        className="absolute bottom-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-red-600 transition"
        title="Listeden çıkar"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function WatchLaterView() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [cinemaMode, setCinemaMode] = useState(false);

  useEffect(() => {
    const watchLaterVideos = getWatchLater();
    setVideos(watchLaterVideos);

    if (watchLaterVideos.length > 0 && !selectedVideo) {
      const firstVideo = watchLaterVideos[0];
      const meta = parseMeta(firstVideo.filename);
      setSelectedVideo(firstVideo);
      setSelectedMeta({
        lesson: meta?.lesson || 'Ders',
        index: meta?.index,
        dateIso: meta?.isoDate,
      });
    }
  }, []);

  const handleVideoSelect = (video) => {
    const meta = parseMeta(video.filename);
    setSelectedVideo(video);
    setSelectedMeta({
      lesson: meta?.lesson || 'Ders',
      index: meta?.index,
      dateIso: meta?.isoDate,
    });
  };

  const handleRemoveVideo = (videoUrl, e) => {
    e.stopPropagation();
    removeFromWatchLater(videoUrl);
    const updated = getWatchLater();
    setVideos(updated);
    setToastMessage('Video listeden çıkarıldı');

    if (selectedVideo?.['optimized-url'] === videoUrl) {
      if (updated && updated.length > 0) {
        handleVideoSelect(updated[0]);
      } else {
        setSelectedVideo(null);
        setSelectedMeta(null);
      }
    }
  };

  const closePlayer = () => {
    setSelectedVideo(null);
    setSelectedMeta(null);
    setCinemaMode(false);
  };

  const handleNextVideo = () => {
    if (!selectedVideo || !videos) return;
    const currentIndex = videos.findIndex(v => v['optimized-url'] === selectedVideo['optimized-url']);
    if (currentIndex < videos.length - 1) {
      handleVideoSelect(videos[currentIndex + 1]);
    }
  };

  const handlePreviousVideo = () => {
    if (!selectedVideo || !videos) return;
    const currentIndex = videos.findIndex(v => v['optimized-url'] === selectedVideo['optimized-url']);
    if (currentIndex > 0) {
      handleVideoSelect(videos[currentIndex - 1]);
    }
  };

  const getNextVideo = () => {
    if (!selectedVideo || !videos) return null;
    const currentIndex = videos.findIndex(v => v['optimized-url'] === selectedVideo['optimized-url']);
    if (currentIndex < videos.length - 1) {
      return videos[currentIndex + 1];
    }
    return null;
  };

  const getPreviousVideo = () => {
    if (!selectedVideo || !videos) return null;
    const currentIndex = videos.findIndex(v => v['optimized-url'] === selectedVideo['optimized-url']);
    if (currentIndex > 0) {
      return videos[currentIndex - 1];
    }
    return null;
  };

  if (videos.length === 0) {
    return (
      <div className="bg-white rounded shadow p-6 text-center text-gray-500">
        Daha sonra izlenecek video yok
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cinemaMode ? 'lg:col-span-3' : 'lg:col-span-2'}>
          {selectedVideo ? (
            <div className="bg-white rounded shadow p-3">
              <VideoPlayer
                src={selectedVideo['optimized-url']}
                title={selectedMeta?.lesson || 'Ders'}
                subtitle={`${selectedMeta?.index ? `${selectedMeta.index}. Ders • ` : ''}${formatIsoToTR(selectedMeta?.dateIso || '')}`}
                onClose={closePlayer}
                cinemaMode={cinemaMode}
                onCinemaModeToggle={() => setCinemaMode(!cinemaMode)}
                onNext={handleNextVideo}
                onPrevious={handlePreviousVideo}
                nextVideo={getNextVideo()}
                previousVideo={getPreviousVideo()}
              />
            </div>
          ) : (
            <div className="bg-white rounded shadow p-6 text-center text-gray-500">
              Video seçin
            </div>
          )}
        </div>

        {!cinemaMode && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-4">Daha Sonra İzle</h3>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {videos.map((video, idx) => {
                  const isActive = selectedVideo?.['optimized-url'] === video['optimized-url'];
                  const progress = getProgress(video['optimized-url']);

                  return (
                    <LazyWatchLaterThumbnail
                      key={video['optimized-url'] || idx}
                      video={video}
                      index={idx}
                      isActive={isActive}
                      progress={progress}
                      onClick={() => handleVideoSelect(video)}
                      onRemove={(e) => handleRemoveVideo(video['optimized-url'], e)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  );
}