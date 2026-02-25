import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../api/Endpoints'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { useState } from 'react'
import type { Attendee } from '../types/index' // Adjust path if needed

function StatCard({ label, value, sub, color = 'text-ink-900' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="card p-5">
      <p className="text-xs text-ink-600/50 font-sans uppercase tracking-wide mb-2">{label}</p>
      <p className={`font-mono text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-ink-600/40 font-sans mt-1">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>()

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', Number(id)],
    queryFn: () => eventsApi.getAnalytics(Number(id)).then((r: { data: { data: any; }; }) => r.data.data ?? null),
    refetchInterval: 30000,
  })

  const { data: attendees } = useQuery({
    queryKey: ['attendees', Number(id)],
    queryFn: () => eventsApi.getAttendees(Number(id)).then(r => r.data.data ?? []),
    refetchInterval: 30000,
  })

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'REGISTERED' | 'WAITLIST' | 'CANCELLED'>('ALL')

  if (isLoading) {
    return (
      <div className="page-container py-10 space-y-6">
        <div className="skeleton h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  if (!analytics) return null

  const pieData = [
    { name: 'Registered', value: analytics.totalRegistrations, color: '#1a1f3a' },
    { name: 'Waitlist', value: analytics.waitlistCount, color: '#f5c842' },
    { name: 'Available', value: Math.max(0, analytics.availableSeats), color: '#e5e2d9' },
  ]

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link to={`/events/${id}`} className="text-sm text-ink-600/50 font-sans hover:text-ink-600 transition-colors mb-1 block">
            ← Back to event
          </Link>
          <h1 className="font-serif text-3xl text-ink-900">Analytics</h1>
          <p className="text-ink-600/60 font-sans text-sm mt-1">{analytics.eventTitle}</p>
        </div>
        <div className="bg-ink-900 text-gold px-4 py-2 rounded-xl font-mono text-sm font-medium">
          Live Data
          <span className="inline-block w-2 h-2 bg-sage rounded-full ml-2 animate-pulse" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Registrations"
          value={analytics.totalRegistrations}
          sub={`of ${analytics.maxParticipants} capacity`}
        />
        <StatCard
          label="Fill Rate"
          value={`${analytics.fillPercentage}%`}
          sub="of max capacity"
          color={analytics.fillPercentage >= 90 ? 'text-crimson' : analytics.fillPercentage >= 70 ? 'text-amber-600' : 'text-sage'}
        />
        <StatCard
          label="Waitlist"
          value={analytics.waitlistCount}
          sub="eager attendees"
          color={analytics.waitlistCount > 0 ? 'text-amber-600' : 'text-ink-600/40'}
        />
        <StatCard
          label="Avg. Rating"
          value={analytics.averageRating ? `★ ${analytics.averageRating.toFixed(1)}` : '—'}
          sub={analytics.ratingCount > 0 ? `${analytics.ratingCount} reviews` : 'No reviews yet'}
          color="text-gold-dark"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily registrations chart */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="section-title mb-6">Daily Registration Trend</h2>
          {analytics.dailyRegistrationCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={analytics.dailyRegistrationCounts}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a1f3a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1a1f3a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9df" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    fontFamily: 'DM Sans',
                    background: '#1a1f3a',
                    border: 'none',
                    borderRadius: 8,
                    color: '#faf9f6',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#1a1f3a"
                  strokeWidth={2}
                  fill="url(#colorReg)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-ink-600/30 font-sans text-sm">
              No registration data yet
            </div>
          )}
        </div>

        {/* Capacity pie */}
        <div className="card p-6">
          <h2 className="section-title mb-6">Capacity Overview</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontFamily: 'DM Sans',
                  borderRadius: 8,
                  border: '1px solid #ede9df',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, fontFamily: 'DM Sans' }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm font-sans">
              <span className="text-ink-600/60">Fill rate</span>
              <span className="font-mono font-bold text-ink-900">{analytics.fillPercentage}%</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${analytics.fillPercentage >= 100 ? 'bg-crimson' : analytics.fillPercentage >= 75 ? 'bg-amber-500' : 'bg-sage'}`}
                style={{ width: `${analytics.fillPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- NEW ATTENDEES TABLE --- */}
      <div className="card p-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title !mb-0">Attendee List</h2>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="input-field py-1.5 text-sm w-auto bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="REGISTERED">Registered Only</option>
            <option value="WAITLIST">Waitlist Only</option>
            <option value="CANCELLED">Cancelled Only</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-ink-900/10 text-ink-600/60 font-sans text-xs uppercase tracking-wider">
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Contact</th>
                <th className="pb-3 pr-4 font-medium">Course / Batch</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm font-sans">
              {attendees
                ?.filter((a: Attendee) => filterStatus === 'ALL' || a.status === filterStatus)
                .map((attendee: Attendee) => (
                  <tr key={attendee.userId} className="border-b border-ink-900/5 last:border-0 hover:bg-parchment-100/50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-ink-900">{attendee.name}</td>
                    <td className="py-3 pr-4 text-ink-600/80">{attendee.email}</td>
                    <td className="py-3 pr-4 text-ink-600/80">
                      {attendee.course || attendee.batch ? (
                        `${attendee.course || 'N/A'} • ${attendee.batch || 'N/A'}`
                      ) : (
                        <span className="text-ink-600/30 italic">Not provided</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`badge border text-[10px] ${
                        attendee.status === 'REGISTERED' ? 'badge-sage' : 
                        attendee.status === 'WAITLIST' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {attendee.status}
                      </span>
                    </td>
                  </tr>
              ))}
              {attendees?.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink-600/40 italic">
                    No attendees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ----------------------------- */}

    </div>
  )
}