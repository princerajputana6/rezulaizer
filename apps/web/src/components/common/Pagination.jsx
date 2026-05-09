'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Client-side pagination hook for an in-memory list.
 *
 * Usage:
 *   const { paged, controls } = usePagination(items, { pageSize: 10 });
 *   ...render `paged`...
 *   {controls}
 */
export function usePagination(items, { pageSize = 10, sizeOptions = [10, 20, 50, 100] } = {}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);

  const total = Array.isArray(items) ? items.length : 0;
  const pages = Math.max(1, Math.ceil(total / size));

  // Clamp page when items shrink (e.g. after a refetch / filter change)
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const paged = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const start = (page - 1) * size;
    return items.slice(start, start + size);
  }, [items, page, size]);

  const controls = (
    <Pagination
      page={page}
      pages={pages}
      total={total}
      size={size}
      sizeOptions={sizeOptions}
      onPage={setPage}
      onSize={(s) => { setSize(s); setPage(1); }}
    />
  );

  return { paged, controls, page, pages, total, size };
}

export function Pagination({ page, pages, total, size, sizeOptions, onPage, onSize }) {
  if (total === 0) return null;
  const start = (page - 1) * size + 1;
  const end = Math.min(page * size, total);

  return (
    <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between flex-wrap gap-3 text-sm">
      <div className="text-gray-600">
        Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{total}</strong>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-gray-600 text-xs">
          Rows
          <select
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-xs"
          >
            {sizeOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-2 py-1 rounded border border-gray-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-gray-700">
            Page <strong>{page}</strong> / {pages}
          </span>
          <button
            onClick={() => onPage(Math.min(pages, page + 1))}
            disabled={page >= pages}
            className="px-2 py-1 rounded border border-gray-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
