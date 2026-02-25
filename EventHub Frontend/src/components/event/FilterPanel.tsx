import { useState } from 'react'
import type { EventFilters } from '../../types'

const CATEGORIES = [
  'Technology', 'Arts & Culture', 'Sports', 'Academic',
  'Social', 'Career', 'Health', 'Other'
]

interface FilterPanelProps {
  filters: EventFilters
  onChange: (filters: EventFilters) => void
}

export default function FilterPanel({ filters, onChange }: FilterPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-ink-900/5 shadow-card p-5 sticky top-24">
      <h3 className="font-serif text-lg text-ink-900 mb-4">Filters</h3>

      {/* Category */}
      <div className="mb-5">
        <p className="label mb-2">Category</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onChange({ ...filters, category: undefined })}
            className={`text-xs px-3 py-1.5 rounded-full border font-sans transition-all ${
              !filters.category
                ? 'bg-ink-900 text-gold border-ink-900'
                : 'border-ink-900/15 text-ink-600 hover:border-ink-900/30'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => onChange({ ...filters, category: filters.category === cat ? undefined : cat })}
              className={`text-xs px-3 py-1.5 rounded-full border font-sans transition-all ${
                filters.category === cat
                  ? 'bg-ink-900 text-gold border-ink-900'
                  : 'border-ink-900/15 text-ink-600 hover:border-ink-900/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="mb-5">
        <p className="label mb-2">Availability</p>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div
            onClick={() => onChange({ ...filters, available: !filters.available })}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
              filters.available ? 'bg-gold' : 'bg-ink-900/15'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              filters.available ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </div>
          <span className="text-sm text-ink-700 font-sans">Available seats only</span>
        </label>
      </div>

      {/* Trending */}
      <div className="mb-5">
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div
            onClick={() => onChange({ ...filters, trending: !filters.trending })}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
              filters.trending ? 'bg-gold' : 'bg-ink-900/15'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              filters.trending ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </div>
          <span className="text-sm text-ink-700 font-sans">🔥 Trending only</span>
        </label>
      </div>

      {/* Date range */}
      <div className="mb-5">
        <p className="label mb-2">Date Range</p>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-ink-600/60 font-sans mb-1 block">From</label>
            <input
              type="date"
              value={filters.dateFrom?.split('T')[0] || ''}
              onChange={e => onChange({ ...filters, dateFrom: e.target.value ? e.target.value + 'T00:00:00' : undefined })}
              className="input-field text-sm py-2"
            />
          </div>
          <div>
            <label className="text-xs text-ink-600/60 font-sans mb-1 block">To</label>
            <input
              type="date"
              value={filters.dateTo?.split('T')[0] || ''}
              onChange={e => onChange({ ...filters, dateTo: e.target.value ? e.target.value + 'T23:59:59' : undefined })}
              className="input-field text-sm py-2"
            />
          </div>
        </div>
      </div>

      {/* Clear */}
      {(filters.category || filters.available || filters.trending || filters.dateFrom || filters.dateTo) && (
        <button
          onClick={() => onChange({ page: 0, size: 10 })}
          className="w-full text-sm text-crimson font-sans hover:text-crimson/70 transition-colors py-2"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}