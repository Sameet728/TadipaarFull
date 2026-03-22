import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function BreakdownBar({ data = [], labelKey = 'name' }) {
  if (!data || data.length === 0) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>

  const chartData = data.map(d => ({
    name: (d[labelKey] || d.zone || d.acp_area || d.police_station || 'Unknown').replace('ACP ',''),
    Total:       parseInt(d.total) || 0,
    'Checked In': parseInt(d.checked_in_today) || 0,
    'Not In':    parseInt(d.not_checked_in) || 0,
    Violations:  parseInt(d.violations_today) || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top:5, right:10, left:-10, bottom:50 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize:10, fill:'#666' }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize:11 }} />
        <Tooltip />
        <Legend iconSize={10} wrapperStyle={{ fontSize:11 }} />
        <Bar dataKey="Total"       fill="#1565C0" radius={[3,3,0,0]} />
        <Bar dataKey="Checked In"  fill="#2E7D32" radius={[3,3,0,0]} />
        <Bar dataKey="Violations"  fill="#D32F2F" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
