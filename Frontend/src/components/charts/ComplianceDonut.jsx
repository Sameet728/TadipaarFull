import React from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ComplianceDonut({ compliant=0, nonCompliant=0, notCheckedIn=0 }) {
  const data = [
    { name: 'Compliant',      value: compliant,     color: '#2E7D32' },
    { name: 'Non-Compliant',  value: nonCompliant,  color: '#D32F2F' },
    { name: 'Not Checked In', value: notCheckedIn,  color: '#FF9800' },
  ].filter(d => d.value > 0)

  if (data.length === 0) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip formatter={(v, n) => [v, n]} />
        <Legend iconType="circle" iconSize={10} />
      </PieChart>
    </ResponsiveContainer>
  )
}
