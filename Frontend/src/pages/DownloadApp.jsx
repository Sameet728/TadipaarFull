import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, ShieldAlert, MapPin, Bell, AlertTriangle, Loader2 } from 'lucide-react';
import adminAPI from '../api/api';

export default function DownloadApp() {
  const [appVersion, setAppVersion] = useState('Loading...');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadClick = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
    }, 4000); // Show downloading state for 4 seconds while browser initializes download
  };
  // Fetch version from the public config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await adminAPI.get('/public/app-config');
        if (res.data.success) {
          setAppVersion(res.data.min_app_version);
        }
      } catch (err) {
        console.log('Failed to fetch app config', err);
        setAppVersion('1.0.0'); // Fallback
      }
    };
    fetchConfig();
  }, []);

  return (
    <div className="min-h-screen bg-slate-200 flex flex-col items-center justify-center p-4 md:p-8 relative font-sans">

      {/* Official Warning Banner */}
      <div className="absolute top-0 w-full bg-red-50 border-b border-red-200 px-4 py-3 text-center z-50">
        <p className="text-red-800 text-sm font-semibold tracking-wide flex items-center justify-center gap-2">
          <AlertTriangle size={18} />
          OFFICIAL NOTICE: This application is strictly for externally restricted individuals. Unauthorized use is prohibited.
        </p>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-md shadow-lg border border-slate-300 overflow-hidden mt-12">

        {/* Authoritative Header Section */}
        <div className="bg-slate-900 px-8 py-10 text-center border-b-4 border-blue-700">
          <div className="flex flex-col items-center">

            <div className="mb-6">
              <h2 className="text-slate-300 font-bold tracking-widest text-xs md:text-sm uppercase">Government of Maharashtra</h2>
              <p className="text-white font-bold tracking-widest text-sm md:text-base uppercase mt-1">Pune City Police</p>
            </div>

            <div className="w-20 h-20 bg-white rounded-md flex items-center justify-center shadow-md mb-6 overflow-hidden border border-slate-700 p-1">
              <img src="/app-icon.png" alt="Official App Icon" className="w-full h-full object-cover rounded-sm" />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Tadipaar Monitoring System
            </h1>
            <p className="text-slate-400 text-base max-w-xl mx-auto mb-5">
              Mandatory digital monitoring client for externed individuals.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-600 text-slate-300 text-xs font-semibold rounded">
              Build Version: {appVersion}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 md:p-12 flex flex-col items-center">

          {/* Directive Box */}
          <div className="bg-slate-50 border-l-4 border-blue-700 p-5 mb-10 w-full max-w-2xl shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-2 uppercase tracking-wide">Mandatory Installation Directive</h2>
            <p className="text-slate-700 text-sm leading-relaxed">
              Pursuant to your externment order, you are legally obligated to install and maintain this application on your personal Android device. The application requires continuous background tracking to verify compliance with restricted geographic zones. Failure to comply may result in immediate legal action.
            </p>
          </div>

          {/* Download Action */}
          <div className="flex flex-col items-center gap-2 w-full max-w-sm justify-center mb-12">
            <a
              href="/tadipaar.apk"
              download="tadipaar.apk"
              onClick={handleDownloadClick}
              className={`w-full flex items-center justify-center gap-3 px-6 py-3 text-white rounded font-semibold shadow transition-colors duration-200 ${
                isDownloading ? 'bg-blue-900 cursor-wait' : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              {isDownloading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>STARTING DOWNLOAD...</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine size={20} />
                  <span>DOWNLOAD APPLICATION (.APK)</span>
                </>
              )}
            </a>
            <span className="text-xs text-slate-500">Secure direct download from Pune City Police servers</span>
          </div>

          {/* Compliance Requirements */}
          <div className="w-full border-t border-slate-200 pt-10">
            <h3 className="text-center text-sm font-bold text-slate-900 uppercase tracking-wide mb-8">System Requirements & Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<MapPin size={24} className="text-slate-700" />}
                title="Location Tracking"
                desc="Requires 'Always Allow' permissions to monitor geographic confinement zones at all times."
              />
              <FeatureCard
                icon={<ShieldAlert size={24} className="text-slate-700" />}
                title="Identity Verification"
                desc="Requires camera permissions for mandated, randomized facial recognition check-ins."
              />
              <FeatureCard
                icon={<Bell size={24} className="text-slate-700" />}
                title="Active Notifications"
                desc="Notifications must remain active to receive urgent directives from your monitoring officer."
              />
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-slate-500 text-xs mt-8 pb-4">
        <p className="font-semibold uppercase tracking-wide mb-1">Confidential & Restricted</p>
        <p>&copy; {new Date().getFullYear()} Government of Maharashtra, Pune City Police.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-start text-left bg-white border border-slate-200 p-5 rounded-md shadow-sm">
      <div className="mb-3">
        {icon}
      </div>
      <h4 className="text-slate-900 font-bold text-sm mb-2 uppercase">{title}</h4>
      <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}