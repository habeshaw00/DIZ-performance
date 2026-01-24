
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { useAuth } from '../App';
import { DailyEntry, KPIConfig, UserRole } from '../types';

const AdminApprovals: React.FC = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState<DailyEntry[]>([]);
  const [kpis, setKpis] = useState<KPIConfig[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { refresh(); }, [user]);

  const refresh = () => { 
    let allPending = db.getPendingEntries();
    // Domain filtering for Dawit Asres (CSM)
    if (user?.role === UserRole.CSM && user.username === 'dawit') {
      const csmDomain = ['meron', 'sanbata', 'selima', 'genet'];
      allPending = allPending.filter(e => {
        const staff = db.getAllUsers().find(u => u.id === e.staffId);
        return staff && csmDomain.includes(staff.username);
      });
    }
    // Manager Wonde sees everything including Dawit's personal reports
    setPending(allPending); 
    setKpis(db.getAllKPIs()); 
  };

  const handleAuthorize = (id: string) => { db.authorizeEntry(id, user!.id); refresh(); };
  const handleApproveAll = () => { db.approveAllEntries(user!.id); refresh(); alert("All entries authorized within your domain."); };
  
  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId || !rejectReason.trim()) {
      alert("A reason for revocation is mandatory.");
      return;
    }
    db.rejectEntry(rejectingId, rejectReason, user!.name);
    setRejectingId(null); setRejectReason(''); refresh(); alert("Revocation transmitted to Node.");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center p-8 glass rounded-3xl border border-white/10 bg-[#001226]/60 shadow-xl gap-6">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">Oversight Command</h2>
          <p className="text-amber-500 font-bold uppercase text-[9px] mt-2 tracking-widest">
            {user?.role === UserRole.CSM ? 'CSM DOMAIN QUEUE' : 'GLOBAL ADMIN QUEUE'}: {pending.length} Pending
          </p>
        </div>
        <button onClick={handleApproveAll} disabled={pending.length === 0} className="w-full md:w-auto bg-green-600 hover:bg-green-500 px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] shadow-lg disabled:opacity-30 transition-all">✅ Authorize Domain Queue</button>
      </div>

      <div className="space-y-4">
        {pending.length === 0 ? (
          <div className="glass p-20 rounded-[40px] border-dashed border-white/10 text-center opacity-40">
            <p className="text-[10px] font-bold uppercase tracking-[0.5em]">Protocol Flow Clear.</p>
          </div>
        ) : (
          pending.map(entry => (
            <div key={entry.id} className="glass p-8 rounded-[40px] border border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 bg-[#001226]/60 group">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-700/20 rounded-2xl flex items-center justify-center font-black text-blue-400 text-lg border border-blue-500/20">{entry.staffName.charAt(0)}</div>
                  <div>
                    <h4 className="text-lg font-black text-white uppercase leading-none">{entry.staffName}</h4>
                    <p className="text-[9px] text-gray-500 font-black uppercase mt-1 tracking-widest">{entry.date}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(entry.metrics).map(([name, val]) => {
                    const kpiInfo = kpis.find(k => k.name === name);
                    return (
                      <div key={name} className="bg-black/50 p-4 rounded-2xl border border-white/5 text-center">
                        <p className="text-[8px] text-blue-400 font-black uppercase mb-1 truncate">{name}</p>
                        <p className="text-sm font-black text-white font-mono leading-none">{val.toLocaleString()} <span className="text-[8px] text-gray-600">{kpiInfo?.unit}</span></p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => handleAuthorize(entry.id)} className="flex-1 md:flex-none bg-blue-700 hover:bg-blue-600 px-6 py-3 rounded-xl font-black uppercase text-[9px] shadow-lg transition-all active:scale-95">Authorize</button>
                <button onClick={() => setRejectingId(entry.id)} className="flex-1 md:flex-none bg-red-600/10 hover:bg-red-600/20 text-red-500 px-6 py-3 rounded-xl font-black uppercase text-[9px] border border-red-500/10">Revoke</button>
              </div>
            </div>
          ))
        )}
      </div>

      {rejectingId && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="glass w-full max-w-lg rounded-[40px] border border-white/10 p-8 shadow-2xl bg-[#001226]">
            <h3 className="text-lg font-black text-white uppercase text-center mb-6">Revocation Directive</h3>
            <p className="text-[9px] text-red-400 uppercase font-black text-center mb-4">You must provide a clear reason for rejecting this node submission.</p>
            <textarea required className="w-full bg-black/60 border border-white/10 rounded-2xl p-6 text-xs text-white focus:border-red-600 outline-none min-h-[150px] mb-8 resize-none shadow-inner" placeholder="E.g., Missing supporting docs, incorrect volume logged..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <div className="flex gap-4">
              <button type="button" onClick={() => {setRejectingId(null); setRejectReason('');}} className="flex-1 bg-white/5 py-4 rounded-2xl font-black uppercase text-[9px] text-gray-500">Cancel</button>
              <button onClick={handleReject} className="flex-2 bg-red-600 py-4 rounded-2xl font-black uppercase text-[9px] text-white shadow-lg active:scale-95">Transmit Revocation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;
