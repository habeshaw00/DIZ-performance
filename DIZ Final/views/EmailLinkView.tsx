
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { db } from '../services/mockDb';

const EmailLinkView: React.FC = () => {
  const [gmail, setGmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmail.includes('@gmail.com')) {
      alert('Please use a valid @gmail.com address for secure recovery.');
      return;
    }

    setLoading(true);
    await db.linkEmail(user!.id, gmail);
    const updatedUser = { ...user!, recoveryEmail: gmail, emailLinked: true };
    login(updatedUser);
    setLoading(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#001f3f] px-4">
      <div className="max-w-md w-full glass p-10 rounded-[40px] shadow-2xl border border-white/10 relative overflow-hidden animate-fade-up">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 blur-3xl rounded-full"></div>
        
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-blue-600/20 rounded-2xl mb-4 border border-blue-500/30">
            <span className="text-3xl">📧</span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Security Link</h2>
          <p className="text-blue-400 mt-2 font-bold uppercase text-[10px] tracking-widest">Connect Recovery Account</p>
        </div>

        <form onSubmit={handleLink} className="space-y-8">
          <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 mb-6">
            <p className="text-xs text-gray-300 leading-relaxed font-medium">
              Attach your <span className="text-white font-black">Gmail account</span> to receive:
              <br/><br/>
              • Passcode Reset OTPs
              <br/>
              • Session Lock Confirmations
              <br/>
              • Admin Strategic Notifications
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Gmail Address</label>
            <input 
              type="email"
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-white/20"
              placeholder="yourname@gmail.com"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-black py-5 rounded-3xl transition-all shadow-xl shadow-blue-600/30 uppercase tracking-widest text-xs"
          >
            {loading ? 'Securing Link...' : 'Verify & Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmailLinkView;
