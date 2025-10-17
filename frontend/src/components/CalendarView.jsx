// frontend/src/components/CalendarView.jsx
// Purpose: Month calendar highlighting dates that have videos; emits selected date.

import React, { useMemo, useState } from 'react';

function ymd(year, monthZeroBased, day) {
  const yyyy = String(year);
  const mm = String(monthZeroBased + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * @param {{ datesWithVideos: Set<string>, onSelect: (date: string) => void }} props
 * datesWithVideos: set of ISO date strings (YYYY-MM-DD)
 */
export default function CalendarView({ datesWithVideos, onSelect }) {
  const [current, setCurrent] = useState(new Date());

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = useMemo(() => {
    const items = [];
    for (let i = 0; i < startWeekday; i++) items.push(null);
    for (let d = 1; d <= daysInMonth; d++) items.push(d);
    return items;
  }, [startWeekday, daysInMonth]);

  function selectDate(day) {
    const dateStr = ymd(year, month, day);
    onSelect(dateStr);
  }

  function hasVideos(day) {
    const dateStr = ymd(year, month, day);
    return datesWithVideos?.has(dateStr);
  }

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <button className="px-2 py-1 border rounded" onClick={() => setCurrent(new Date(year, month - 1, 1))}>
          ◀
        </button>
        <div className="font-semibold">{current.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
        <button className="px-2 py-1 border rounded" onClick={() => setCurrent(new Date(year, month + 1, 1))}>
          ▶
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {['Paz','Pts','Sal','Çar','Per','Cum','Cts'].map((d) => (
          <div key={d} className="text-xs text-gray-600">{d}</div>
        ))}
        {cells.map((day, idx) => (
          <div key={idx} className="h-10">
            {day ? (
              <button
                onClick={() => selectDate(day)}
                className={`w-full h-full rounded border ${hasVideos(day) ? 'bg-blue-100 border-blue-300' : 'bg-gray-50'}`}
              >
                {day}
              </button>
            ) : (
              <div />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
