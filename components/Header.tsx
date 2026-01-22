
import React, { useState } from 'react';
import { useAuth } from '../App';
import { APP_CONFIG } from '../constants';
import { AppLanguage } from '../types';
import ChangePasswordModal from './ChangePasswordModal';

const Header: React.FC = () => {
  const { user, toggleDarkMode, darkMode, logout, setMobileMenuOpen, language, setLanguage } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <header className={`h-16 px-4 md:px-6 flex items-center justify-between border-b ${darkMode ? 'border-white/10 bg-[#001f3f]' : 'border-gray-200 bg-white shadow-sm'}`}>
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 hover:bg-white/10 rounded-lg text-lg"
        >
          ☰
        </button>
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg">
          {APP_CONFIG.LOGO_PLACEHOLDER.substring(0, 2)}
        </div>
        <div>
          <h1 className="hidden sm:block font-black text-base md:text-lg tracking-tighter uppercase leading-none">Dukem Zone</h1>
          <p className="hidden md:block text-[9px] text-gray-500 font-black uppercase tracking-[0.3em] mt-1">Operations Portal</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-6">
        <div className="flex items-center">
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as AppLanguage)}
            className="bg-transparent text-[10px] md:text-xs font-black uppercase text-blue-400 border border-blue-500/20 rounded-lg px-2 py-1 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="am" className="text-black">🇪🇹 Amharic</option>
            <option value="en" className="text-black">🇺🇸 English</option>
            <option value="om" className="text-black">🌳 Oromiffaa</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pr-2 md:pr-4 border-r border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black leading-none uppercase truncate max-w-[120px]">{user?.name}</p>
            <button onClick={() => setShowPasswordModal(true)} className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-1.5 hover:underline text-left">Change Passcode</button>
          </div>
          
          <div onClick={() => setShowPasswordModal(true)} className="cursor-pointer w-8 h-8 md:w-9 md:h-9 rounded-xl overflow-hidden border border-blue-500/30 flex items-center justify-center font-bold text-sm bg-blue-600 text-white">
            {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" /> : user?.name.charAt(0)}
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          <button onClick={toggleDarkMode} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors text-base md:text-lg">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={logout} className="text-[9px] md:text-[10px] font-black text-red-400 hover:text-red-300 px-2 md:px-3 py-1.5 rounded-lg border border-red-500/10 hover:bg-red-500/5 transition-all uppercase tracking-widest">
            Logout
          </button>
        </div>
      </div>
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </header>
  );
};

export default Header;
