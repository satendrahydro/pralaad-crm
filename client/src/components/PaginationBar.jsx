import React from 'react';

export default function PaginationBar({ totalItems, page, pageSize = 25, onPageChange, label = 'records' }) {
  if (!totalItems || totalItems <= pageSize) return null;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs">
      <span className="text-slate-600">
        Showing <strong className="text-slate-900">{start}–{end}</strong> of{' '}
        <strong className="text-slate-900">{totalItems.toLocaleString('en-IN')}</strong> {label}
        {' '}• Page <strong className="text-slate-900">{safePage}</strong> of{' '}
        <strong className="text-slate-900">{totalPages}</strong>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="px-3 py-1 bg-white border border-slate-300 rounded font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
        >
          ← Prev
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className="px-3 py-1 bg-white border border-slate-300 rounded font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
