import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function TrendLine({ data = [] }) {
  if (!data || data.length === 0) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No trend data</div>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top:5, right:10, left:-10, bottom:5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize:10, fill:'#666' }} />
        <YAxis tick={{ fontSize:11 }} />
        <Tooltip />
        <Legend iconSize={10} wrapperStyle={{ fontSize:11 }} />
        <Line type="monotone" dataKey="total"       stroke="#1565C0" strokeWidth={2} dot={false} name="Total" />
        <Line type="monotone" dataKey="compliant"   stroke="#2E7D32" strokeWidth={2} dot={false} name="Compliant" />
        <Line type="monotone" dataKey="violations"  stroke="#D32F2F" strokeWidth={2} dot={false} name="Violations" />
      </LineChart>
    </ResponsiveContainer>
  )
}
