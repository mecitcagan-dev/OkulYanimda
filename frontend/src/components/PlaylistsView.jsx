// frontend/src/components/PlaylistsView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { getPlaylists, deletePlaylist } from '../api/playlistStorage.js';
import Toast from './Toast.jsx';

// Lazy loading playlist card
function LazyPlaylistCard({ playlist, onSelect, onDelete }) {
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

  return (
    <div
      ref={ref}
      onClick={onSelect}
      className="border rounded-lg overflow-hidden hover:shadow-lg transition cursor-pointer group relative"
    >
      <button
        onClick={onDelete}
        className="absolute bottom-2 right-2 z-10 p-2 bg-black/70 text-white rounded-full hover:bg-red-600 transition"
        title="Playlist'i sil"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      <div className="aspect-video bg-gray-200 flex items-center justify-center relative">
        {playlist.videos.length > 0 ? (
          <>
            {!thumbnailLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <svg className="w-16 h-16 text-gray-600 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            )}
            {isVisible && (
              <video
                src={`${playlist.videos[0]['optimized-url']}#t=2`}
                className="w-full h-full object-cover"
                preload="metadata"
                onLoadedData={() => setThumbnailLoaded(true)}
                muted
                playsInline
              />
            )}
          </>
        ) : (
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-800 truncate">{playlist.name}</h3>
        <p className="text-sm text-gray-600">{playlist.videos.length} video</p>
      </div>
    </div>
  );
}

export default function PlaylistsView({ onSelectPlaylist }) {
  const [playlists, setPlaylists] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [gridColumns, setGridColumns] = useState(3);

  useEffect(() => {
    setPlaylists(getPlaylists());
  }, []);

  const handleDelete = (playlistId, playlistName, e) => {
    e.stopPropagation();
    deletePlaylist(playlistId);
    setPlaylists(getPlaylists());
    setToastMessage(`"${playlistName}" silindi`);
  };

  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  }[gridColumns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <>
      <div className="bg-white rounded shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Playlistlerim</h2>

          <div className="flex items-center gap-2 bg-gray-100 rounded p-1">
            <button
              onClick={() => setGridColumns(1)}
              className={`p-2 rounded transition ${gridColumns === 1
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
              title="1 sütun"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" strokeWidth="2" rx="2" />
              </svg>
            </button>

            <button
              onClick={() => setGridColumns(2)}
              className={`p-2 rounded transition ${gridColumns === 2
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
              title="2 sütun"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="6" height="16" strokeWidth="2" rx="1" />
                <rect x="14" y="4" width="6" height="16" strokeWidth="2" rx="1" />
              </svg>
            </button>

            <button
              onClick={() => setGridColumns(3)}
              className={`p-2 rounded transition ${gridColumns === 3
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
              title="3 sütun"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="4" height="16" strokeWidth="2" rx="1" />
                <rect x="10" y="4" width="4" height="16" strokeWidth="2" rx="1" />
                <rect x="16" y="4" width="4" height="16" strokeWidth="2" rx="1" />
              </svg>
            </button>
          </div>
        </div>

        {playlists.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Henüz playlist oluşturmadınız
          </div>
        ) : (
          <div className={`grid ${gridColsClass} gap-4`}>
            {playlists.map((playlist) => (
              <LazyPlaylistCard
                key={playlist.id}
                playlist={playlist}
                onSelect={() => onSelectPlaylist(playlist)}
                onDelete={(e) => handleDelete(playlist.id, playlist.name, e)}
              />
            ))}
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