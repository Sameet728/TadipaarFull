import React from 'react'

export default function StatCard({ label, value, icon: Icon, color = 'blue', sub, trend }) {
  const colors = {
    blue:   'bg-blue-50   border-blue-200   text-blue-600',
    green:  'bg-green-50  border-green-200  text-green-600',
    red:    'bg-red-50    border-red-200    text-red-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    gray:   'bg-gray-50   border-gray-200   text-gray-600',
  }
  const c = colors[color] || colors.blue
  return (
    <div className={`rounded-xl border-2 p-5 ${c} bg-white shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-800">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className={`mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs yesterday
        </div>
      )}
    </div>
  )
}
