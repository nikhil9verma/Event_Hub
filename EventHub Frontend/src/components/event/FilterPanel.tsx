import type { EventFilters } from '../../types'

interface FilterPanelProps {
  filters: EventFilters
  onChange: (filters: Partial<EventFilters>) => void
  onClear: () => void // ─── NEW: Explicit clear function
}

const CATEGORIES = ['Technology', 'Cultural', 'Sports', 'Workshop', 'Seminar']

export default function FilterPanel({ filters, onChange, onClear }: FilterPanelProps) {
  
  return (
    <div className="bg-white border border-ink-900/10 rounded-2xl p-5 sticky top-24 shadow-sm">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-ink-900/5">
        <h3 className="font-serif text-lg font-bold text-ink-900">Filters</h3>
        {/* ─── UPDATED: Calls the new onClear prop ─── */}
        <button onClick={onClear} className="text-xs text-ink-500 hover:text-crimson font-medium">Clear All</button>
      </div>

      {/* ─── EVENT TYPE FILTER ─── */}
      <div className="mb-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-900/50 mb-3">Event Type</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="radio" name="eventType" 
              checked={!filters.eventType}
              onChange={() => onChange({ eventType: undefined })}
              className="accent-gold w-4 h-4"
            />
            <span className="text-sm text-ink-700 group-hover:text-ink-900">All Types</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="radio" name="eventType" 
              checked={filters.eventType === 'SOLO'}
              onChange={() => onChange({ eventType: 'SOLO' })}
              className="accent-gold w-4 h-4"
            />
            <span className="text-sm text-ink-700 group-hover:text-ink-900 flex items-center gap-1.5"><span className="text-xs">👤</span> Solo Events</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="radio" name="eventType" 
              checked={filters.eventType === 'TEAM'}
              onChange={() => onChange({ eventType: 'TEAM' })}
              className="accent-gold w-4 h-4"
            />
            <span className="text-sm text-ink-700 group-hover:text-ink-900 flex items-center gap-1.5"><span className="text-xs">👥</span> Team Events</span>
          </label>
          
        </div>
      </div>

      {/* ─── CATEGORY FILTER ─── */}
      <div className="mb-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-900/50 mb-3">Category</h4>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map(cat => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="radio" 
                name="category"
                checked={filters.category === cat}
                onChange={() => onChange({ category: cat })}
                className="accent-gold w-4 h-4"
              />
              <span className="text-sm text-ink-700 group-hover:text-ink-900">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ─── AVAILABILITY FILTER ─── */}
      <div className="mb-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-900/50 mb-3">Availability</h4>
        <label className="flex items-center gap-2 cursor-pointer group">
          <input 
            type="checkbox"
            checked={filters.available || false}
            onChange={e => onChange({ available: e.target.checked ? true : undefined })}
            className="accent-gold rounded border-ink-300 w-4 h-4"
          />
          <span className="text-sm text-ink-700 group-hover:text-ink-900">Open for Registration</span>
        </label>
      </div>

    </div>
  )
}