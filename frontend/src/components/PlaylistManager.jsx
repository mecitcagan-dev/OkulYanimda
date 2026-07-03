// frontend/src/components/PlaylistManager.jsx
import React, { useState, useEffect } from 'react';
import { getPlaylists, createPlaylist, addVideoToPlaylist } from '../api/playlistStorage.js';

export default function PlaylistManager({ video, onClose, onSuccess }) {
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    setPlaylists(getPlaylists());
  }, []);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      const newPlaylist = createPlaylist(newPlaylistName.trim());
      setPlaylists([...playlists, newPlaylist]);
      setNewPlaylistName('');
      setShowCreateForm(false);
    }
  };

  const handleAddToPlaylist = (playlistId) => {
    addVideoToPlaylist(playlistId, video);
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Playlist'e Ekle</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate">{playlist.name}</div>
                <div className="text-xs text-gray-600">{playlist.videos.length} video</div>
              </div>
              <button
                onClick={() => handleAddToPlaylist(playlist.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex-shrink-0"
              >
                Ekle
              </button>
            </div>
          ))}

          {playlists.length === 0 && !showCreateForm && (
            <div className="text-center text-gray-500 py-8">
              Henüz playlist oluşturmadınız
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          {showCreateForm ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist adı"
                className="w-full px-3 py-2 border rounded"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreatePlaylist}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={!newPlaylistName.trim()}
                >
                  Oluştur
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewPlaylistName('');
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  İptal
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed rounded hover:bg-gray-50 text-gray-700"
            >
              + Yeni Playlist Oluştur
            </button>
          )}
        </div>
      </div>
    </div>
  );
}