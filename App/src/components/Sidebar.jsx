import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Database, UserPlus, 
  AlertTriangle, Clock, LogOut, ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) =>
      `flex items-center px-6 py-4 text-[11px] font-black tracking-widest transition-colors ${
        isActive 
          ? 'bg-blue-800 text-white border-l-4 border-amber-500 shadow-md' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-4 border-transparent'
      }`
    }
  >
    <Icon size={18} className="mr-4" />
    <span>{label}</span>
  </NavLink>
);

export default function Sidebar({ open }) {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const role = auth?.role || 'UNAUTHORIZED';

  const handleLogout = () => { 
    logout(); 
    navigate('/login'); 
  };

  return (
    <aside className={`${open ? 'w-72' : 'w-0'} bg-slate-900 flex flex-col transition-all duration-300 shrink-0 shadow-2xl z-20 overflow-hidden`}>
      
      {/* ── Official Branding Header ── */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-center flex-col min-w-[18rem]">
        <ShieldCheck size={42} className="text-amber-500 mb-3" />
        <h1 className="text-sm font-black tracking-widest text-center text-white">MAHARASHTRA POLICE</h1>
        <h2 className="text-[10px] font-bold tracking-widest text-slate-400 mt-1.5 uppercase">EXTERNMENT SYSTEM</h2>
        
        <div className="mt-4 bg-slate-800 border border-slate-700 px-3 py-1 rounded">
          <p className="text-[9px] font-black tracking-widest text-amber-500 uppercase">
            CLEARANCE: {role} LEVEL
          </p>
        </div>
      </div>

      {/* ── Navigation Links ── */}
      <nav className="flex-1 py-6 overflow-y-auto scrollbar-thin min-w-[18rem]">
        <p className="text-[10px] font-black text-slate-500 px-6 mb-3 uppercase tracking-widest">
          MAIN COMMAND
        </p>
        
        <NavItem to="/dashboard"  icon={LayoutDashboard} label="DASHBOARD OVERVIEW" />
        <NavItem to="/criminals"  icon={Database}        label="EXTERNEE REGISTRY" />
        <NavItem to="/violations" icon={AlertTriangle}   label="ZONE VIOLATIONS" />
        <NavItem to="/missed"     icon={Clock}           label="NON-COMPLIANCE LOGS" />
        
        {(role === 'PS' || role === 'ACP' || role === 'DCP' || role === 'CP' || role === 'ADMIN') && (
          <>
            <p className="text-[10px] font-black text-slate-500 px-6 mt-8 mb-3 uppercase tracking-widest">
              REGISTRY MANAGEMENT
            </p>
            <NavItem to="/register" icon={UserPlus} label="REGISTER EXTERNEE" />
          </>
        )}
      </nav>

      {/* ── Secure Logout ── */}
      <div className="p-6 border-t border-slate-800 min-w-[18rem]">
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 text-[11px] font-black tracking-widest text-red-500 hover:text-red-400 hover:bg-red-500/10 w-full py-3 rounded transition-colors border border-transparent hover:border-red-500/20"
        >
          <LogOut size={16} />
          <span>TERMINATE SESSION</span>
        </button>
      </div>
    </aside>
  );
}