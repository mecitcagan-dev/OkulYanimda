// frontend/src/components/VideoGrid.jsx
// Purpose: Display a responsive grid of videos showing lesson name and date/index, not raw filename.

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
 * @param {{ videos: Array<{ filename: string, 'created-at': string, 'optimized-url': string }> }} props
 */
export default function VideoGrid({ videos }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((v, idx) => {
        const meta = parseMeta(v.filename);
        const title = meta?.lesson || 'Ders';
        const dateIso = meta?.isoDate || (() => { try { return new Date(v['created-at']).toISOString().slice(0,10); } catch { return ''; } })();
        const subtitle = `${meta?.index ? `${meta.index}. Ders • ` : ''}${formatIsoToTR(dateIso)}`;
        return (
          <div key={idx} className="bg-white rounded shadow p-3">
            <video className="w-full h-auto rounded" controls src={v['optimized-url']} />
            <div className="mt-2">
              <div className="text-sm font-medium truncate">{title}</div>
              <div className="text-xs text-gray-600">{subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
