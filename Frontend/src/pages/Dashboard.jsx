import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Users, CheckCircle, XCircle, Clock, 
  AlertTriangle, TrendingUp, Shield, Activity, Database 
} from 'lucide-react';
import StatCard from '../components/StatCard';
import ComplianceDonut from '../components/charts/ComplianceDonut';
import BreakdownBar from '../components/charts/BreakdownBar';
import TrendLine from '../components/charts/TrendLine';
import Filters from '../components/Filters';
import { useAuth } from '../context/AuthContext';
import { useJurisdiction } from '../hooks/useJurisdiction';
import adminAPI from '../api/api';
import { downloadCSV } from '../utils/csv';
import { dedupeById, parseHierarchyMeta } from '../utils/hierarchyMeta';

export default function Dashboard() {
  const { auth } = useAuth();
  const role = auth?.role;
  const jurisdiction = useJurisdiction();

  const [dash, setDash] = useState(null);
  const [criminals, setCriminals] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    login_id: '',
    password: '',
    role: 'DCP',
    zone_id: '',
    acp_area_id: '',
    police_station_id: '',
  });
  const [zones, setZones] = useState([]);
  const [acpAreas, setAcpAreas] = useState([]);
  const [policeStations, setPoliceStations] = useState([]);
  const [adminCreateLoading, setAdminCreateLoading] = useState(false);
  const [adminCreateMsg, setAdminCreateMsg] = useState('');
  const [adminCreateErr, setAdminCreateErr] = useState('');

  const load = useCallback(async (extraFilters = {}) => {
    setLoading(true);
    try {
      const params = { ...jurisdiction, ...extraFilters, limit: 200 };

      const [dashRes, crimRes] = await Promise.all([
        adminAPI.get('/admin/dashboard'),
        adminAPI.get('/admin/criminals', { params }),
      ]);
      setDash(dashRes.data);
      
      // FIX: Map API data to camelCase so Filters.js can read ACP and PS options
      const mappedCriminals = (crimRes.data.criminals || []).map(c => ({
        ...c,
        acpArea: c.acp_area || c.acpArea,
        policeStation: c.police_station || c.policeStation
      }));
      
      setCriminals(mappedCriminals);
    } catch(e) { 
      console.error("DASHBOARD DATA ERROR:", e); 
    } finally { 
      setLoading(false); 
    }
  }, [JSON.stringify(jurisdiction)]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await adminAPI.get('/admin/hierarchy');
        const parsed = parseHierarchyMeta(res.data || {});
        if (parsed.zones?.length || parsed.acpAreas?.length || parsed.policeStations?.length) {
          setZones(parsed.zones || []);
          setAcpAreas(parsed.acpAreas || []);
          setPoliceStations(parsed.policeStations || []);
          return;
        }
      } catch (_) {}
      try {
        const res2 = await adminAPI.get('/criminal/meta/zones-stations');
        const parsed2 = parseHierarchyMeta(res2.data || {});
        setZones(parsed2.zones || []);
        setAcpAreas(parsed2.acpAreas || []);
        setPoliceStations(parsed2.policeStations || []);
      } catch (_) {
        setZones([]);
        setAcpAreas([]);
        setPoliceStations([]);
      }
    };
    fetchMeta();
  }, [auth?.token]);

  const zoneOptions = useMemo(() => dedupeById(zones, 'zone'), [zones]);

  const acpOptions = useMemo(
    () =>
      dedupeById(
        (acpAreas || []).filter(
          (a) => String(a.zone_id ?? a.zoneId) === String(newAdmin.zone_id)
        )
      , 'acp'),
    [acpAreas, newAdmin.zone_id]
  );

  const psOptions = useMemo(
    () =>
      dedupeById(
        (policeStations || []).filter(
          (ps) => String(ps.acp_area_id ?? ps.acpAreaId) === String(newAdmin.acp_area_id)
        )
      , 'ps'),
    [policeStations, newAdmin.acp_area_id]
  );

  const onFilter = (f) => { setFilters(f); load(f); };

  // Apply filters client-side on the loaded criminals list
  const filteredCriminals = useMemo(() => {
    return criminals.filter(c => {
      if (filters.zone && c.zone !== filters.zone) return false
      if (filters.acpArea && (c.acpArea || c.acp_area) !== filters.acpArea) return false
      if (filters.policeStation && (c.policeStation || c.police_station) !== filters.policeStation) return false
      if (filters.section && (c.externmentSection || c.externment_section) !== filters.section) return false
      if (filters.status === 'compliant' && !(c.stats?.lastCheckin && c.stats?.nonCompliantCount === 0)) return false
      if (filters.status === 'non_compliant' && (c.stats?.lastCheckin && c.stats?.nonCompliantCount === 0)) return false
      return true
    })
  }, [criminals, filters])

  // Compute stats from criminals list (role-filtered)
  const total      = filteredCriminals.length;
  const compliant  = filteredCriminals.filter(c => c.stats?.lastCheckin && c.stats?.nonCompliantCount === 0).length;
  const redZone    = filteredCriminals.filter(c => c.stats?.enteredRestrictedArea).length;
  const notChecked = filteredCriminals.filter(c => !c.stats?.lastCheckin || c.stats?.missedCheckinDays > 0).length;
  const sec55 = filteredCriminals.filter(c => (c.externmentSection || c.externment_section) === '55').length;
  const sec56 = filteredCriminals.filter(c => (c.externmentSection || c.externment_section) === '56').length;
  const sec57 = filteredCriminals.filter(c => (c.externmentSection || c.externment_section) === '57').length;

  // Build trend data (mock 7-day from API data)
  const trendData = dash ? Array.from({length:7}, (_,i) => {
    const d = new Date(); 
    d.setDate(d.getDate() - 6 + i);
    return { 
      date: d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' }).toUpperCase(), 
      total: Math.floor(Math.random() * total * 0.8 + total * 0.1), 
      compliant: Math.floor(Math.random() * total * 0.6), 
      violations: Math.floor(Math.random() * 5) 
    };
  }) : [];

  // Breakdown chart data based on role
  const breakdownData = role === 'CP' ? (dash?.zoneBreakdown || []) :
                        role === 'DCP' ? (dash?.acpBreakdown || []).filter(a => !auth?.zoneId || String(a.zone) === auth?.zoneName) :
                        role === 'ACP' ? (dash?.stationBreakdown || []).filter(s => !auth?.acpName || s.acp_area === auth?.acpName) :
                        [];

  const breakdownLabel = role === 'CP' ? 'zone' : role === 'DCP' ? 'acp_area' : 'police_station';

  const handleDownload = () => {
    downloadCSV(filteredCriminals.map(c => ({
      Name: c.name, 
      LoginID: c.loginId || c.login_id, 
      Section: c.externmentSection || '',
      Zone: c.zone || '', 
      ACP: c.acpArea || '', 
      Station: c.policeStation || '',
      Total: c.stats?.totalCheckins || 0, 
      Compliant: c.stats?.compliantCount || 0,
      NonCompliant: c.stats?.nonCompliantCount || 0, 
      RedZone: c.stats?.enteredRestrictedArea ? 'YES' : 'NO',
      Missed: c.stats?.missedCheckinDays || 0,
    })), 'dashboard_criminals.csv');
  };

  const handleAdminCreate = async (e) => {
    e.preventDefault();
    setAdminCreateMsg('');
    setAdminCreateErr('');

    if (!newAdmin.name || !newAdmin.login_id || !newAdmin.password || !newAdmin.role) {
      setAdminCreateErr('All fields are required.');
      return;
    }

    if (!newAdmin.zone_id) {
      setAdminCreateErr('Zone is required.');
      return;
    }

    if (newAdmin.role === 'ACP' && !newAdmin.acp_area_id) {
      setAdminCreateErr('ACP area is required for ACP role.');
      return;
    }

    if (newAdmin.role === 'PS' && (!newAdmin.acp_area_id || !newAdmin.police_station_id)) {
      setAdminCreateErr('ACP area and police station are required for PS role.');
      return;
    }

    const payload = {
      name: newAdmin.name,
      login_id: newAdmin.login_id,
      password: newAdmin.password,
      role: newAdmin.role,
      zone_id: parseInt(newAdmin.zone_id, 10),
    };

    if (newAdmin.role === 'ACP' || newAdmin.role === 'PS') {
      payload.acp_area_id = parseInt(newAdmin.acp_area_id, 10);
    }

    if (newAdmin.role === 'PS') {
      payload.police_station_id = parseInt(newAdmin.police_station_id, 10);
    }

    try {
      setAdminCreateLoading(true);
      const res = await adminAPI.post('/admin/add-admin', payload);
      if (res.data?.success) {
        setAdminCreateMsg('Admin created successfully.');
        setNewAdmin({
          name: '',
          login_id: '',
          password: '',
          role: 'DCP',
          zone_id: '',
          acp_area_id: '',
          police_station_id: '',
        });
      } else {
        setAdminCreateErr('Could not create admin user.');
      }
    } catch (err) {
      setAdminCreateErr(err?.response?.data?.message || 'Failed to create admin user.');
    } finally {
      setAdminCreateLoading(false);
    }
  };

  const Card = ({ title, children, className = '' }) => (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 p-6 ${className}`}>
      <h3 className="text-xs font-black text-police-slate mb-4 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center">
        <Database size={14} className="mr-2 text-police-blue" />
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-12">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-widest text-police-navy flex items-center gap-3 uppercase">
            <Activity size={28} className="text-police-blue" />
            COMMAND DASHBOARD
          </h1>
          <p className="text-xs font-bold tracking-widest text-slate-400 mt-2 uppercase">
            {role === 'CP' ? 'CITY-WIDE OVERVIEW — ALL ZONES' :
             role === 'DCP' ? `ZONE OVERVIEW — ${auth?.zoneName}` :
             role === 'ACP' ? `ACP DIVISION — ${auth?.acpName}` : 
             `POLICE STATION — ${auth?.psName}`}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <Filters
          onFilter={onFilter}
          onDownload={handleDownload}
          loading={loading}
          criminals={criminals} // FIX: Corrected variable name from allcriminals
        />
      </div>

      {role === 'CP' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-xs font-black tracking-widest text-police-slate mb-4 uppercase border-b border-slate-100 pb-3">
            ADD ADMIN USER
          </h2>

          <form onSubmit={handleAdminCreate} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={newAdmin.name}
              onChange={(e) => setNewAdmin((p) => ({ ...p, name: e.target.value }))}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
            />
            <input
              type="text"
              placeholder="Login ID"
              value={newAdmin.login_id}
              onChange={(e) => setNewAdmin((p) => ({ ...p, login_id: e.target.value }))}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
            />
            <input
              type="password"
              placeholder="Password"
              value={newAdmin.password}
              onChange={(e) => setNewAdmin((p) => ({ ...p, password: e.target.value }))}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
            />
            <select
              value={newAdmin.role}
              onChange={(e) => setNewAdmin((p) => ({
                ...p,
                role: e.target.value,
                zone_id: '',
                acp_area_id: '',
                police_station_id: '',
              }))}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
            >
              <option value="DCP">DCP</option>
              <option value="ACP">ACP</option>
              <option value="PS">PS</option>
            </select>

            <select
              value={newAdmin.zone_id}
              onChange={(e) => setNewAdmin((p) => ({ ...p, zone_id: e.target.value, acp_area_id: '', police_station_id: '' }))}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
            >
              <option value="">Select Zone</option>
              {zoneOptions.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>

            {(newAdmin.role === 'ACP' || newAdmin.role === 'PS') && (
              <select
                value={newAdmin.acp_area_id}
                onChange={(e) => setNewAdmin((p) => ({ ...p, acp_area_id: e.target.value, police_station_id: '' }))}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
              >
                <option value="">Select ACP Area</option>
                {acpOptions.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}

            {newAdmin.role === 'PS' && (
              <select
                value={newAdmin.police_station_id}
                onChange={(e) => setNewAdmin((p) => ({ ...p, police_station_id: e.target.value }))}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
              >
                <option value="">Select Police Station</option>
                {psOptions.map((ps) => (
                  <option key={ps.id} value={ps.id}>{ps.name}</option>
                ))}
              </select>
            )}

            <button
              type="submit"
              disabled={adminCreateLoading}
              className="bg-police-blue text-white rounded-md px-4 py-2 text-sm font-bold tracking-wide disabled:opacity-60"
            >
              {adminCreateLoading ? 'CREATING...' : 'CREATE ADMIN'}
            </button>
          </form>

          {adminCreateMsg && <p className="text-green-700 text-sm mt-3">{adminCreateMsg}</p>}
          {adminCreateErr && <p className="text-red-600 text-sm mt-3">{adminCreateErr}</p>}
        </div>
      )}

      {/* TODAY'S SNAPSHOT (LIVE SYSTEM STATUS) */}
      {dash?.summary && (
        <div className="bg-police-navy rounded-xl shadow-lg p-6 mb-8 border border-slate-800">
          <div className="flex items-center mb-6 border-b border-slate-700 pb-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-3"></div>
            <h2 className="text-xs font-black tracking-widest text-police-gold uppercase">LIVE SYSTEM SNAPSHOT (24H)</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="CITY TOTAL" value={dash.summary.total_criminals} color="blue" />
            <StatCard label="CHECKED IN TODAY" value={dash.summary.total_checkins_today} color="green" />
            <StatCard label="NOT CHECKED IN" value={dash.summary.not_checked_in_today} color="orange" />
            <StatCard label="ACTIVE VIOLATIONS" value={dash.summary.violations_today} color="red" />
          </div>
        </div>
      )}

      {/* DETAILED STAT CARDS */}
      <h2 className="text-xs font-black tracking-widest text-slate-500 mb-4 uppercase">JURISDICTION METRICS</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="TOTAL RECORDS" value={total} icon={Users} color="blue" />
        <StatCard label="COMPLIANT" value={compliant} icon={CheckCircle} color="green" />
        <StatCard label="PENDING CHECK-IN" value={notChecked} icon={Clock} color="orange" />
        <StatCard label="ZONE BREACHES" value={redZone} icon={AlertTriangle} color="red" />
        <StatCard label="SEC 55/56" value={sec55 + sec56} icon={Shield} color="purple" sub={`55: ${sec55} | 56: ${sec56}`} />
        <StatCard label="SEC 57" value={sec57} icon={Shield} color="gray" />
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card title="COMPLIANCE BREAKDOWN" className="lg:col-span-1 border-t-4 border-t-police-blue">
          <ComplianceDonut compliant={compliant} nonCompliant={redZone} notCheckedIn={notChecked} />
        </Card>
        <Card title="7-DAY VERIFICATION TREND" className="lg:col-span-2 border-t-4 border-t-police-blue">
          <TrendLine data={trendData} />
        </Card>
      </div>

      {/* BREAKDOWN BAR */}
      {breakdownData.length > 0 && role !== 'PS' && (
        <Card title={`TERRITORIAL BREAKDOWN — ${role === 'CP' ? 'ZONES' : role === 'DCP' ? 'ACP DIVISIONS' : 'POLICE STATIONS'}`} className="mb-8 border-t-4 border-t-slate-700">
          <BreakdownBar data={breakdownData} labelKey={breakdownLabel} />
        </Card>
      )}

      {/* SECTION BREAKDOWN */}
      <h2 className="text-xs font-black tracking-widest text-slate-500 mb-4 uppercase">LEGAL SECTION DISTRIBUTION</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          ['SECTION 55', sec55, 'border-t-purple-500'],
          ['SECTION 56', sec56, 'border-t-blue-500'],
          ['SECTION 57', sec57, 'border-t-slate-500']
        ].map(([label, val, borderClass]) => (
          <div key={label} className={`bg-white rounded-lg shadow-sm border border-slate-200 p-6 border-t-4 ${borderClass}`}>
            <h3 className="text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">{label}</h3>
            <div className="text-4xl font-black text-police-navy mb-2">{val}</div>
            <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">REGISTERED EXTERNEES</div>
          </div>
        ))}
      </div>

    </div>
  );
}