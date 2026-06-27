import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'

export const useJurisdiction = () => {
  const { auth } = useAuth()
  if (!auth) return {}
  const { zoneId, acpAreaId, policeStationId } = auth
  const role = String(auth.role || '').toUpperCase()
  if (role === 'CP')  return {}
  if (role === 'DCP') return { zoneId }
  if (role === 'ACP') return { zoneId, acpAreaId }
  if (role === 'PS')  return { zoneId, acpAreaId, policeStationId }
  return {}
}

export const useRoleLabel = () => {
  const { auth } = useAuth()
  const { t } = useTranslation()
  if (!auth) return ''
  const { zoneName, acpName, psName } = auth
  const role = String(auth.role || '').toUpperCase()
  if (role === 'CP')  return t('Commissioner of Police — Pimpri Chinchwad')
  if (role === 'DCP') return `${t('DCP')} — ${zoneName || t('Zone')}`
  if (role === 'ACP') return `${t('ACP')} — ${acpName || t('ACP Area')}`
  if (role === 'PS')  return `${t('Police Station')} — ${psName || t('PS')}`
  return ''
}
