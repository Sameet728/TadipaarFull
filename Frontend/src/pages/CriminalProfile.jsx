import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, CheckCircle, XCircle, 
  Calendar, Shield, User, FileText, Map, Clock 
} from 'lucide-react';
import api from '../api/api';

// Helper functions (assuming they are in your utils)
const fmtDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase();
};

const fmtDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).toUpperCase();
};

const Badge = ({ label, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-police-blue border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  const activeColor = colors[color] || colors.blue;
  return (
    <span className={`text-[10px] px-3 py-1 rounded-full font-black tracking-widest border ${activeColor}`}>
      {label}
    </span>
  );
};

export default function CriminalProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Replace with your actual endpoint
    api.get(`/admin/criminals/${id}`)
      .then(res => setData(res.data))
      .catch(err => console.error("Error fetching profile:", err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-police-blue border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-bold tracking-widest text-slate-400">RETRIEVING DOSSIER...</p>
      </div>
    );
  }

  if (!data || (!data.criminal && !data._id)) {
    return (
      <div className="text-center py-16">
        <Shield size={48} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-lg font-black tracking-widest text-police-navy">RECORD NOT FOUND</h2>
        <p className="text-sm font-medium text-slate-500 mt-2">The requested externee profile does not exist in the registry.</p>
      </div>
    );
  }

  // Handle both nested and flat response structures depending on your backend
  const criminal = data.criminal || data;
  const recentCheckIns = data.recentCheckIns || [];
  const restrictedAreas = data.restrictedAreas || [];

  const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex items-center mb-4 pb-3 border-b border-slate-100">
        {Icon && <Icon size={18} className="text-police-blue mr-3" />}
        <h3 className="text-xs font-black text-police-slate uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );

  const Row = ({ label, value, highlight }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between py-3 border-b border-slate-50 last:border-0">
        <span className="text-xs font-bold tracking-widest text-slate-400">{label}</span>
        <span className={`text-sm font-bold text-right max-w-xs ${highlight ? 'text-police-blue' : 'text-police-navy'}`}>
          {value}
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 hover:text-police-blue transition-colors mb-8"
      >
        <ArrowLeft size={16} /> RETURN TO REGISTRY
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: IDENTITY & JURISDICTION */}
        <div className="lg:col-span-1">
          <Section title="Subject Identity" icon={User}>
            <div className="flex flex-col items-center mb-6">
              {criminal.photoUrl ? (
                <img 
                  src={criminal.photoUrl} 
                  className="w-32 h-32 rounded-full object-cover border-4 border-slate-100 shadow-md mb-4" 
                  alt="Subject" 
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center border-4 border-slate-50 shadow-md mb-4">
                  <User size={48} className="text-slate-400" />
                </div>
              )}
              <h2 className="text-xl font-black text-police-navy text-center uppercase tracking-wide">
                {criminal.name}
              </h2>
              <p className="text-xs font-bold tracking-widest text-slate-400 mt-1">
                ID: {criminal.loginId || criminal.login_id || 'N/A'}
              </p>
              <div className="flex gap-2 mt-4 flex-wrap justify-center">
                {criminal.externmentSection && (
                  <Badge label={`SECTION ${criminal.externmentSection}`} color="blue" />
                )}
                <Badge 
                  label={criminal.isActive !== false ? 'ACTIVE ORDER' : 'INACTIVE'} 
                  color={criminal.isActive !== false ? 'emerald' : 'red'} 
                />
              </div>
            </div>
            
            <div className="mt-2">
              <Row label="CONTACT" value={criminal.phone} />
              <Row label="EMAIL" value={criminal.email} />
              <Row label="CASE NO" value={criminal.caseNumber || criminal.case_number} highlight />
              <Row label="REGISTERED" value={fmtDate(criminal.createdAt || criminal.created_at)} />
            </div>
          </Section>

          <Section title="Jurisdiction" icon={Shield}>
            <Row label="ZONE" value={criminal.zone} />
            <Row label="ACP DIVISION" value={criminal.acpArea || criminal.acp_division || criminal.acp_area} />
            <Row label="POLICE STATION" value={criminal.policeStation || criminal.police_station} />
          </Section>
        </div>

        {/* RIGHT COLUMN: EXTERNMENT & LOGS */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Externment Parameters" icon={FileText}>
              <Row label="PERIOD START" value={fmtDate(criminal.periodFrom || criminal.start_date)} />
              <Row label="PERIOD END" value={fmtDate(criminal.periodTill || criminal.end_date)} />
              <Row label="PERMANENT ADDRESS" value={criminal.address} />
            </Section>

            <Section title="Current Residence" icon={MapPin}>
              <div className="pt-2">
                <p className="text-sm font-bold text-police-navy leading-relaxed">
                  {criminal.residenceAddress || criminal.residing_address || criminal.residingAddress || 'Address not provided in registry.'}
                </p>
                <p className="text-[10px] font-bold tracking-widest text-slate-400 mt-4 uppercase">
                  Designated living area during externment period.
                </p>
              </div>
            </Section>
          </div>

          {/* RESTRICTED ZONES */}
          {restrictedAreas.length > 0 && (
            <Section title={`Restricted Zones (${restrictedAreas.length})`} icon={Map}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {restrictedAreas.map((area, i) => (
                  <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-red-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-black text-red-900 uppercase tracking-wide">{area.areaName || area.area_name}</h4>
                        <p className="text-xs font-bold text-red-700 mt-1">
                          EXCLUSION RADIUS: {area.radiusKm || area.radius_km} KM
                        </p>
                        <p className="text-[10px] font-bold tracking-widest text-red-400 mt-2">
                          LAT: {parseFloat(area.latitude).toFixed(4)} | LNG: {parseFloat(area.longitude).toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* RECENT CHECK-INS */}
          <Section title="Compliance Logs" icon={Clock}>
            {recentCheckIns.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                <Clock size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-xs font-bold tracking-widest text-slate-400">NO COMPLIANCE LOGS RECORDED</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCheckIns.map((ci, i) => {
                  const isCompliant = (ci.status || '').toLowerCase() === 'compliant';
                  return (
                    <div key={i} className={`flex items-start gap-4 rounded-lg p-4 border ${isCompliant ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50 border-red-200'}`}>
                      
                      {ci.selfieUrl || ci.selfie_url ? (
                        <img 
                          src={ci.selfieUrl || ci.selfie_url} 
                          className="w-16 h-16 rounded border border-slate-200 object-cover flex-shrink-0 shadow-sm" 
                          alt="Verification" 
                        />
                      ) : (
                        <div className="w-16 h-16 rounded bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                          <User size={24} className="text-slate-300" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold tracking-widest text-slate-500">
                            {fmtDateTime(ci.checkInTime || ci.checked_in_at)}
                          </span>
                          <span className={`flex items-center text-[10px] font-black tracking-widest px-2 py-1 rounded-sm ${isCompliant ? 'bg-emerald-100 text-emerald-800' : 'bg-red-600 text-white'}`}>
                            {isCompliant ? <CheckCircle size={10} className="mr-1" /> : <XCircle size={10} className="mr-1" />}
                            {isCompliant ? 'VERIFIED' : 'VIOLATION'}
                          </span>
                        </div>
                        
                        <p className="text-xs font-bold text-police-navy">
                          COORDS: {parseFloat(ci.latitude || 0).toFixed(5)}, {parseFloat(ci.longitude || 0).toFixed(5)}
                        </p>
                        
                        {(ci.remarks || ci.violation_reason) && (
                          <p className={`text-xs font-bold mt-2 ${isCompliant ? 'text-emerald-700' : 'text-red-600'}`}>
                            {ci.remarks || ci.violation_reason}
                          </p>
                        )}
                        
                        <a 
                          href={`https://maps.google.com/?q=${ci.latitude},${ci.longitude}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest text-police-blue hover:text-blue-800 mt-3 transition-colors"
                        >
                          <MapPin size={12} /> OPEN IN MAPS
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}