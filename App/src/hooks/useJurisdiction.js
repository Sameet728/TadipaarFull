import { useAuth } from '../context/AuthContext'

export const useJurisdiction = () => {
  const { auth } = useAuth()
  if (!auth) return {}
  const { role, zoneId, acpAreaId, policeStationId } = auth
  if (role === 'CP')  return {}
  if (role === 'DCP') return { zoneId }
  if (role === 'ACP') return { zoneId, acpAreaId }
  if (role === 'PS')  return { zoneId, acpAreaId, policeStationId }
  return {}
}

export const useRoleLabel = () => {
  const { auth } = useAuth()
  if (!auth) return ''
  const { role, zoneName, acpName, psName } = auth
  if (role === 'CP')  return 'Commissioner of Police — Pimpri Chinchwad'
  if (role === 'DCP') return `DCP — ${zoneName || 'Zone'}`
  if (role === 'ACP') return `ACP — ${acpName || 'ACP Area'}`
  if (role === 'PS')  return `Police Station — ${psName || 'PS'}`
  return ''
}
