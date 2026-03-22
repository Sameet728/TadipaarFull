import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, MapPin, User, Clock, ShieldAlert, Crosshair, ExternalLink } from 'lucide-react';
import Filters from '../components/Filters';
import { useJurisdiction } from '../hooks/useJurisdiction';
import adminAPI from '../api/api';
import { fmtDateTime } from '../utils/helpers';
import { downloadCSV, checkinsToCSV } from '../utils/csv';
import { useNavigate } from 'react-router-dom';

export default function Violations() {
  const jurisdiction = useJurisdiction();
  const navigate = useNavigate();
  const [data, setData]   = useState([]);
  const [total, setTotal] = useState(0);
  const [load, setLoad]   = useState(true);
  const [filters, setFilters] = useState({});

  const fetchLogs = useCallback(async (f = {}) => {
    setLoad(true);
    try {
      const params = { ...jurisdiction, ...f, limit: 100 };
      const res = await adminAPI.get('/admin/violations', { params });
      setData(res.data.violations || []);
      setTotal(res.data.pagination?.total || 0);
    } catch(e) { 
      console.error("DATA RETRIEVAL ERROR:", e); 
    } finally { 
      setLoad(false); 
    }
  }, [JSON.stringify(jurisdiction)]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const onFilter = (f) => { setFilters(f); fetchLogs(f); };
  
  const onDownload = () => downloadCSV(checkinsToCSV(data), 'zone_violations_registry.csv');

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black tracking-widest text-police-navy flex items-center gap-3 uppercase">
            <AlertTriangle size={24} className="text-red-600" />
            RESTRICTED ZONE VIOLATIONS
          </h1>
          <p className="text-xs font-bold tracking-widest text-slate-500 mt-2 uppercase">
            {total} ACTIVE VIOLATION INCIDENTS DETECTED
          </p>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="mb-8">
        <Filters onFilter={onFilter} onDownload={onDownload} loading={load} />
      </div>

      {/* DATA DISPLAY */}
      {load ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-bold tracking-widest text-slate-400">RETRIEVING INCIDENT LOGS...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200 shadow-sm">
          <ShieldAlert size={48} className="mx-auto text-emerald-200 mb-4" />
          <h2 className="text-lg font-black tracking-widest text-emerald-700">NO ACTIVE VIOLATIONS</h2>
          <p className="text-sm font-medium text-slate-500 mt-2">All registered externees have remained compliant for the selected parameters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.map((v, i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              
              {/* INCIDENT HEADER */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center text-[10px] font-black tracking-widest text-slate-500">
                    <Clock size={12} className="mr-1.5" />
                    {fmtDateTime(v.checked_in_at)}
                  </div>
                  <span className="bg-red-100 text-red-800 border border-red-300 text-[10px] font-black tracking-widest px-2.5 py-1 rounded-sm uppercase">
                    INCIDENT DETECTED
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    STATION: <span className="text-police-navy font-black">{v.police_station || 'UNASSIGNED'}</span>
                  </span>
                  {v.externment_section && (
                    <span className="text-[10px] font-black tracking-widest text-police-blue bg-blue-50 border border-blue-200 px-2 py-1 rounded-sm uppercase">
                      SEC {v.externment_section}
                    </span>
                  )}
                </div>
              </div>

              {/* INCIDENT BODY */}
              <div className="p-6 flex flex-col lg:flex-row gap-8">
                
                {/* Left: Photos */}
                <div className="flex gap-4 items-start">
                  {/* Official Photo */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 mb-2">OFFICIAL ID</span>
                    {v.criminal_photo ? (
                      <img src={v.criminal_photo} className="w-20 h-20 rounded border-2 border-slate-200 object-cover shadow-sm" alt="Official" />
                    ) : (
                      <div className="w-20 h-20 rounded bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                        <User size={24} className="text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Verification Selfie */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold tracking-widest text-red-600 mb-2">VERIFICATION LOG</span>
                    {v.selfie_url ? (
                      <img src={v.selfie_url} className="w-20 h-20 rounded border-2 border-red-300 object-cover shadow-sm" alt="Selfie" />
                    ) : (
                      <div className="w-20 h-20 rounded bg-red-50 border-2 border-red-200 flex items-center justify-center">
                        <User size={24} className="text-red-300" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Details & Map */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 
                      onClick={() => navigate(`/criminals/${v.criminal_id}`)} 
                      className="text-lg font-black tracking-wide text-police-navy hover:text-police-blue cursor-pointer uppercase transition-colors"
                    >
                      {v.name}
                    </h3>
                    <p className="text-[11px] font-bold tracking-widest text-slate-500 mt-1 uppercase">
                      ID: {v.login_id}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded p-3">
                      <p className="text-[10px] font-black tracking-widest text-slate-400 mb-1 flex items-center">
                        <Crosshair size={12} className="mr-1.5" />
                        RECORDED COORDINATES
                      </p>
                      <p className="text-xs font-bold text-police-navy">
                        LAT: {parseFloat(v.latitude || 0).toFixed(5)}
                      </p>
                      <p className="text-xs font-bold text-police-navy mt-0.5">
                        LNG: {parseFloat(v.longitude || 0).toFixed(5)}
                      </p>
                    </div>

                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-police-navy hover:bg-slate-800 transition-colors border border-slate-700 rounded p-3 flex flex-col justify-center items-center group"
                    >
                      <MapPin size={20} className="text-police-gold mb-1 group-hover:-translate-y-0.5 transition-transform" />
                      <span className="text-[10px] font-black tracking-widest text-white flex items-center">
                        VIEW ON MAP <ExternalLink size={10} className="ml-1.5" />
                      </span>
                    </a>
                  </div>
                </div>
              </div>

              {/* VIOLATION BANNER */}
              <div className="bg-red-50 border-t border-red-200 px-6 py-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-black tracking-widest text-red-500 uppercase mb-0.5">SYSTEM FLAG</p>
                  <p className="text-sm font-bold text-red-800 uppercase tracking-wide">
                    {v.violation_reason || 'UNAUTHORIZED ENTRY INTO RESTRICTED ZONE DETECTED'}
                  </p>
                </div>
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}