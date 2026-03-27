import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Upload, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react'
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

const dedupeById = (items = []) =>
  Array.from(new Map(items.map((i) => [String(i.id), i])).values())

export default function RegisterCriminal() {
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

  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    adminAPI
      .get('/criminal/meta/zones-stations')
      .then((r) => {
        const data = r.data || {}
        setMeta({
          zones: dedupeById(data.zones || []),
          acpAreas: dedupeById(data.acp_areas || data.acpAreas || []),
          policeStations: dedupeById(data.police_stations || data.policeStations || []),
        })
      })
      .catch(() => setMeta({ zones: [], acpAreas: [], policeStations: [] }))
  }, [])

  const zoneOptions = useMemo(() => dedupeById(meta.zones || []), [meta.zones])

  const filteredACP = useMemo(
    () =>
      dedupeById(
        zoneId
          ? (meta.acpAreas || []).filter((a) => String(a.zone_id) === String(zoneId))
          : meta.acpAreas || []
      ),
    [zoneId, meta.acpAreas]
  )

  const filteredPS = useMemo(
    () =>
      dedupeById(
        acpAreaId
          ? (meta.policeStations || []).filter(
              (p) => String(p.acp_area_id) === String(acpAreaId)
            )
          : meta.policeStations || []
      ),
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

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!name.trim() || !loginId.trim() || !password.trim()) {
      setError('Name, Login ID and Password are required.')
      return
    }

    if (!policeStationId) {
      setError('Please select a Police Station.')
      return
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
    if (policeStationId) fd.append('policeStationId', policeStationId)
    if (externmentSection) fd.append('externmentSection', externmentSection)
    if (periodFrom) fd.append('periodFrom', periodFrom)
    if (periodTill) fd.append('periodTill', periodTill)
    if (residenceAddress) fd.append('residenceAddress', residenceAddress)
    if (photo) fd.append('photo', photo)

    try {
      await adminAPI.post('/criminal/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSuccess(true)
      setTimeout(() => navigate('/criminals'), 2000)
    } catch (e) {
      setError(e?.response?.data?.message || 'Registration failed. Please try again.')
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
        <h1 className="text-2xl font-black tracking-widest text-[#1E3A8A] flex items-center gap-3 uppercase">
          <UserPlus size={24} />
          Register New Externee
        </h1>
        <p className="text-xs font-bold tracking-widest text-slate-400 mt-2 uppercase">
          Enter official subject details into the central database
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold tracking-wide rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-5 pb-3 border-b border-slate-100 flex items-center gap-2">
          <ShieldAlert size={14} className="text-[#1E3A8A]" /> Official Photograph
        </h3>
        <div className="flex items-center gap-6">
          {preview ? (
            <img
              src={preview}
              className="w-28 h-28 rounded object-cover border-2 border-slate-200 shadow-sm"
              alt=""
            />
          ) : (
            <div
              className="w-28 h-28 rounded bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => fileRef.current.click()}
            >
              <Upload size={22} className="mb-1.5" />
              <span className="text-[9px] font-black tracking-widest">UPLOAD</span>
            </div>
          )}
          <div>
            <button
              onClick={() => fileRef.current.click()}
              className="border border-[#1E3A8A] text-[#1E3A8A] font-bold tracking-widest text-[10px] px-5 py-2.5 rounded hover:bg-blue-50 transition-colors"
            >
              {preview ? 'REPLACE IMAGE' : 'SELECT IMAGE'}
            </button>
            <p className="text-[10px] font-bold text-slate-400 mt-2 tracking-widest">
              JPEG / PNG - MAX 10 MB
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handlePhoto}
          />
        </div>
      </div>

      <Section title="System Authentication">
        <Field label="Subject Full Name" required>
          <input
            className={INP}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full legal name"
          />
        </Field>
        <Field label="Official Login ID" required>
          <input
            className={INP}
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="e.g. EXT-001"
            autoCapitalize="none"
          />
        </Field>
        <Field label="Secure Password" required>
          <input
            type="password"
            className={INP}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
          />
        </Field>
        <Field label="Case Number">
          <input
            className={INP}
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            placeholder="CASE-YYYY-XXX"
          />
        </Field>
      </Section>

      <Section title="Territorial Jurisdiction">
        <Field label="Zone" required>
          <select className={INP} value={zoneId} onChange={(e) => handleZone(e.target.value)}>
            <option value="">Select Zone</option>
            {zoneOptions.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ACP Division" required>
          <select
            className={INP}
            value={acpAreaId}
            onChange={(e) => handleAcp(e.target.value)}
            disabled={!zoneId}
          >
            <option value="">Select ACP Division</option>
            {filteredACP.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Police Station" required>
          <select
            className={INP}
            value={policeStationId}
            onChange={(e) => setPoliceStationId(e.target.value)}
            disabled={!acpAreaId}
          >
            <option value="">Select Station</option>
            {filteredPS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Legal Externment Parameters">
        <Field label="Externment Section" required>
          <select
            className={INP}
            value={externmentSection}
            onChange={(e) => setExternmentSection(e.target.value)}
          >
            <option value="">Select Legal Section</option>
            <option value="55">Section 55</option>
            <option value="56">Section 56</option>
            <option value="57">Section 57</option>
          </select>
        </Field>
        <Field label="Enforcement Start Date">
          <input
            type="date"
            className={INP}
            value={periodFrom}
            onChange={(e) => setPeriodFrom(e.target.value)}
          />
        </Field>
        <Field label="Enforcement End Date">
          <input
            type="date"
            className={INP}
            value={periodTill}
            onChange={(e) => setPeriodTill(e.target.value)}
          />
        </Field>
        <Field label="Mandated Residence During Externment">
          <input
            className={INP}
            value={residenceAddress}
            onChange={(e) => setResidenceAddress(e.target.value)}
            placeholder="Temporary residence address"
          />
        </Field>
      </Section>

      <Section title="Contact Information">
        <Field label="Phone Number">
          <input
            type="tel"
            className={INP}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
          />
        </Field>
        <Field label="Email Address">
          <input
            type="email"
            className={INP}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
          />
        </Field>
        <Field label="Permanent Registered Address" fullWidth>
          <textarea
            className={INP}
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Permanent home address"
          />
        </Field>
      </Section>

      <div className="flex gap-4 justify-end mt-8 border-t border-slate-200 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="px-8 py-3 bg-white border border-slate-300 text-slate-600 rounded text-[10px] font-black tracking-widest hover:bg-slate-50 transition-colors"
        >
          CANCEL
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-8 py-3 bg-[#1E3A8A] text-white rounded text-[10px] font-black tracking-widest hover:bg-[#163172] transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'PROCESSING...' : 'AUTHORIZE & REGISTER'}
        </button>
      </div>
    </div>
  )
}
