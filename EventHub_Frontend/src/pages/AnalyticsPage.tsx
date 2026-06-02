import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../api/Endpoints'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { useState } from 'react'
import type { Attendee } from '../types'

// Improved Stat Card
function StatCard({ label, value, sub, color = 'text-ink-900', icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon: string;
}) {
  return (
    <div className="bg-white border border-ink-900/5 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="absolute -right-4 -top-4 text-[80px] opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 pointer-events-none select-none">
        {icon}
      </div>
      <p className="text-xs text-ink-600/60 font-sans uppercase tracking-wider font-bold mb-3">{label}</p>
      <p className={`font-serif text-4xl mb-1 ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-ink-500 font-sans">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>()

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', Number(id)],
    queryFn: () => eventsApi.getAnalytics(Number(id)).then((r: any) => r.data.data ?? null),
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
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    )
  }

  if (!analytics) return null

  const pieData = [
    { name: 'Registered', value: analytics.totalRegistrations, color: '#1a1f3a' },
    { name: 'Waitlist', value: analytics.waitlistCount, color: '#d4af37' },
    { name: 'Available', value: Math.max(0, analytics.availableSeats), color: '#f3f2ef' },
  ]

  return (
    <div className="page-container py-10 animate-fade-in">

      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <Link to={`/events/${id}`} className="text-xs font-bold text-ink-400 uppercase tracking-wider hover:text-gold transition-colors mb-2 block">
            ← Back to Event Page
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl text-ink-900 leading-tight">Dashboard Overview</h1>
          <p className="text-ink-600 font-sans text-sm mt-1">{analytics.eventTitle}</p>
        </div>
        <div className="flex items-center gap-2 bg-sage/10 text-sage px-4 py-2 rounded-lg border border-sage/20 font-mono text-xs font-bold uppercase tracking-wider">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sage"></span>
          </span>
          Live Data
        </div>
      </div>

      {/* ─── STATS GRID ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <StatCard
          icon="🎫"
          label="Registrations"
          value={analytics.totalRegistrations}
          sub={`Out of ${analytics.maxParticipants} total capacity`}
        />
        <StatCard
          icon="📈"
          label="Fill Rate"
          value={`${analytics.fillPercentage}%`}
          sub="Current occupancy level"
          color={analytics.fillPercentage >= 90 ? 'text-crimson' : analytics.fillPercentage >= 70 ? 'text-amber-600' : 'text-sage'}
        />
        <StatCard
          icon="⏳"
          label="Waitlist"
          value={analytics.waitlistCount}
          sub="Attendees waiting for a spot"
          color={analytics.waitlistCount > 0 ? 'text-amber-600' : 'text-ink-400'}
        />
        {/* <StatCard
          icon="⭐"
          label="Avg. Rating"
          value={analytics.averageRating ? `${analytics.averageRating.toFixed(1)}` : '—'}
          sub={analytics.ratingCount > 0 ? `Based on ${analytics.ratingCount} reviews` : 'No reviews yet'}
          color="text-gold-dark"
        /> */}
      </div>

      {/* ─── CHARTS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-ink-900/5 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <h2 className="font-serif text-xl text-ink-900 mb-6">Registration Momentum</h2>
          {analytics.dailyRegistrationCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={analytics.dailyRegistrationCounts}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a1f3a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1a1f3a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f2ef" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8f8e8a' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: '#8f8e8a' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontFamily: 'inherit', background: '#1a1f3a', border: 'none', borderRadius: 8, color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#d4af37' }}
                />
                <Area type="monotone" dataKey="count" stroke="#1a1f3a" strokeWidth={3} fill="url(#colorReg)" activeDot={{ r: 6, fill: '#d4af37', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-ink-400 font-sans text-sm bg-ink-50/50 rounded-xl border border-dashed border-ink-200">
              <span className="text-3xl mb-2">📉</span>
              Waiting for first registration
            </div>
          )}
        </div>

        <div className="bg-white border border-ink-900/5 rounded-2xl p-6 shadow-sm flex flex-col">
          <h2 className="font-serif text-xl text-ink-900 mb-2">Capacity Breakdown</h2>
          <div className="flex-1 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: '20px' }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── ATTENDEES TABLE ─── */}
      <div className="bg-white border border-ink-900/5 rounded-2xl p-6 shadow-sm mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-serif text-xl text-ink-900">Attendee Roster</h2>
            <p className="text-xs text-ink-500 font-sans mt-1">Detailed view of all registered participants and their teams.</p>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-ink-50 border-none text-sm font-medium py-2 px-4 rounded-lg text-ink-900 focus:ring-2 focus:ring-gold outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="REGISTERED">✅ Registered Only</option>
            <option value="WAITLIST">⏳ Waitlist Only</option>
            <option value="CANCELLED">❌ Cancelled Only</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-ink-900/5">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-ink-50 text-ink-600/70 font-sans text-[10px] uppercase tracking-widest font-bold">
                <th className="py-4 pl-5 pr-4 rounded-tl-xl">Participant / Team</th>
                <th className="py-4 pr-4">Contact Info</th>
                <th className="py-4 pr-4">Academic Info</th>
                <th className="py-4 pr-5 rounded-tr-xl">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm font-sans divide-y divide-ink-900/5">
              {attendees
                ?.filter((a: Attendee) => filterStatus === 'ALL' || a.status === filterStatus)
                .map((attendee: Attendee) => (
                  <tr key={attendee.userId} className="hover:bg-ink-50/50 transition-colors align-top">

                    {/* Name & Team Column */}
                    <td className="py-4 pl-5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-ink-900 text-gold flex items-center justify-center text-xs font-serif font-bold">
                          {attendee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-ink-900 flex items-center gap-2">
                            {attendee.name}
                            {attendee.teammates && attendee.teammates.length > 0 && (
                              <span className="px-1.5 py-0.5 bg-gold/10 text-gold-dark text-[9px] rounded uppercase tracking-wider">Leader</span>
                            )}
                          </div>
                          {/* NEW: Show the Team Name */}
                          {attendee.teamName && (
                            <div className="text-[10px] font-medium text-gold-dark uppercase tracking-widest mt-0.5">
                              Team: {attendee.teamName}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Teammates List */}
                      {attendee.teammates && attendee.teammates.length > 0 && (
                        <div className="mt-3 ml-3.5 pl-4 border-l-2 border-ink-200 space-y-2">
                          {attendee.teammates.map((tm, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span className="text-ink-400">↳</span>
                              <span className="font-medium text-ink-700">{tm.name}</span>
                              <span className="text-ink-400 text-[10px] hidden sm:inline">({tm.email})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Contact Column */}
                    <td className="py-4 pr-4 text-ink-600 font-mono text-xs">{attendee.email}</td>

                    {/* Academic Column */}
                    <td className="py-4 pr-4 text-ink-600">
                      {attendee.course || attendee.batch ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{attendee.course || '—'}</span>
                          <span className="text-xs text-ink-400">Batch of {attendee.batch || '—'}</span>
                        </div>
                      ) : (
                        <span className="text-ink-300 italic text-xs">Not provided</span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="py-4 pr-5">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${attendee.status === 'REGISTERED' ? 'bg-sage/10 text-sage border-sage/20' :
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
                  <td colSpan={4} className="py-12 text-center text-ink-400">
                    <span className="text-3xl block mb-2">📭</span>
                    No attendees match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}