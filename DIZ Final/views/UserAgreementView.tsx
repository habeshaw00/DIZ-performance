
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { db } from '../services/mockDb';

const UserAgreementView: React.FC = () => {
  const [accepted, setAccepted] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleAccept = async () => {
    if (!accepted) return;
    await db.acceptAgreement(user!.id);
    const updatedUser = { ...user!, agreementAccepted: true };
    login(updatedUser);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#001f3f] px-4">
      <div className="max-w-md w-full glass p-10 rounded-[40px] shadow-2xl border border-white/10 relative overflow-hidden animate-fade-up">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
        
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-blue-600/20 rounded-2xl mb-4 border border-blue-500/30">
            <span className="text-3xl">📜</span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Staff Protocol</h2>
          <p className="text-blue-400 mt-2 font-bold uppercase text-[10px] tracking-widest">User Access Agreement</p>
        </div>

        <div className="space-y-6 mb-10">
          <div className="space-y-4">
            <div className="flex gap-4">
              <span className="text-blue-500 font-bold">•</span>
              <p className="text-sm text-gray-300 leading-snug"><span className="text-white font-black uppercase text-[11px]">Metrics Only</span>: Exclusively for recording KPI performance and strategic innovation.</p>
            </div>
            <div className="flex gap-4">
              <span className="text-blue-500 font-bold">•</span>
              <p className="text-sm text-gray-300 leading-snug"><span className="text-white font-black uppercase text-[11px]">No Social</span>: Personal use or social media posting is strictly prohibited.</p>
            </div>
            <div className="flex gap-4">
              <span className="text-blue-500 font-bold">•</span>
              <p className="text-sm text-gray-300 leading-snug"><span className="text-white font-black uppercase text-[11px]">Confidential</span>: Protect all performance data and branch ideas as private property.</p>
            </div>
            <div className="flex gap-4">
              <span className="text-blue-500 font-bold">•</span>
              <p className="text-sm text-gray-300 leading-snug"><span className="text-white font-black uppercase text-[11px]">Excellence</span>: Use this portal solely for professional growth and DIZ goals.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <label className="flex items-center gap-4 group cursor-pointer bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all">
            <input 
              type="checkbox" 
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="w-6 h-6 rounded-lg accent-blue-600 cursor-pointer"
            />
            <span className="text-xs font-black text-gray-400 group-hover:text-white uppercase tracking-widest">I agree to the DIZ Staff Protocol</span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!accepted}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white font-black py-5 rounded-3xl transition-all shadow-xl shadow-blue-600/30 active:scale-[0.98] uppercase tracking-[0.2em] text-xs"
          >
            Accept & Enter Portal
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserAgreementView;
