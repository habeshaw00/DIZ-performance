
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { KPIConfig, UserProfile, UserRole } from '../types';
import { APP_CONFIG } from '../constants';
import { useAuth } from '../App';

const AdminKPIManagement: React.FC = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPIConfig[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [editingKpi, setEditingKpi] = useState<KPIConfig | null>(null);
  const [newKpi, setNewKpi] = useState({ 
    templateIndex: '', 
    target: '', 
    assignedToEmail: '', 
    timeFrame: 'Yearly' as any 
  });

  useEffect(() => { refreshData(); }, [user]);

  const refreshData = () => {
    let allKPIs = db.getAllKPIs();
    let allUsers = db.getAllUsers().filter(u => u.id !== user?.id);
    
    if (user?.role === UserRole.CSM) {
      // Domain filtering for CSM oversight
      allUsers = allUsers.filter(u => u.supervisorId === user.id);
      allKPIs = allKPIs.filter(k => {
        const staffNode = db.getAllUsers().find(u => u.email === k.assignedToEmail);
        return staffNode && staffNode.supervisorId === user.id;
      });
    }

    setKpis(allKPIs);
    setStaff(allUsers);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKpi.templateIndex || !newKpi.assignedToEmail || !newKpi.target) return;
    
    const template = APP_CONFIG.STANDARD_KPI_TEMPLATES[parseInt(newKpi.templateIndex)];
    
    // Duplicate assignment protection logic
    const existing = kpis.find(k => k.name === template.name && k.assignedToEmail === newKpi.assignedToEmail);
    if (existing) {
      if (window.confirm(`OVERRIDE WARNING: This objective is already assigned to this node. Do you want to override the existing target of ${existing.target} with ${newKpi.target}?`)) {
        db.updateKPI(existing.id, { target: parseFloat(newKpi.target) });
        refreshData();
        setNewKpi({ templateIndex: '', target: '', assignedToEmail: '', timeFrame: 'Yearly' });
      }
      return;
    }

    db.addKPI({
      name: template.name,
      target: parseFloat(newKpi.target),
      assignedToEmail: newKpi.assignedToEmail,
      unit: template.unit,
      measure: template.measure,
      timeFrame: 'Yearly',
      status: 'pending',
      createdBy: user!.name,
      isDeposit: (template as any).isDeposit,
      isOutflow: (template as any).isOutflow
    });
    setNewKpi({ templateIndex: '', target: '', assignedToEmail: '', timeFrame: 'Yearly' });
    refreshData();
    alert("Strategic Objective Transmitted to Node.");
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKpi) return;
    db.updateKPI(editingKpi.id, { target: editingKpi.target });
    setEditingKpi(null);
    refreshData();
    alert("Strategic Directive Updated.");
  };

  const handleApproveAll = () => {
    if (window.confirm('Authorize all pending domain objectives?')) {
      const pendingIds = kpis.filter(k => k.status === 'pending').map(k => k.id);
      pendingIds.forEach(id => db.approveKPI(id));
      refreshData();
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('STRICT CONFIRMATION: Permanent removal of this strategic objective from node records?')) {
      db.deleteKPI(id);
      refreshData();
    }
  };

  const handleApprove = (id: string) => {
    db.approveKPI(id);
    refreshData();
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-7xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-[#001226]/60 p-8 rounded-[40px] border border-white/10 shadow-2xl backdrop-blur-xl gap-6">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-tight">Objective Governance</h2>
          <p className="text-blue-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">
            {user?.role === UserRole.CSM ? 'CSM Domain Control' : 'Global Hub Oversight'}
          </p>
        </div>
        <button onClick={handleApproveAll} className="w-full sm:w-auto bg-green-600 hover:bg-green-500 px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg transition-all active:scale-95">Authorize All Pending</button>
      </div>

      <div className="glass p-8 md:p-12 rounded-[48px] border border-white/10 bg-[#000d1a]/40 shadow-xl">
        <h3 className="text-lg font-black mb-8 uppercase tracking-[0.2em] text-blue-400">Assign New Strategic Goal</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div className="space-y-3">
            <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Goal Metric Class</label>
            <select required className="w-full bg-[#001f3f] border border-white/10 rounded-2xl p-5 text-sm text-white font-bold outline-none focus:border-blue-500 transition-all" value={newKpi.templateIndex} onChange={e => setNewKpi({...newKpi, templateIndex: e.target.value})}>
              <option value="">Choose Metric...</option>
              {APP_CONFIG.STANDARD_KPI_TEMPLATES.map((t, i) => <option key={i} value={i}>{t.name} ({t.unit})</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Yearly Plan Volume</label>
            <input required type="number" className="w-full bg-[#001f3f] border border-white/10 rounded-2xl p-5 text-sm text-white font-mono outline-none focus:border-blue-500 transition-all" placeholder="Quantity" value={newKpi.target} onChange={e => setNewKpi({...newKpi, target: e.target.value})} />
          </div>
          <div className="space-y-3">
            <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Target Personnel</label>
            <select required className="w-full bg-[#001f3f] border border-white/10 rounded-2xl p-5 text-sm text-white font-bold outline-none focus:border-blue-500 transition-all" value={newKpi.assignedToEmail} onChange={e => setNewKpi({...newKpi, assignedToEmail: e.target.value})}>
              <option value="">Choose Personnel</option>
              {staff.map(s => <option key={s.id} value={s.email}>{s.name} ({s.role})</option>)}
            </select>
          </div>
          <button className="w-full bg-blue-700 hover:bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all shadow-xl active:scale-95">Assign Objective</button>
        </form>
      </div>

      <div className="glass rounded-[48px] border border-white/5 overflow-hidden shadow-2xl bg-[#000d1a]/20">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-white/5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-10 py-6">Node Personnel</th>
                <th className="px-10 py-6">Strategic objective</th>
                <th className="px-10 py-6">Target Plan</th>
                <th className="px-10 py-6">Status</th>
                <th className="px-10 py-6 text-right">Strategic Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {kpis.map(kpi => {
                const s = db.getAllUsers().find(x => x.email === kpi.assignedToEmail);
                return (
                  <tr key={kpi.id} className="group hover:bg-white/[0.03] transition-all">
                    <td className="px-10 py-6">
                      <p className="font-black text-white uppercase text-xs truncate max-w-[150px]">{s?.name || 'N/A'}</p>
                      <p className="text-[8px] text-gray-600 font-black tracking-widest uppercase mt-0.5">{s?.role}</p>
                    </td>
                    <td className="px-10 py-6 text-[11px] text-blue-300 font-bold uppercase truncate max-w-[200px]">{kpi.name}</td>
                    <td className="px-10 py-6 font-black text-xs text-white font-mono">{kpi.target.toLocaleString()} <span className="text-[8px] text-gray-500">{kpi.unit}</span></td>
                    <td className="px-10 py-6">
                      <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${kpi.status === 'approved' ? 'bg-green-600/10 text-green-400 border-green-500/20' : 'bg-amber-600/10 text-amber-500 border-amber-500/20 animate-pulse'}`}>
                        {kpi.status}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {kpi.status === 'pending' && (
                          <button onClick={() => handleApprove(kpi.id)} className="p-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600 hover:text-white transition-all text-[10px]" title="Approve">✅</button>
                        )}
                        <button onClick={() => setEditingKpi(kpi)} className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-[10px]" title="Edit Target">✏️</button>
                        <button onClick={() => handleDelete(kpi.id)} className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all text-[10px]" title="Delete Objective">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingKpi && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="glass w-full max-w-md rounded-[40px] border border-white/10 p-10 bg-[#001226] shadow-3xl">
             <h3 className="text-xl font-black text-white uppercase mb-4 text-center">Modify Directive</h3>
             <p className="text-[9px] text-gray-500 uppercase font-black text-center mb-8">Personnel: {db.getAllUsers().find(u => u.email === editingKpi.assignedToEmail)?.name}</p>
             <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Adjust Yearly Target</label>
                  <input 
                    type="number" 
                    required 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-lg text-white font-mono outline-none focus:border-blue-500 transition-all"
                    value={editingKpi.target}
                    onChange={e => setEditingKpi({...editingKpi, target: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="flex gap-4">
                   <button type="button" onClick={() => setEditingKpi(null)} className="flex-1 bg-white/5 py-4 rounded-2xl font-black text-[9px] uppercase text-gray-500">Cancel</button>
                   <button type="submit" className="flex-2 bg-blue-600 py-4 rounded-2xl font-black text-[9px] uppercase text-white shadow-xl active:scale-95 transition-all">Apply Changes</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminKPIManagement;
