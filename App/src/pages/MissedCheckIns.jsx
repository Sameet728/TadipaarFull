import React, { useEffect, useState, useCallback } from 'react';
import { Clock, AlertTriangle, User, FileText, ChevronRight } from 'lucide-react';
import Filters from '../components/Filters';
import { useJurisdiction } from '../hooks/useJurisdiction';
import adminAPI from '../api/api';
import { fmtDate } from '../utils/helpers';
import { downloadCSV } from '../utils/csv';
import { useNavigate } from 'react-router-dom';

export default function MissedCheckIns() {
  const jurisdiction = useJurisdiction();
  const navigate = useNavigate();
  const [data, setData]   = useState([]);
  const [total, setTotal] = useState(0);
  const [load, setLoad]   = useState(true);
  const [filters, setFilters] = useState({});

  const fetchLogs = useCallback(async (f = {}) => {
    setLoad(true);
    try {
      const params = { ...jurisdiction, ...f, limit: 200 };
      const res = await adminAPI.get('/admin/missed-checkins', { params });
      setData(res.data.criminals || []);
      setTotal(res.data.pagination?.total || 0);
    } catch(e) { 
      console.error("DATA RETRIEVAL ERROR:", e); 
    } finally { 
      setLoad(false); 
    }
  }, [JSON.stringify(jurisdiction)]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const onFilter = (f) => { setFilters(f); fetchLogs(f); };

  const onDownload = () => downloadCSV(data.map(c => ({
    Name: c.name, 
    LoginID: c.login_id, 
    Phone: c.phone || 'N/A', 
    Station: c.police_station || 'N/A',
    ACP: c.acp_area || 'N/A', 
    Zone: c.zone || 'N/A', 
    Section: c.externment_section || 'N/A',
    LastCheckin: c.last_checkin ? new Date(c.last_checkin).toLocaleString('en-IN') : 'NEVER RECORDED',
    DaysMissed: c.days_missed || 'NO HISTORY',
  })), 'defaulters_registry.csv');

  // Tactical urgency categorization
  const getUrgencyProfile = (days) => {
    if (days === null || days === undefined) {
      return { label: 'NO PRIOR RECORDS', classes: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
    if (days > 7) {
      return { label: `${days} DAYS OVERDUE`, classes: 'bg-red-100 text-red-800 border-red-300' };
    }
    if (days > 3) {
      return { label: `${days} DAYS OVERDUE`, classes: 'bg-orange-100 text-orange-800 border-orange-300' };
    }
    return { label: `${days} DAYS OVERDUE`, classes: 'bg-amber-100 text-amber-800 border-amber-300' };
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black tracking-widest text-police-navy flex items-center gap-3 uppercase">
            <AlertTriangle size={24} className="text-red-600" />
            NON-COMPLIANCE REGISTRY
          </h1>
          <p className="text-xs font-bold tracking-widest text-slate-500 mt-2 uppercase">
            {total} EXTERNEES HAVE FAILED TO COMPLETE DAILY VERIFICATION
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
          <div className="w-8 h-8 border-4 border-police-blue border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-bold tracking-widest text-slate-400">RETRIEVING DEFAULTER LOGS...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200 shadow-sm">
          <Clock size={48} className="mx-auto text-emerald-200 mb-4" />
          <h2 className="text-lg font-black tracking-widest text-emerald-700">100% COMPLIANCE ACHIVED</h2>
          <p className="text-sm font-medium text-slate-500 mt-2">All registered externees in this jurisdiction have been verified today.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-500 uppercase">Subject Details</th>
                  <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-500 uppercase">Jurisdiction</th>
                  <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-500 uppercase">Legal Parameters</th>
                  <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((c, i) => {
                  const urgency = getUrgencyProfile(c.days_missed);
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      {/* Subject Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {c.photo_url ? (
                            <img src={c.photo_url} className="w-10 h-10 rounded object-cover border border-slate-200 shadow-sm" alt="Subject" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center">
                              <User size={16} className="text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-police-navy uppercase tracking-wide">{c.name}</p>
                            <p className="text-[10px] font-bold tracking-widest text-slate-400 mt-0.5">ID: {c.login_id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Jurisdiction */}
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-700 uppercase">{c.police_station || 'UNASSIGNED STATION'}</div>
                        <div className="text-[10px] font-bold tracking-widest text-slate-400 mt-1 uppercase">
                          {c.acp_area || 'N/A'} • {c.zone || 'N/A'}
                        </div>
                      </td>

                      {/* Legal Parameters */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          {c.externment_section ? (
                            <span className="bg-blue-50 text-police-blue border border-blue-200 text-[10px] font-black tracking-widest px-2 py-0.5 rounded-sm">
                              SEC {c.externment_section}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 tracking-widest">N/A</span>
                          )}
                          <div className="flex items-center text-[10px] font-bold tracking-widest text-slate-500 mt-1">
                            <FileText size={10} className="mr-1 text-slate-400" />
                            {fmtDate(c.period_from)} - {fmtDate(c.period_till)}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-sm text-[10px] font-black tracking-widest border ${urgency.classes}`}>
                          <Clock size={10} className="mr-1.5" />
                          {urgency.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => navigate(`/criminals/${c.id || c._id}`)}
                          className="flex items-center text-[10px] font-black tracking-widest text-police-blue hover:text-blue-800 transition-colors"
                        >
                          INSPECT DOSSIER
                          <ChevronRight size={14} className="ml-0.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}