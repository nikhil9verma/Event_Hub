export default function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-ink-900/5 overflow-hidden shadow-card">
      {/* Image */}
      <div className="skeleton h-40 w-full rounded-none" />

      {/* Body */}
      <div className="p-4 flex flex-col gap-3">
        {/* Title */}
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-4 w-3/5 rounded" />

        {/* Host row */}
        <div className="flex items-center gap-2">
          <div className="skeleton w-5 h-5 rounded-full" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>

        {/* Meta chips */}
        <div className="flex gap-2">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-5 w-14 rounded-full" />
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between mb-1.5">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
          <div className="skeleton h-1.5 w-full rounded-full" />
        </div>

        {/* CTA */}
        <div className="skeleton h-9 w-full rounded-xl mt-1" />
      </div>
    </div>
  )
}