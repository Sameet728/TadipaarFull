import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { fmtDate } from '../utils/helpers'

const StatusBadge = ({ stats }) => {
  if (!stats) return null
  if (stats.nonCompliantCount > 0)
    return <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold"><AlertTriangle size={11}/>Red Zone</span>
  if (stats.missedCheckinDays > 0)
    return <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold"><Clock size={11}/>{stats.missedCheckinDays}d missed</span>
  if (stats.compliantCount > 0)
    return <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold"><CheckCircle size={11}/>Compliant</span>
  return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">No data</span>
}

export default function CriminalTable({ data, loading, showStation = true }) {
  const navigate = useNavigate()
  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>
  if (!data || data.length === 0) return <div className="text-center py-12 text-gray-400">No records found</div>

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-police-900 text-white text-left">
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Login ID</th>
            <th className="px-4 py-3 font-semibold">Section</th>
            {showStation && <th className="px-4 py-3 font-semibold">Police Station</th>}
            <th className="px-4 py-3 font-semibold">Period</th>
            <th className="px-4 py-3 font-semibold">Check-ins</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Last Check-in</th>
            <th className="px-4 py-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c, i) => (
            <tr key={c._id || i} className={`border-t border-gray-100 hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {c.photoUrl ? <img src={c.photoUrl} className="w-7 h-7 rounded-full object-cover border border-gray-200" alt=""/> : <div className="w-7 h-7 rounded-full bg-police-600 flex items-center justify-center text-white text-xs font-bold">{c.name?.charAt(0)}</div>}
                  <span className="font-medium text-gray-800">{c.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.loginId || c.login_id}</td>
              <td className="px-4 py-3">
                {c.externmentSection || c.externment_section
                  ? <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-semibold">Sec {c.externmentSection || c.externment_section}</span>
                  : <span className="text-gray-300">—</span>}
              </td>
              {showStation && <td className="px-4 py-3 text-gray-500 text-xs">{c.policeStation || c.police_station || '—'}</td>}
              <td className="px-4 py-3 text-xs text-gray-500">
                <div>{fmtDate(c.periodFrom || c.period_from)}</div>
                <div className="text-gray-400">→ {fmtDate(c.periodTill || c.period_till)}</div>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 text-xs">
                  <span className="text-green-600 font-semibold">{c.stats?.compliantCount ?? 0}✓</span>
                  <span className="text-red-500 font-semibold">{c.stats?.nonCompliantCount ?? 0}✗</span>
                </div>
              </td>
              <td className="px-4 py-3"><StatusBadge stats={c.stats} /></td>
              <td className="px-4 py-3 text-xs text-gray-400">
                {c.stats?.lastCheckin ? new Date(c.stats.lastCheckin).toLocaleDateString('en-IN') : 'Never'}
              </td>
              <td className="px-4 py-3">
                <button onClick={() => navigate(`/criminals/${c._id}`)}
                  className="flex items-center gap-1 text-xs bg-police-600 text-white px-3 py-1.5 rounded-lg hover:bg-police-700">
                  <Eye size={13}/> View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
