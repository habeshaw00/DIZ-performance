
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { db } from '../services/mockDb';

const ChangePasscodeView: React.FC = () => {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      alert('Passcodes do not match!');
      return;
    }
    
    await db.updatePasscode(user!.id, newPass);
    const updatedUser = { ...user!, passcodeSet: true };
    login(updatedUser);
    navigate('/');
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="glass p-8 rounded-2xl border border-white/10 shadow-xl">
        <h2 className="text-2xl font-bold mb-2">Secure Your Account</h2>
        <p className="text-gray-400 mb-6">Since this is your first login, you must set a new secure passcode.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Passcode</label>
            <input
              type="password"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm New Passcode</label>
            <input
              type="password"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              required
            />
          </div>
          <button className="w-full bg-blue-600 py-3 rounded-lg font-bold">Update & Continue</button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasscodeView;
