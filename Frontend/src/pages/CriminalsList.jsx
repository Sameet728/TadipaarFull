import React, { useEffect, useState, useCallback } from 'react';
import { Database, Users } from 'lucide-react';
import CriminalTable from '../components/CriminalTable';
import Filters from '../components/Filters';
import { useJurisdiction } from '../hooks/useJurisdiction';
import { useAuth } from '../context/AuthContext';
import adminAPI from '../api/api';
import { downloadCSV, criminalsToCSV } from '../utils/csv';

export default function CriminalsList() {
  const jurisdiction = useJurisdiction();
  const { auth } = useAuth();
  const [data, setData]     = useState([]);
  const [loading, setLoad]  = useState(true);
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);
  const [filters, setFilters] = useState({});
  const LIMIT = 30;

  const load = useCallback(async (f = {}, pg = 1) => {
    setLoad(true);
    try {
      const params = { ...jurisdiction, ...f, page: pg, limit: LIMIT };
      const res = await adminAPI.get('/admin/criminals', { params });
      setData(res.data.criminals || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (e) { 
      console.error("DATA RETRIEVAL ERROR:", e); 
    } finally { 
      setLoad(false); 
    }
  }, [JSON.stringify(jurisdiction)]);

  useEffect(() => { load(); }, [load]);

  const onFilter = (f) => { 
    setFilters(f); 
    setPage(1); 
    load(f, 1); 
  };

  const handleDownload = async () => {
    try {
      const res = await adminAPI.get('/admin/criminals', { 
        params: { ...jurisdiction, ...filters, limit: 1000 } 
      });
      downloadCSV(criminalsToCSV(res.data.criminals || []), 'externee_registry_export.csv');
    } catch (e) { 
      alert('SYSTEM ERROR: UNABLE TO EXPORT REGISTRY DATA.'); 
    }
  };

  const pages = Math.ceil(total / LIMIT) || 1;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-widest text-police-navy flex items-center gap-3 uppercase">
            <Database size={24} className="text-police-blue" />
            EXTERNEE REGISTRY
          </h1>
          <p className="text-xs font-bold tracking-widest text-slate-400 mt-2 uppercase">
            {total} OFFICIAL RECORDS • ACTIVE JURISDICTION
          </p>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="mb-6">
        <Filters 
          onFilter={onFilter} 
          onDownload={handleDownload} 
          loading={loading} 
        />
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <CriminalTable 
          data={data} 
          loading={loading} 
          showStation={auth?.role !== 'PS'} 
        />
      </div>

      {/* TACTICAL PAGINATION */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white px-6 py-4 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
            PAGE {page} OF {pages} <span className="mx-3 text-slate-300">|</span> {total} TOTAL RECORDS
          </p>
          
          <div className="flex gap-3">
            <button 
              onClick={() => { const p = page - 1; setPage(p); load(filters, p); }} 
              disabled={page === 1}
              className="flex items-center px-4 py-2 text-[10px] font-black tracking-widest text-police-navy bg-slate-100 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors uppercase"
            >
              PREVIOUS
            </button>
            <button 
              onClick={() => { const p = page + 1; setPage(p); load(filters, p); }} 
              disabled={page === pages}
              className="flex items-center px-4 py-2 text-[10px] font-black tracking-widest text-white bg-police-blue rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-800 transition-colors uppercase shadow-sm"
            >
              NEXT STEP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}