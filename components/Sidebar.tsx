import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { db } from '../services/mockDb';

const Sidebar: React.FC = () => {
  const { user, mobileMenuOpen, setMobileMenuOpen } = useAuth();
  const location = useLocation();
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const isManager = user?.role === UserRole.MANAGER;
  const isAdmin = user?.role === UserRole.MANAGER || user?.role === UserRole.CSM;

  useEffect(() => {
    const updateCounts = () => {
      if (user) {
        setUnreadMessages(db.getUnreadMessageCount(user.id));
        if (isAdmin) {
          setPendingApprovalsCount(db.getPendingEntries().length);
          setNewFeedbackCount(db.getNewFeedbackCountForPortalOwner(user.role));
        }
      }
    };
    
    updateCounts();
    const interval = setInterval(updateCounts, 5000);
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  // Helper to check if a feature is allowed for the current user
  const hasRight = (perm: string) => {
    if (isManager || user?.permissions?.includes('all_access')) return true;
    return user?.permissions?.includes(perm) || false;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-[50] 
        w-72 bg-[#000d1a] border-r border-white/5 flex flex-col shadow-2xl transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex md:hidden items-center justify-between mb-8">
            <span className="font-black text-blue-500 uppercase tracking-tighter">DIZ Navigation</span>
            <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400">✕</button>
          </div>

          <nav className="space-y-4">
            <div className="space-y-1">
              <Link to="/" className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${location.pathname === '/' && !location.hash ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <span className="text-xl">🏠</span>
                <span className="font-bold uppercase tracking-widest text-xs">Home Portal</span>
              </Link>
            </div>

            <div className="space-y-1">
              <Link to="/inbox" className={`flex items-center justify-between gap-3 px-5 py-4 rounded-2xl transition-all ${location.pathname === '/inbox' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">📥</span>
                  <span className="font-bold uppercase tracking-widest text-xs">Directives</span>
                </div>
                {unreadMessages > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            </div>

            <div className="space-y-1">
              <div onClick={() => setIsDashboardOpen(!isDashboardOpen)} className="flex items-center justify-between gap-3 px-5 py-3 text-gray-500 font-black uppercase tracking-widest text-[10px] cursor-pointer hover:text-blue-400">
                <div className="flex items-center gap-2"><span>📂</span><span>Performance</span></div>
                <span className={`transition-transform duration-300 ${isDashboardOpen ? 'rotate-180' : ''}`}>▼</span>
              </div>
              {isDashboardOpen && (
                <div className="ml-4 space-y-1 border-l border-white/5 pl-4 animate-in slide-in-from-top-2">
                  <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/' ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-white'}`}>
                    <span className="text-lg">🎯</span><span className="text-[11px] font-black uppercase tracking-widest">KPI Tracker</span>
                  </Link>
                  {isAdmin && (
                    <>
                      <Link to="/kpis" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/kpis' ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-white'}`}>
                        <span className="text-lg">⚙️</span><span className="text-[11px] font-black uppercase tracking-widest">KPI Config</span>
                      </Link>
                      <Link to="/approvals" className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/approvals' ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-white'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-lg">✅</span><span className="text-[11px] font-black uppercase tracking-widest">Approvals</span>
                        </div>
                        {pendingApprovalsCount > 0 && (
                          <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)] ring-2 ring-red-500/20">
                            {pendingApprovalsCount}
                          </span>
                        )}
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 space-y-2">
              <p className="px-5 py-2 text-gray-600 font-black uppercase tracking-widest text-[10px]">Operations Node</p>
              {/* Innovation Vault - Manager Only */}
              {isManager && (
                <Link to="/ideas" className={`flex items-center justify-between gap-3 px-5 py-4 rounded-2xl transition-all ${location.pathname === '/ideas' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💡</span><span className="font-bold uppercase tracking-widest text-xs">Innovation Vault</span>
                  </div>
                </Link>
              )}
              <Link to="/requests" className={`flex items-center justify-between gap-3 px-5 py-4 rounded-2xl transition-all ${location.pathname === '/requests' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">✉️</span><span className="font-bold uppercase tracking-widest text-xs">Request Hub</span>
                </div>
                {newFeedbackCount > 0 && (
                  <span className="bg-blue-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg ring-2 ring-blue-400/20">
                    {newFeedbackCount}
                  </span>
                )}
              </Link>
              {hasRight('can_view_notes') && (
                <Link to="/memos" className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${location.pathname === '/memos' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <span className="text-xl">📒</span><span className="font-bold uppercase tracking-widest text-xs">Strategic Log</span>
                </Link>
              )}
            </div>

            {isAdmin && (
              <div className="pt-4 space-y-2 border-t border-white/5 mt-4">
                <p className="px-5 py-2 text-gray-600 font-black uppercase tracking-widest text-[10px]">Admin Tools</p>
                <Link to="/users" className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${location.pathname === '/users' ? 'bg-blue-700 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <span className="text-xl">👥</span><span className="font-bold uppercase tracking-widest text-xs">Staff Node Mgmt</span>
                </Link>
                <Link to="/communications" className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${location.pathname === '/communications' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <span className="text-xl">📣</span><span className="font-bold uppercase tracking-widest text-xs">Broadcast Hub</span>
                </Link>
              </div>
            )}
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-white/5">
          <div className="bg-[#001f3f] border border-white/5 rounded-3xl p-5 shadow-inner">
            <p className="text-[10px] text-blue-400 font-black mb-2 uppercase tracking-[0.2em]">Active Zone</p>
            <p className="text-sm font-black text-white">{user?.branch || 'DIZ branch'}</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">System Online</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;