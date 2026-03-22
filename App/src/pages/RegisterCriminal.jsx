import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Upload, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import api from '../api/api'; // Ensure this points to your configured axios instance

export default function RegisterCriminal() {
  const navigate = useNavigate();
  
  // Replace with actual API endpoints if available, otherwise using mock structures
  const [meta, setMeta] = useState({ zones: [], acpAreas: [], policeStations: [] });
  const [form, setForm] = useState({
    name: '', loginId: '', password: '', phone: '', email: '',
    address: '', caseNumber: '', policeStationId: '',
    externmentSection: '', periodFrom: '', periodTill: '', residenceAddress: '',
    zoneId: '', acpAreaId: '',
  });
  
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoad] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    // In production, ensure your backend has this endpoint to fetch hierarchy data
    api.get('/criminal/meta/zones-stations')
      .then(r => setMeta(r.data))
      .catch(() => {
        // Fallback mock data for UI visualization if endpoint fails
        setMeta({
          zones: [{ id: '1', name: 'Zone 1' }, { id: '2', name: 'Zone 2' }],
          acpAreas: [{ id: '1', zone_id: '1', name: 'ACP Pimpri' }, { id: '2', zone_id: '1', name: 'ACP Sangawi' }],
          policeStations: [{ id: '1', acp_area_id: '1', name: 'Pimpri PS' }, { id: '2', acp_area_id: '1', name: 'Chinchwad PS' }]
        });
      });
  }, []);

  const filteredACP = form.zoneId ? meta.acpAreas?.filter(a => String(a.zone_id) === String(form.zoneId)) : meta.acpAreas || [];
  const filteredPS  = form.acpAreaId ? meta.policeStations?.filter(p => String(p.acp_area_id) === String(form.acpAreaId)) : meta.policeStations || [];

  const set = (k, v) => setForm(prev => {
    const next = { ...prev, [k]: v };
    if (k === 'zoneId') { next.acpAreaId = ''; next.policeStationId = ''; }
    if (k === 'acpAreaId') { next.policeStationId = ''; }
    return next;
  });

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.loginId || !form.password) { 
      setError('SUBJECT NAME, OFFICIAL ID, AND PASSWORD ARE REQUIRED FIELDS.'); 
      return; 
    }
    if (!form.policeStationId && !form.zoneId) { 
      setError('JURISDICTION ALLOCATION IS REQUIRED.'); 
      return; 
    }
    setLoad(true); 
    setError('');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { 
      if (v && k !== 'zoneId' && k !== 'acpAreaId') fd.append(k, v); 
    });
    if (photo) fd.append('photo', photo);

    try {
      // In production: await api.post('/admin/criminal/register', fd, { headers:{ 'Content-Type':'multipart/form-data' } })
      // Simulating network delay for demo
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);
      setTimeout(() => navigate('/criminals'), 2000);
    } catch(e) {
      setError(e?.response?.data?.message || 'SYSTEM ERROR: UNABLE TO REGISTER SUBJECT.');
    } finally { 
      setLoad(false); 
    }
  };

  const inpClass = "w-full bg-slate-50 border border-slate-300 rounded px-4 py-2.5 text-sm font-bold text-police-navy focus:outline-none focus:border-police-blue focus:ring-1 focus:ring-police-blue transition-colors";

  if (success) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4 bg-white rounded-lg border border-emerald-200 shadow-sm mt-8">
      <CheckCircle size={64} className="text-emerald-500" />
      <p className="text-xl font-black text-police-navy tracking-widest uppercase">REGISTRATION SUCCESSFUL</p>
      <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">REDIRECTING TO REGISTRY...</p>
    </div>
  );

  const Section = ({ title, children }) => (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
      <h3 className="text-xs font-black text-police-slate uppercase tracking-widest mb-6 pb-3 border-b border-slate-100 flex items-center">
        <ShieldAlert size={14} className="mr-2 text-police-blue" />
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
    </div>
  );

  const Field = ({ label, required, children, fullWidth }) => (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <label className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2 block">
        {label} {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8 pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-black tracking-widest text-police-navy flex items-center gap-3 uppercase">
          <UserPlus size={24} className="text-police-blue" />
          REGISTER NEW EXTERNEE
        </h1>
        <p className="text-xs font-bold tracking-widest text-slate-400 mt-2 uppercase">
          ENTER OFFICIAL SUBJECT DETAILS INTO THE CENTRAL DATABASE
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold tracking-widest rounded-lg px-4 py-3 mb-6 flex items-center">
          <AlertTriangle size={16} className="mr-2" />
          {error}
        </div>
      )}

      {/* PHOTO UPLOAD */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-xs font-black text-police-slate uppercase tracking-widest mb-6 pb-3 border-b border-slate-100 flex items-center">
          <ShieldAlert size={14} className="mr-2 text-police-blue" />
          OFFICIAL PHOTOGRAPH
        </h3>
        
        <div className="flex items-center gap-6">
          {preview ? (
            <img src={preview} className="w-28 h-28 rounded object-cover border-2 border-slate-200 shadow-sm" alt="Preview" />
          ) : (
            <div 
              className="w-28 h-28 rounded bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors" 
              onClick={() => fileRef.current.click()}
            >
              <Upload size={24} className="mb-2" />
              <span className="text-[10px] font-black tracking-widest">UPLOAD</span>
            </div>
          )}
          
          <div>
            <button 
              onClick={() => fileRef.current.click()} 
              className="border border-police-blue text-police-blue font-bold tracking-widest text-[10px] px-6 py-2.5 rounded hover:bg-blue-50 transition-colors"
            >
              {preview ? 'REPLACE IMAGE' : 'SELECT IMAGE'}
            </button>
            <p className="text-[10px] font-bold text-slate-400 mt-3 tracking-widest">ACCEPTED: JPEG / PNG • MAX 10 MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhoto} />
        </div>
      </div>

      {/* ACCOUNT CREDENTIALS */}
      <Section title="System Authentication">
        <Field label="Subject Full Name" required>
          <input className={inpClass} value={form.name} onChange={e => set('name', e.target.value)} placeholder="ENTER FULL LEGAL NAME" />
        </Field>
        <Field label="Official ID (Login)" required>
          <input className={inpClass} value={form.loginId} onChange={e => set('loginId', e.target.value)} placeholder="E.G. EXT-001" />
        </Field>
        <Field label="Secure Password" required>
          <input type="password" className={inpClass} value={form.password} onChange={e => set('password', e.target.value)} placeholder="MINIMUM 8 CHARACTERS" />
        </Field>
        <Field label="Assigned Case Number">
          <input className={inpClass} value={form.caseNumber} onChange={e => set('caseNumber', e.target.value)} placeholder="CASE-YYYY-XXX" />
        </Field>
      </Section>

      {/* JURISDICTION */}
      <Section title="Territorial Jurisdiction">
        <Field label="Zone" required>
          <select className={inpClass} value={form.zoneId} onChange={e => set('zoneId', e.target.value)}>
            <option value="">SELECT ZONE</option>
            {meta.zones?.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </Field>
        <Field label="ACP Division" required>
          <select className={inpClass} value={form.acpAreaId} onChange={e => set('acpAreaId', e.target.value)} disabled={!form.zoneId}>
            <option value="">SELECT ACP DIVISION</option>
            {filteredACP.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Police Station" required>
          <select className={inpClass} value={form.policeStationId} onChange={e => set('policeStationId', e.target.value)} disabled={!form.acpAreaId}>
            <option value="">SELECT STATION</option>
            {filteredPS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </Section>

      {/* EXTERNMENT PARAMETERS */}
      <Section title="Legal Externment Parameters">
        <Field label="Externment Section" required>
          <select className={inpClass} value={form.externmentSection} onChange={e => set('externmentSection', e.target.value)}>
            <option value="">SELECT LEGAL SECTION</option>
            <option value="55">SECTION 55</option>
            <option value="56">SECTION 56</option>
            <option value="57">SECTION 57</option>
          </select>
        </Field>
        <Field label="Enforcement Start Date">
          <input type="date" className={inpClass} value={form.periodFrom} onChange={e => set('periodFrom', e.target.value)} />
        </Field>
        <Field label="Enforcement End Date">
          <input type="date" className={inpClass} value={form.periodTill} onChange={e => set('periodTill', e.target.value)} />
        </Field>
        <Field label="Mandated Residence During Externment">
          <input className={inpClass} value={form.residenceAddress} onChange={e => set('residenceAddress', e.target.value)} placeholder="ENTER TEMPORARY ADDRESS" />
        </Field>
      </Section>

      {/* PERSONAL INFORMATION */}
      <Section title="Contact Information">
        <Field label="Contact Number">
          <input type="tel" className={inpClass} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="ENTER PHONE NUMBER" />
        </Field>
        <Field label="Email Address">
          <input type="email" className={inpClass} value={form.email} onChange={e => set('email', e.target.value)} placeholder="ENTER EMAIL ADDRESS" />
        </Field>
        <Field label="Permanent Registered Address" fullWidth>
          <textarea className={inpClass} rows={3} value={form.address} onChange={e => set('address', e.target.value)} placeholder="ENTER PERMANENT HOME ADDRESS" />
        </Field>
      </Section>

      {/* ACTION BUTTONS */}
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
          className="px-8 py-3 bg-police-blue text-white rounded text-[10px] font-black tracking-widest hover:bg-blue-800 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'PROCESSING RECORD...' : 'AUTHORIZE & REGISTER SUBJECT'}
        </button>
      </div>
    </div>
  );
}