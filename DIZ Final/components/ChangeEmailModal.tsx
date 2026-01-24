
import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { useAuth } from '../App';

interface ChangeEmailModalProps {
  onClose: () => void;
}

const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({ onClose }) => {
  const { user, login } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newEmail !== confirmEmail) {
      setError('Emails do not match.');
      return;
    }

    if (!newEmail.includes('@gmail.com')) {
      setError('Please use a valid @gmail.com address.');
      return;
    }

    await db.updateEmail(user!.id, newEmail);
    // Update local context
    login({ ...user!, recoveryEmail: newEmail, emailLinked: true });
    alert('Recovery email updated successfully.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-md rounded-[32px] border border-white/10 p-8 shadow-2xl bg-[#000d1a]">
        <h3 className="text-xl font-black text-white uppercase mb-6 text-center">Update Recovery Email</h3>
        <p className="text-[10px] text-gray-400 text-center mb-6">Current: {user?.recoveryEmail || 'Not Linked'}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-400 text-xs font-bold text-center bg-red-900/20 p-2 rounded">{error}</p>}
          
          <div>
            <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">New Gmail Address</label>
            <input 
              type="email" 
              required 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500" 
              placeholder="name@gmail.com"
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Confirm Gmail</label>
            <input 
              type="email" 
              required 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500" 
              placeholder="name@gmail.com"
              value={confirmEmail} 
              onChange={e => setConfirmEmail(e.target.value)} 
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 bg-white/5 py-3 rounded-xl font-black uppercase text-[10px] text-gray-400">Cancel</button>
            <button type="submit" className="flex-2 bg-blue-600 py-3 rounded-xl font-black uppercase text-[10px] text-white shadow-lg active:scale-95 transition-all">Update Link</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangeEmailModal;
