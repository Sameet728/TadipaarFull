import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Upload, CheckCircle, AlertTriangle, ShieldAlert, QrCode, X, Camera } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import Webcam from 'react-webcam'
import adminAPI from '../api/api'

const Section = ({ title, children }) => (
  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-3 border-b border-slate-100 flex items-center gap-2">
      <ShieldAlert size={14} className="text-[#1E3A8A]" />
      {title}
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>
  </div>
)

const Field = ({ label, required, fullWidth, children }) => (
  <div className={fullWidth ? 'md:col-span-2' : ''}>
    <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
  </div>
)

const INP =
  'w-full bg-slate-50 border border-slate-300 rounded px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] transition-colors'

const normalizeOption = (item, type) => {
  const rawId =
    item?.id ??
    (type === 'zone' ? item?.zone_id ?? item?.zoneId : null) ??
    (type === 'acp' ? item?.acp_area_id ?? item?.acpAreaId : null) ??
    (type === 'ps' ? item?.police_station_id ?? item?.policeStationId : null)
  const rawName =
    item?.name ??
    (type === 'zone' ? item?.zone_name ?? item?.zoneName : null) ??
    (type === 'acp' ? item?.acp_area_name ?? item?.acpAreaName : null) ??
    (type === 'ps' ? item?.police_station_name ?? item?.policeStationName : null)
  if (rawId === undefined || rawId === null || rawId === '') return null
  return { ...item, id: String(rawId), name: String(rawName || `#${rawId}`) }
}

const dedupeById = (items = [], type = 'zone') =>
  Array.from(
    new Map(
      (items || [])
        .map((i) => normalizeOption(i, type))
        .filter(Boolean)
        .map((i) => [String(i.id), i])
    ).values()
  )

import { useTranslation } from 'react-i18next'

