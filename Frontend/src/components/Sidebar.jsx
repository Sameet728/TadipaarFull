import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Database, UserPlus, 
  AlertTriangle, Clock, LogOut, ShieldCheck, Smartphone, Languages 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

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
  const { t, i18n } = useTranslation();
  const role = auth?.role || 'UNAUTHORIZED';

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'mr' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('webLanguage', newLang);
  };

  const handleLogout = () => { 
    logout(); 
    navigate('/login'); 
  };

  return (
    <aside className={`${open ? 'w-72' : 'w-0'} bg-[#010066] flex flex-col transition-all duration-300 shrink-0 shadow-2xl z-20 overflow-hidden`}>
      
      {/* ── Official Branding Header ── */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-center flex-col min-w-[18rem]">
        <img src="/icon.png" alt="Police Logo" className="w-24 h-24 object-contain mb-3 drop-shadow-md" />
        <h1 className="text-xs font-black tracking-widest text-center text-white">{t('MAHARASHTRA POLICE')}</h1>
        <h2 className="text-[10px] font-bold tracking-widest text-slate-400 mt-1.5 uppercase">{t('EXTERNMENT SYSTEM')}</h2>
        
        <div className="mt-4 bg-slate-800 border border-slate-700 px-3 py-1 rounded">
          <p className="text-[9px] font-black tracking-widest text-amber-500 uppercase">
            {t('CLEARANCE:')} {role} LEVEL
          </p>
        </div>

        {/* ── Language Toggle ── */}
        <button 
          onClick={toggleLanguage}
          className="mt-4 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-colors border border-slate-600"
        >
          <Languages size={14} />
          {i18n.language === 'en' ? 'मराठी' : 'ENGLISH'}
        </button>
      </div>

      {/* ── Navigation Links ── */}
      <nav className="flex-1 py-6 overflow-y-auto scrollbar-thin min-w-[18rem]">
        <p className="text-[10px] font-black text-slate-500 px-6 mb-3 uppercase tracking-widest">
          {t('MAIN COMMAND')}
        </p>
        
        <NavItem to="/dashboard"  icon={LayoutDashboard} label={t('DASHBOARD OVERVIEW')} />
        <NavItem to="/criminals"  icon={Database}        label={t('EXTERNEE REGISTRY')} />
        <NavItem to="/violations" icon={AlertTriangle}   label={t('ZONE VIOLATIONS')} />
        <NavItem to="/missed"     icon={Clock}           label={t('NON-COMPLIANCE LOGS')} />
        
        {(role === 'PS' || role === 'ACP' || role === 'DCP' || role === 'CP' || role === 'ADMIN') && (
          <>
            <p className="text-[10px] font-black text-slate-500 px-6 mt-8 mb-3 uppercase tracking-widest">
              {t('REGISTRY MANAGEMENT')}
            </p>
            <NavItem to="/register" icon={UserPlus} label={t('REGISTER EXTERNEE')} />
            {role === 'CP' && (
              <NavItem to="/add-admin" icon={UserPlus} label={t('ADD ADMIN')} />
            )}
          </>
        )}

        <p className="text-[10px] font-black text-slate-500 px-6 mt-8 mb-3 uppercase tracking-widest">
          {t('RESOURCES')}
        </p>
        <NavItem to="/download" icon={Smartphone} label={t('DOWNLOAD MOBILE APP')} />
      </nav>

      {/* ── Secure Logout ── */}
      <div className="p-6 border-t border-slate-800 min-w-[18rem]">
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 text-[11px] font-black tracking-widest text-red-500 hover:text-red-400 hover:bg-red-500/10 w-full py-3 rounded transition-colors border border-transparent hover:border-red-500/20"
        >
          <LogOut size={16} />
          <span>{t('TERMINATE SESSION')}</span>
        </button>
      </div>
    </aside>
  );
}