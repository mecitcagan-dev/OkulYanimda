// frontend/src/components/VideoGrid.jsx
import React from 'react';

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

/**
 * @param {{ 
 *   videos: Array<{ filename: string, 'created-at': string, 'optimized-url': string }>, 
 *   onVideoClick?: (video, meta) => void,
 *   gridColumns?: number,
 *   onGridColumnsChange?: (cols: number) => void 
 * }} props
 */
export default function VideoGrid({ videos, onVideoClick, gridColumns = 3, onGridColumnsChange }) {
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  }[gridColumns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="bg-white rounded shadow p-4">
      {/* Header with layout controls */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Videolar ({videos.length})
        </h3>

        {/* Layout selector */}
        <div className="flex items-center gap-2 bg-gray-100 rounded p-1">
          <button
            onClick={() => onGridColumnsChange && onGridColumnsChange(1)}
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
            onClick={() => onGridColumnsChange && onGridColumnsChange(2)}
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
            onClick={() => onGridColumnsChange && onGridColumnsChange(3)}
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

      {/* Video grid */}
      <div className={`grid ${gridColsClass} gap-6`}>
        {videos.map((v, idx) => {
          const meta = parseMeta(v.filename);
          const title = meta?.lesson || 'Ders';
          const dateIso = meta?.isoDate || (() => {
            try {
              return new Date(v['created-at']).toISOString().slice(0, 10);
            } catch {
              return '';
            }
          })();
          const subtitle = `${meta?.index ? `${meta.index}. Ders • ` : ''}${formatIsoToTR(dateIso)}`;

          return (
            <div
              key={idx}
              className="bg-white rounded shadow overflow-hidden hover:shadow-lg transition cursor-pointer group"
              onClick={() => onVideoClick && onVideoClick(v, meta)}
            >
              <div className="relative aspect-video bg-gray-900">
                <video
                  className="w-full h-full object-cover"
                  src={v['optimized-url']}
                  preload="metadata"
                />
                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <div className="text-sm font-medium truncate text-gray-800">{title}</div>
                <div className="text-xs text-gray-600">{subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Bu tarihte video bulunamadı
        </div>
      )}
    </div>
  );
}