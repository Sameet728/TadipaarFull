export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'N/A'
export const fmtDateTime = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'N/A'
export const fmtDateInput = d => d ? new Date(d).toISOString().split('T')[0] : ''
export const today = () => new Date().toISOString().split('T')[0]
export const daysAgo = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0] }
export const pct = (a,b) => b===0 ? 0 : Math.round((a/b)*100)
