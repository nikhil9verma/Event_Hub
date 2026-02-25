export default function EventCardSkeleton() {
  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="skeleton h-44 w-full" />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex justify-between">
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-4 w-16" />
        </div>
        <div className="skeleton h-6 w-full" />
        <div className="skeleton h-4 w-3/4" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
        <div className="skeleton h-2 w-full rounded-full" />
        <div className="skeleton h-10 w-full rounded-lg mt-1" />
      </div>
    </div>
  )
}