
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { db } from '../services/mockDb';

const LoginView: React.FC = () => {
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const user = await db.login(username, passcode);
      if (user) {
        login(user);
        navigate(user.passcodeSet ? '/' : '/change-passcode');
      } else {
        setError('Invalid username or passcode');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    const user = db.getAllUsers().find(u => u.username === username);
    if (!user) {
      setError('User ID not found.');
    } else if (!user.emailLinked) {
      setError('No recovery email attached to this ID. Contact Admin.');
    } else {
      alert(`OTP Secure Code transmitted to: ${user.recoveryEmail.replace(/(.{3})(.*)(?=@)/, "$1***")}. Check your Gmail inbox.`);
      setResetMode(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#001f3f] px-4">
      <div className="max-w-md w-full glass p-10 rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-yellow-500 to-blue-600"></div>
        
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-blue-600 rounded-2xl mb-4 shadow-xl shadow-blue-600/30">
            <span className="text-2xl font-bold">DZ</span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Dukem Industry Zone</h2>
          <p className="text-gray-400 mt-2 font-medium">Performance Strategy Portal</p>
        </div>

        {resetMode ? (
          <form onSubmit={handleReset} className="space-y-6">
            <h3 className="text-white font-black text-center uppercase tracking-widest text-xs">Security Recovery</h3>
            <p className="text-gray-500 text-[10px] text-center mb-4">Enter your Work ID to receive a temporary recovery OTP via your linked Gmail.</p>
            <div>
              <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Work ID</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white outline-none" placeholder="e.g. meron" />
            </div>
            {error && <p className="text-red-400 text-[10px] font-bold text-center">{error}</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-xl transition-all">Send Recovery Code</button>
            <button type="button" onClick={() => setResetMode(false)} className="w-full text-[10px] text-gray-500 uppercase font-black">Back to Login</button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-xs font-bold text-center">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Username / Work ID</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. meron" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Security Passcode</label>
              <input type="password" required value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="••••••" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-black py-4 px-4 rounded-xl transition-all shadow-xl shadow-blue-600/30 active:scale-[0.98] uppercase tracking-widest text-sm">
              {loading ? 'Authenticating...' : 'Establish Connection'}
            </button>
            
            <div className="text-center">
              <button type="button" onClick={() => { setResetMode(true); setError(''); }} className="text-[11px] text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-widest">
                Forgot passcode? Request Reset
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginView;
