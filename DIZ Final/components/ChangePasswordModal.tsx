
import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { useAuth } from '../App';

interface ChangePasswordModalProps {
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPass !== confirmPass) {
      setError('New passcodes do not match.');
      return;
    }

    if (newPass.length < 6) {
      setError('Passcode must be at least 6 characters.');
      return;
    }

    const success = await db.changePassword(user!.id, oldPass, newPass);
    if (success) {
      alert('Security passcode updated successfully.');
      onClose();
    } else {
      setError('Incorrect old passcode.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-md rounded-[32px] border border-white/10 p-8 shadow-2xl bg-[#000d1a]">
        <h3 className="text-xl font-black text-white uppercase mb-6 text-center">Update Security Passcode</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-400 text-xs font-bold text-center bg-red-900/20 p-2 rounded">{error}</p>}
          
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Passcode</label>
            <input 
              type="password" 
              required 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500" 
              value={oldPass} 
              onChange={e => setOldPass(e.target.value)} 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">New Passcode</label>
            <input 
              type="password" 
              required 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500" 
              value={newPass} 
              onChange={e => setNewPass(e.target.value)} 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Confirm New Passcode</label>
            <input 
              type="password" 
              required 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500" 
              value={confirmPass} 
              onChange={e => setConfirmPass(e.target.value)} 
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 bg-white/5 py-3 rounded-xl font-black uppercase text-[10px] text-gray-400">Cancel</button>
            <button type="submit" className="flex-2 bg-blue-600 py-3 rounded-xl font-black uppercase text-[10px] text-white shadow-lg active:scale-95 transition-all">Update Securely</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
