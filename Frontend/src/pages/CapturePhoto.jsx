import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';
import adminAPI from '../api/api';

export default function CapturePhoto() {
  const { uploadId } = useParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      // Convert to base64 and compress
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const base64Data = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
          
          try {
            const res = await adminAPI.post(`/public/qr-upload/${uploadId}`, { image: base64Data });
            if (res.data.success) {
              setSuccess(true);
            } else {
              setError(res.data.message || 'Failed to upload photo.');
            }
          } catch (err) {
            setError(err?.response?.data?.message || err.message || 'Error uploading photo.');
          } finally {
            setLoading(false);
          }
        };
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error reading file.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="mb-8">
        <ShieldAlert size={48} className="text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black tracking-widest uppercase">Official Capture</h1>
        <p className="text-slate-400 text-sm mt-2 font-medium tracking-wider">Secure Subject Image Upload</p>
      </div>

      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-sm">
        {success ? (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <CheckCircle size={64} className="text-emerald-400 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Photo Uploaded!</h2>
            <p className="text-slate-400 text-sm">You can now close this tab on your phone and return to the dashboard.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm w-full mb-6">
                {error}
              </div>
            )}
            
            <p className="text-slate-300 mb-8 text-sm">
              Tap the button below to open your camera and capture the subject's photograph.
            </p>

            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black tracking-widest uppercase py-4 rounded-xl flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={24} /> UPLOADING...</>
              ) : (
                <><Camera size={24} /> TAKE PHOTO</>
              )}
            </button>
            
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef}
              onChange={handleCapture}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
}