export default function RegisterCriminal() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [meta, setMeta] = useState({ zones: [], acpAreas: [], policeStations: [] })
  const [name, setName] = useState('')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [caseNumber, setCaseNumber] = useState('')
  const [policeStationId, setPoliceStationId] = useState('')
  const [externmentSection, setExternmentSection] = useState('')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTill, setPeriodTill] = useState('')
  const [residenceAddress, setResidenceAddress] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [acpAreaId, setAcpAreaId] = useState('')
  const [externFromPune, setExternFromPune] = useState(false)
  const [availableDivisions, setAvailableDivisions] = useState([])
  const [selectedDivisions, setSelectedDivisions] = useState([])

  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const [showQr, setShowQr] = useState(false)
  const [uploadId, setUploadId] = useState('')

  const [showWebcam, setShowWebcam] = useState(false)
  const webcamRef = useRef(null)

  const openQrScanner = () => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    setUploadId(id)
    setShowQr(true)
  }

  const closeQrScanner = () => {
    setShowQr(false)
    setUploadId('')
  }

  const convertBase64ToFile = async (base64Data) => {
    const res = await fetch(base64Data)
    const blob = await res.blob()
    return new File([blob], 'capture.jpg', { type: 'image/jpeg' })
  }

  const captureWebcam = useCallback(async () => {
    const imageSrc = webcamRef.current.getScreenshot()
    if (imageSrc) {
      const file = await convertBase64ToFile(imageSrc)
      setPhoto(file)
      setPreview(imageSrc)
      setShowWebcam(false)
    }
  }, [webcamRef])

  useEffect(() => {
    let interval
    if (showQr && uploadId) {
      interval = setInterval(async () => {
        try {
          const res = await adminAPI.get(`/admin/qr-check/${uploadId}`)
          if (res.data.success && res.data.image) {
            const file = await convertBase64ToFile(res.data.image)
            setPhoto(file)
            setPreview(res.data.image)
            setShowQr(false)
            clearInterval(interval)
          }
        } catch (e) {
          // ignore
        }
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [showQr, uploadId])

  // Fetch numeric IDs directly from the zones-stations endpoint which has them
  // Fall back to building name-based options from criminals list
  useEffect(() => {
    // Try to get real numeric IDs from a single criminal's detail endpoint
    // The /admin/criminals response includes policeStationId as numeric at field level
    adminAPI.get('/admin/criminals', { params: { limit: 500 } })
      .then((r) => {
        const criminals = r.data?.criminals || []
        const zoneMap = new Map()
        const acpMap  = new Map()
        const psMap   = new Map()
        for (const c of criminals) {
          // Use numeric IDs if present, else fall back to name as key
          const zId  = c.zoneId          ?? c.zone_id          ?? c.zone
          const aId  = c.acpAreaId       ?? c.acp_area_id      ?? c.acpArea
          const psId = c.policeStationId ?? c.police_station_id ?? c.policeStation

          if (c.zone && zId != null && !zoneMap.has(String(zId)))
            zoneMap.set(String(zId), { id: String(zId), name: c.zone })

          if (c.acpArea && aId != null && !acpMap.has(String(aId)))
            acpMap.set(String(aId), { id: String(aId), name: c.acpArea, zone_id: String(zId) })

          if (c.policeStation && psId != null && !psMap.has(String(psId)))
            psMap.set(String(psId), { id: String(psId), name: c.policeStation, acp_area_id: String(aId) })
        }
        setMeta({
          zones:          [...zoneMap.values()],
          acpAreas:       [...acpMap.values()],
          policeStations: [...psMap.values()],
        })
      })
      .catch(() => setMeta({ zones: [], acpAreas: [], policeStations: [] }))

    adminAPI.get('/admin/divisions')
      .then((r) => {
        const divs = r.data?.divisions || [];
        setAvailableDivisions(divs);
        if (divs.length === 1) {
          setSelectedDivisions([divs[0].name]);
        }
      })
      .catch((e) => console.error("Failed to load divisions", e))
  }, [])

  const zoneOptions = useMemo(() => dedupeById(meta.zones || [], 'zone'), [meta.zones])

  const filteredACP = useMemo(
    () =>
      dedupeById(
        zoneId
          ? (meta.acpAreas || []).filter((a) => String(a.zone_id ?? a.zoneId) === String(zoneId))
          : meta.acpAreas || []
      , 'acp'),
    [zoneId, meta.acpAreas]
  )

  const filteredPS = useMemo(
    () =>
      dedupeById(
        acpAreaId
          ? (meta.policeStations || []).filter(
              (p) => String(p.acp_area_id ?? p.acpAreaId) === String(acpAreaId)
            )
          : meta.policeStations || []
      , 'ps'),
    [acpAreaId, meta.policeStations]
  )

  const handleZone = useCallback((v) => {
    setZoneId(v)
    setAcpAreaId('')
    setPoliceStationId('')
  }, [])

  const handleAcp = useCallback((v) => {
    setAcpAreaId(v)
    setPoliceStationId('')
  }, [])

  const handleDivisionToggle = (divName) => {
    setSelectedDivisions(prev =>
      prev.includes(divName) ? prev.filter(d => d !== divName) : [...prev, divName]
    )
  }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (loading) return;

    if (!name.trim() || !loginId.trim() || !password.trim()) {
      setError('Name, Login ID and Password are required.')
      return
    }

    if (!policeStationId) {
      setError('Please select a Police Station.')
      return
    }

    // If policeStationId is a name (not numeric), look up the real ID
    let resolvedPsId = policeStationId
    if (isNaN(Number(policeStationId))) {
      try {
        const res = await adminAPI.get('/admin/criminals', { params: { limit: 500 } })
        const match = (res.data?.criminals || []).find(
          c => c.policeStation === policeStationId && (c.policeStationId || c.police_station_id)
        )
        const numericId = match?.policeStationId ?? match?.police_station_id
        if (!numericId) {
          setError('Could not resolve Police Station ID. Please contact support.')
          return
        }
        resolvedPsId = String(numericId)
      } catch {
        setError('Failed to resolve Police Station. Please try again.')
        return
      }
    }

    setLoading(true)
    setError('')

    const fd = new FormData()
    fd.append('name', name.trim())
    fd.append('loginId', loginId.trim())
    fd.append('password', password)
    if (phone) fd.append('phone', phone)
    if (email) fd.append('email', email)
    if (address) fd.append('address', address)
    if (caseNumber) fd.append('caseNumber', caseNumber)
    fd.append('policeStationId', resolvedPsId)
    if (externmentSection) fd.append('externmentSection', externmentSection)
    if (periodFrom) fd.append('periodFrom', periodFrom)
    if (periodTill) fd.append('periodTill', periodTill)
    if (residenceAddress) fd.append('residenceAddress', residenceAddress)
    fd.append('externFromPune', externFromPune ? 'true' : 'false')
    if (selectedDivisions.length > 0) fd.append('divisions', JSON.stringify(selectedDivisions))
    if (photo) fd.append('photo', photo)

    try {
      await adminAPI.post('/criminal/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSuccess(true)
      setTimeout(() => navigate('/criminals'), 2000)
    } catch (e) {
      if (e?.response?.data?.errors?.length > 0) {
        const errorMsg = e.response.data.errors.map(err => err.message).join(' | ');
        setError(`Validation failed: ${errorMsg}`);
      } else {
        setError(e?.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false)
    }
  }

  if (success)
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 bg-white rounded-lg border border-emerald-200 shadow-sm mt-8">
        <CheckCircle size={64} className="text-emerald-500" />
        <p className="text-xl font-black text-[#1E3A8A] tracking-widest uppercase">
          Registration Successful
        </p>
        <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">
          Redirecting...
        </p>
      </div>
    )

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8 pb-6 border-b border-slate-200">
        <h1 className="text-xl md:text-2xl font-black tracking-widest text-[#1E3A8A] flex flex-wrap items-center gap-3 uppercase">
          <UserPlus size={24} className="shrink-0" />
          {t('Register New Externee')}
        </h1>
        <p className="text-xs font-bold tracking-widest text-slate-400 mt-2 uppercase">
          {t('Enter official subject details into the central database')}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold tracking-wide rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-5 pb-3 border-b border-slate-100 flex items-center gap-2">
          <ShieldAlert size={14} className="text-[#1E3A8A]" /> {t('Official Photograph')}
        </h3>
        <div className="flex items-center gap-6">
          {preview ? (
            <img src={preview} className="w-28 h-28 rounded object-cover border-2 border-slate-200 shadow-sm" alt="" />
          ) : (
            <div
              className="w-28 h-28 rounded bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => fileRef.current.click()}
            >
              <Upload size={22} className="mb-1.5" />
              <span className="text-[9px] font-black tracking-widest">{t('UPLOAD')}</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <button
                onClick={() => fileRef.current.click()}
                className="border border-[#1E3A8A] text-[#1E3A8A] font-bold tracking-widest text-[10px] px-5 py-2.5 rounded hover:bg-blue-50 transition-colors"
              >
                {preview ? 'REPLACE IMAGE' : 'SELECT IMAGE'}
              </button>
              <button
                onClick={openQrScanner}
                className="flex items-center gap-2 bg-emerald-600 text-white font-black tracking-widest text-[10px] px-6 py-2.5 rounded hover:bg-emerald-700 transition-colors shadow-md ring-2 ring-emerald-600 ring-offset-2"
              >
                <QrCode size={16} /> {t('SCAN QR (RECOMMENDED)')}
              </button>
              <button
                onClick={() => setShowWebcam(true)}
                className="flex items-center gap-2 bg-slate-800 text-white font-bold tracking-widest text-[10px] px-5 py-2.5 rounded hover:bg-slate-700 transition-colors shadow-sm"
              >
                <Camera size={14} /> {t('USE WEBCAM')}
              </button>
            </div>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest mt-2">
              {t('MOBILE PHONES CAPTURE THE HIGHEST QUALITY IMAGES FOR THE DATABASE.')}
            </p>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhoto} />
        </div>
      </div>

      <Section title={t('System Authentication')}>
        <Field label={t('Subject Full Name*')} required>
          <input className={INP} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Full legal name')} />
        </Field>
        <Field label={t('Official Login ID*')} required>
          <input className={INP} value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="e.g. EXT-001" autoCapitalize="none" />
        </Field>
        <Field label={t('Secure Password*')} required>
          <input type="password" className={INP} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('Minimum 8 characters')} />
        </Field>
        <Field label={t('Case Number')}>
          <input className={INP} value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} placeholder="CASE-YYYY-XXX" />
        </Field>
      </Section>

      <Section title={t('Territorial Jurisdiction')}>
        <Field label={t('Zone*')} required>
          <select className={INP} value={zoneId} onChange={(e) => handleZone(e.target.value)}>
            <option value="">{t('Select Zone')}</option>
            {zoneOptions.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t('ACP Division*')} required>
          <select className={INP} value={acpAreaId} onChange={(e) => handleAcp(e.target.value)} disabled={!zoneId}>
            <option value="">{t('Select ACP Division')}</option>
            {filteredACP.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t('Police Station*')} required>
          <select className={INP} value={policeStationId} onChange={(e) => setPoliceStationId(e.target.value)} disabled={!acpAreaId}>
            <option value="">{t('Select Station')}</option>
            {filteredPS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title={t('Legal Externment Parameters')}>
        <Field label={t('Externment Section*')} required>
          <select className={INP} value={externmentSection} onChange={(e) => setExternmentSection(e.target.value)}>
            <option value="">{t('Select Legal Section')}</option>
            <option value="55">Section 55</option>
            <option value="56">Section 56</option>
            <option value="57">Section 57</option>
          </select>
        </Field>
        <Field label={t('Enforcement Start Date')}>
          <input type="date" className={INP} value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
        </Field>
        <Field label={t('Enforcement End Date')}>
          <input type="date" className={INP} value={periodTill} onChange={(e) => setPeriodTill(e.target.value)} />
        </Field>
        <Field label={t('Mandated Residence During Externment')}>
          <input className={INP} value={residenceAddress} onChange={(e) => setResidenceAddress(e.target.value)} placeholder={t('Temporary residence address')} />
        </Field>
        <Field label={t('Territorial Restriction')} fullWidth>
          <div className="flex flex-col gap-4">
            {availableDivisions.length > 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-3">
                  {t('Assign Jurisdiction')}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableDivisions.map(div => (
                    <label key={div.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDivisions.includes(div.name)}
                        onChange={() => handleDivisionToggle(div.name)}
                        className="w-4 h-4 text-[#1E3A8A] border-slate-300 rounded focus:ring-[#1E3A8A]"
                      />
                      <span className="text-sm font-semibold text-slate-700">{div.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-500">Loading divisions...</p>
              </div>
            )}
          </div>
        </Field>
      </Section>

      <Section title={t('Contact Information')}>
        <Field label={t('Phone Number')}>
          <input type="tel" className={INP} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('Enter phone number')} />
        </Field>
        <Field label={t('Email Address')}>
          <input type="email" className={INP} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('Enter email address')} />
        </Field>
        <Field label={t('Permanent Registered Address')} fullWidth>
          <textarea className={INP} rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('Permanent home address')} />
        </Field>
      </Section>

      {/* Modal for QR Code */}
      {showQr && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative flex flex-col items-center">
            <button 
              onClick={closeQrScanner}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="bg-blue-50 p-4 rounded-full mb-6">
              <QrCode size={32} className="text-[#1E3A8A]" />
            </div>
            
            <h3 className="text-lg font-black tracking-widest text-slate-800 uppercase mb-2">
              Mobile Capture
            </h3>
            <p className="text-sm text-slate-500 font-medium text-center mb-8">
              Scan this QR code with your mobile phone camera to open the secure capture portal.
            </p>
            
            <div className="p-4 bg-white border-2 border-slate-100 rounded-xl shadow-inner mb-6">
              <QRCodeCanvas 
                value={`${window.location.origin}/capture/${uploadId}`} 
                size={200}
                level="H"
                fgColor="#1E3A8A"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Waiting for photo...
            </div>
          </div>
        </div>
      )}

      {/* Modal for Webcam */}
      {showWebcam && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl relative flex flex-col items-center">
            <button 
              onClick={() => setShowWebcam(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors z-10"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-lg font-black tracking-widest text-slate-800 uppercase mb-4 self-start flex items-center gap-2">
              <Camera size={20} className="text-[#1E3A8A]" />
              Live Webcam Capture
            </h3>
            
            <div className="w-full bg-black rounded-lg overflow-hidden border-2 border-slate-200 relative">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                onUserMediaError={() => {
                  setError('Camera access blocked. Please click the lock icon in your browser address bar to allow camera permissions.');
                  setShowWebcam(false);
                }}
                className="w-full h-auto max-h-[60vh] object-cover"
              />
            </div>

            <button 
              onClick={captureWebcam}
              className="mt-6 w-full bg-[#1E3A8A] text-white font-black tracking-widest uppercase py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-blue-800 transition-colors shadow-md"
            >
              <Camera size={24} /> 
              CAPTURE PHOTO
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4 justify-end mt-8 border-t border-slate-200 pt-6">
        <button onClick={() => navigate(-1)} className="px-8 py-3 bg-white border border-slate-300 text-slate-600 rounded text-[10px] font-black tracking-widest hover:bg-slate-50 transition-colors">
          {t('CANCEL')}
        </button>
        <button onClick={handleSubmit} disabled={loading} className="px-8 py-3 bg-[#1E3A8A] text-white rounded text-[10px] font-black tracking-widest hover:bg-[#163172] transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
          {loading ? t('PROCESSING...') : t('AUTHORIZE & REGISTER')}
        </button>
      </div>
    </div>
  )
}