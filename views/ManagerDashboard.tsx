
import React, { useState, useEffect, useRef } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, BarChart, Bar, AreaChart, Area
} from 'recharts';
import { db } from '../services/mockDb';
import { 
  getAIPerformanceAnalysis, 
  getStaffSpecificAdvice, 
  getGeneralStaffAdvice,
  getKPICoachingTips,
  generateAdviceAudio,
  decode,
  decodeAudioData
} from '../services/geminiService';
import { DailyEntry, KPIConfig, UserProfile, UserRole, TodoItem } from '../types';
import { APP_CONFIG, MOTIVATIONAL_QUOTES_AMHARIC } from '../constants';
import { useAuth } from '../App';
import ProfilePhotoModal from '../components/ProfilePhotoModal';

const ManagerDashboard: React.FC = () => {
  const { user, login } = useAuth();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [kpis, setKpis] = useState<KPIConfig[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<UserProfile | null>(null);
  const [staffAdvice, setStaffAdvice] = useState<string | null>(null);
  const [loadingStaffAdvice, setLoadingStaffAdvice] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [showMyNotes, setShowMyNotes] = useState(false);
  const [showRecoveryHub, setShowRecoveryHub] = useState(false);
  const [showRightsGovernance, setShowRightsGovernance] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [backupLogs, setBackupLogs] = useState<{ date: string; status: string }[]>([]);

  const [playingAIReportAudio, setPlayingAIReportAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => { 
    refreshData(); 
    const checkBackupTime = setInterval(() => {
      const now = new Date();
      // Check for 10:00 PM (22:00)
      if (now.getHours() === 22 && now.getMinutes() === 0 && now.getSeconds() < 10) {
        performDailyBackup();
      }
    }, 10000);
    return () => {
        clearInterval(checkBackupTime);
        stopAudio();
    }
  }, [user]);

  const refreshData = () => {
    const allE = db.getAllEntries();
    const allK = db.getAllKPIs();
    const allU = db.getAllUsers();
    setEntries(allE);
    setKpis(allK);
    setAllUsers(allU);
    setBackupLogs(db.getBackupLogs());
    
    const visibleStaff = db.getVisibleStaffStaffOnly(user!);
    setStaff(visibleStaff);
  };

  const stopAudio = () => {
      if (audioSourceRef.current) {
          try { audioSourceRef.current.stop(); } catch(e) {}
          audioSourceRef.current = null;
      }
      setPlayingAIReportAudio(false);
  };

  const playAIReport = async () => {
      if (playingAIReportAudio) { stopAudio(); return; }
      if (!aiReport) return;
      stopAudio();
      setPlayingAIReportAudio(true);
      try {
          const base64Audio = await generateAdviceAudio(aiReport);
          if (!base64Audio) throw new Error();
          
          if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          const ctx = audioContextRef.current;
          const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.onended = () => setPlayingAIReportAudio(false);
          audioSourceRef.current = source;
          source.start();
      } catch (err) {
          setPlayingAIReportAudio(false);
      }
  };

  const performDailyBackup = () => {
    const data = db.exportDatabase();
    // Simulate cloud push to habeshaw00@gmail.com
    console.log("Transmitting daily snapshot to habeshaw00@gmail.com...");
    db.logBackup("Success: habeshaw00@gmail.com (Google Drive Sync)");
    setBackupLogs(db.getBackupLogs());
  };

  const handleExportDB = () => {
    const data = db.exportDatabase();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DIZ_Snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    db.logBackup("Manual Export Downloaded");
    setBackupLogs(db.getBackupLogs());
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const json = event.target?.result as string;
        if (db.importDatabase(json)) {
          alert("Snapshot Recall Successful.");
          refreshData();
        }
      };
      reader.readAsText(file);
    }
  };

  const togglePermission = (userId: string, perm: string) => {
    db.togglePermission(userId, perm);
    refreshData();
  };

  const assignSupervisor = (userId: string, supervisorId: string) => {
    db.updateSupervisor(userId, supervisorId === 'none' ? null : supervisorId);
    refreshData();
  };

  const downloadStaffDetailCSV = (s: UserProfile) => {
    const sKPIs = kpis.filter(k => k.assignedToEmail === s.email && k.status === 'approved');
    const sEntries = entries.filter(e => e.staffId === s.id && e.status === 'authorized');
    const now = new Date();
    
    const rows = [
      ["STAFF PERFORMANCE MATRIX - NODE: " + s.name.toUpperCase()],
      ["ID: " + s.username.toUpperCase(), "BRANCH: " + (s.branch || 'DIZ branch')],
      ["EXPORTED ON: " + now.toLocaleDateString() + " " + now.toLocaleTimeString()],
      [],
      ["KPI NAME", "UNIT", "NET ACTUAL", "DAILY GOAL", "DAILY %", "WEEKLY GOAL", "WEEKLY %", "MONTHLY GOAL", "MONTHLY %", "YEARLY GOAL", "YEARLY %"]
    ];

    sKPIs.forEach(k => {
      const net = sEntries.reduce((sum, e) => sum + (e.metrics[k.name] || 0) - (e.metrics[`${k.name} Out`] || 0), 0);
      const daily = k.target / 365;
      const weekly = k.target / 52;
      const monthly = k.target / 12;
      const yearly = k.target;
      const calcPerc = (actual: number, goal: number) => goal > 0 ? ((actual / goal) * 100).toFixed(1) + "%" : "0%";
      rows.push([
        k.name, 
        k.unit, 
        net.toString(),
        daily.toFixed(2), calcPerc(net, daily),
        weekly.toFixed(2), calcPerc(net, weekly),
        monthly.toFixed(2), calcPerc(net, monthly),
        yearly.toFixed(2), calcPerc(net, yearly)
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Detailed_Performance_${s.username}_${now.getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadGlobalAggregateCSV = () => {
    const now = new Date();
    const templates = APP_CONFIG.STANDARD_KPI_TEMPLATES.filter(t => !t.isOutflow);
    const rows = [
      ["GLOBAL PERFORMANCE SYNC MATRIX"],
      ["EXPORTED ON: " + now.toLocaleDateString() + " " + now.toLocaleTimeString()],
      [],
      ["STAFF NAME", "KPI NAME", "UNIT", "NET ACTUAL", "WEEKLY %", "MONTHLY %", "YEARLY %"]
    ];
    let grandTotalNet = 0;
    staff.forEach(s => {
      const sEntries = entries.filter(e => e.staffId === s.id && e.status === 'authorized');
      const sKPIs = kpis.filter(k => k.assignedToEmail === s.email && k.status === 'approved');
      templates.forEach(t => {
        const kpiConfig = sKPIs.find(k => k.name === t.name);
        if (kpiConfig) {
          const net = sEntries.reduce((sum, e) => sum + (e.metrics[t.name] || 0) - (e.metrics[`${t.name} Out`] || 0), 0);
          const weeklyPerc = (kpiConfig.target / 52) > 0 ? ((net / (kpiConfig.target / 52)) * 100).toFixed(1) + "%" : "0%";
          const monthlyPerc = (kpiConfig.target / 12) > 0 ? ((net / (kpiConfig.target / 12)) * 100).toFixed(1) + "%" : "0%";
          const yearlyPerc = kpiConfig.target > 0 ? ((net / kpiConfig.target) * 100).toFixed(1) + "%" : "0%";
          rows.push([s.name, t.name, t.unit, net.toString(), weeklyPerc, monthlyPerc, yearlyPerc]);
          grandTotalNet += net;
        }
      });
      rows.push([]);
    });
    rows.push(["BRANCH TOTAL OUTPUT", "", "", grandTotalNet.toString(), "", "", ""]);
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Global_Aggregate_Matrix_${now.getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectStaffNode = async (s: UserProfile) => {
    setSelectedStaff(s);
    setStaffAdvice(null);
    setLoadingStaffAdvice(true);
    try {
      const sEntries = entries.filter(e => e.staffId === s.id && e.status === 'authorized');
      const sKPIs = kpis.filter(k => k.assignedToEmail === s.email && k.status === 'approved');
      const advice = await getStaffSpecificAdvice(s.name, sEntries, sKPIs);
      setStaffAdvice(advice);
    } catch (err) {
      setStaffAdvice("Tactical analysis error.");
    } finally {
      setLoadingStaffAdvice(false);
    }
  };

  const availableRights = [
    { id: 'can_view_notes', label: '📒 Strategic Log rights' },
    { id: 'can_view_vault', label: '💡 Innovation Folder rights' },
    { id: 'can_export_csv', label: '📊 Matrix Export' },
    { id: 'can_sync_ai', label: '🤖 AI Intelligence access' },
  ];

  const csmManagers = allUsers.filter(u => u.role === UserRole.CSM || u.role === UserRole.MANAGER);

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 md:px-0">
      {showUploadModal && <ProfilePhotoModal userId={user!.id} onClose={() => setShowUploadModal(false)} onUpdate={(url) => login({...user!, profilePic: url})} />}

      <section className="flex flex-col lg:flex-row justify-between items-center gap-6 p-8 glass rounded-[40px] border border-blue-500/10 bg-[#000d1a]/40 shadow-xl relative overflow-hidden group">
        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-blue-500/20 bg-[#001f3f] flex items-center justify-center shadow-2xl">
              {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-blue-400">{user?.name.charAt(0)}</span>}
            </div>
            <button onClick={() => setShowUploadModal(true)} className="absolute -bottom-1 -right-1 bg-blue-600 text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all text-xs border border-[#001f3f]">📷</button>
          </div>
          <div>
            <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] mb-2 Amharic-text">እንደምን ዋሉ፣ {user?.name.split(' ')[0]}! 😊</p>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">{user?.name}</h2>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="bg-white/5 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase text-gray-500 tracking-widest">{user?.branch}</span>
              {user?.role === UserRole.MANAGER && (
                <div className="flex flex-wrap gap-2">
                   <button onClick={() => setShowRecoveryHub(!showRecoveryHub)} className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                     {showRecoveryHub ? 'Close Recall' : '🛡️ Continuity Hub'}
                   </button>
                   <button onClick={() => setShowRightsGovernance(!showRightsGovernance)} className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                     {showRightsGovernance ? 'Close Rights' : '🔐 Rights Governance'}
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <button onClick={async () => { setLoadingAI(true); const r = await getAIPerformanceAnalysis(entries, kpis, user?.role === UserRole.CSM); setAiReport(r); setLoadingAI(false); }} disabled={loadingAI} className="bg-indigo-600 hover:bg-indigo-500 px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98]">
          {loadingAI ? '🤖 SYNCING...' : '✨ Intelligence Sync'}
        </button>
      </section>

      {/* AI Intelligence Relay */}
      {aiReport && (
        <section className="glass p-10 rounded-[56px] border border-indigo-500/30 bg-indigo-600/5 animate-fade-up shadow-3xl relative">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4">
              🤖 Strategic Intelligence Relay
            </h3>
            <div className="flex gap-3">
              <button onClick={playAIReport} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${playingAIReportAudio ? 'bg-red-600 animate-pulse text-white' : 'bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20'}`} title="Listen to Report">
                {playingAIReportAudio ? '🔇' : '🔊'}
              </button>
              <button onClick={() => setAiReport(null)} className="text-[10px] font-black uppercase text-gray-500 hover:text-white transition-colors">መዝጊያ ✕</button>
            </div>
          </div>
          <p className="text-gray-200 text-xs md:text-sm italic leading-relaxed whitespace-pre-line border-l border-indigo-500/50 pl-6 Amharic-text">{aiReport}</p>
        </section>
      )}

      {/* Continuity & Recovery Hub */}
      {showRecoveryHub && user?.role === UserRole.MANAGER && (
        <section className="glass p-10 rounded-[48px] border border-blue-500/20 bg-[#001f3f]/40 animate-fade-up shadow-3xl">
           <h3 className="text-xl font-black text-white uppercase mb-8 flex items-center gap-4">🛡️ System Continuity & Cloud Sync</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              <div className="p-8 bg-black/40 rounded-[40px] border border-white/5 space-y-4 text-center">
                 <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Daily Cloud Sync</h4>
                 <p className="text-[9px] text-gray-400 uppercase font-bold">habeshaw00@gmail.com</p>
                 <div className="flex items-center justify-center gap-2">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                   <span className="text-[8px] font-black text-green-400 uppercase">Auto-Backups: 10:00 PM Active</span>
                 </div>
                 <button onClick={performDailyBackup} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-[9px] uppercase transition-all shadow-lg mt-4">Manual Cloud Push Now</button>
              </div>
              <div className="p-8 bg-black/40 rounded-[40px] border border-white/5 space-y-4 text-center">
                 <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest">Snapshot Export</h4>
                 <p className="text-[9px] text-gray-400 uppercase font-bold">Local .JSON Mirror</p>
                 <button onClick={handleExportDB} className="w-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white py-4 rounded-2xl font-black text-[9px] uppercase border border-red-500/20 transition-all mt-4">Download Mirror</button>
              </div>
              <div className="p-8 bg-black/40 rounded-[40px] border border-white/5 space-y-4 text-center">
                 <h4 className="text-[10px] font-black text-green-400 uppercase tracking-widest">Data Recall</h4>
                 <p className="text-[9px] text-gray-400 uppercase font-bold">Import Historical State</p>
                 <label className="block w-full bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white py-4 rounded-2xl font-black text-[9px] uppercase border border-green-500/20 text-center cursor-pointer transition-all mt-4">
                    Deploy Recall
                    <input type="file" accept=".json" onChange={handleImportDB} className="hidden" />
                 </label>
              </div>
           </div>

           <div className="bg-black/60 p-6 rounded-[32px] border border-white/5">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Continuity Log:</p>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                 {backupLogs.slice(-10).reverse().map((log, i) => (
                    <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                       <span className="text-[8px] font-mono text-gray-400">{new Date(log.date).toLocaleString()}</span>
                       <span className="text-[8px] font-black uppercase text-blue-400">{log.status}</span>
                    </div>
                 ))}
                 {backupLogs.length === 0 && <p className="text-center py-4 text-[8px] font-black uppercase text-gray-700 italic">No logs recorded.</p>}
              </div>
           </div>
        </section>
      )}
      
      {/* Manager: Rights & Domain Governance Hub */}
      {showRightsGovernance && user?.role === UserRole.MANAGER && (
        <section className="glass p-10 rounded-[48px] border border-indigo-500/20 bg-indigo-600/5 animate-fade-up shadow-3xl">
           <h3 className="text-xl font-black text-white uppercase mb-8 flex items-center gap-4">🔐 Strategic Rights & Domain Governance</h3>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {allUsers.filter(u => u.id !== user.id).map(u => (
                <div key={u.id} className="p-8 bg-black/40 rounded-[40px] border border-white/5 space-y-8 shadow-xl relative overflow-hidden group">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center font-black text-blue-400 text-lg border border-blue-500/10">{u.name.charAt(0)}</div>
                        <div>
                           <p className="text-sm font-black text-white uppercase truncate">{u.name}</p>
                           <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Node ID: {u.username}</p>
                        </div>
                     </div>
                     <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${u.role === UserRole.CSM ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'bg-gray-600/20 text-gray-400 border-gray-500/20'}`}>{u.role}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">Interface Buttons & Access</p>
                       <div className="flex flex-col gap-2">
                          {availableRights.map(right => (
                             <button 
                               key={right.id} 
                               onClick={() => togglePermission(u.id, right.id)}
                               className={`w-full text-left px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${u.permissions?.includes(right.id) ? 'bg-indigo-600/20 text-white border-indigo-500' : 'bg-white/5 text-gray-500 border-white/5 hover:text-white hover:bg-white/10'}`}
                             >
                               {u.permissions?.includes(right.id) ? '✅ ACTIVE' : '❌ DISABLED'} // {right.label}
                             </button>
                          ))}
                       </div>
                    </div>
                    
                    <div className="space-y-3">
                       <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">Domain Oversight (CSM Control)</p>
                       <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                          <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest block mb-2">Assign Oversight CSM:</label>
                          <select 
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] text-white font-bold outline-none"
                            value={u.supervisorId || 'none'}
                            onChange={(e) => assignSupervisor(u.id, e.target.value)}
                          >
                             <option value="none">UNASSIGNED (Wonde Only)</option>
                             {csmManagers.filter(c => c.id !== u.id).map(csm => <option key={csm.id} value={csm.id}>{csm.name} ({csm.role})</option>)}
                          </select>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </section>
      )}

      {/* Node Directory Section */}
      <section className="glass p-10 rounded-[48px] border border-white/5 bg-[#000d1a]/40 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
           <div>
              <h3 className="text-xs font-black uppercase tracking-[0.4em] text-blue-400">Node Directory & Tactical Oversight</h3>
              <p className="text-gray-500 text-[9px] font-black uppercase mt-1 tracking-widest">Select a node to view chronological logs, achievement trends, and matrix output</p>
        </div>
           <div className="flex gap-4 w-full md:w-auto">
             <input type="text" placeholder="Search Node ID..." className="bg-[#001f3f] border border-white/10 rounded-2xl py-3 px-8 text-sm outline-none focus:border-blue-500 font-bold text-white flex-1 md:w-80 shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             <button onClick={downloadGlobalAggregateCSV} className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl shadow-xl transition-all flex items-center gap-2" title="Export Aggregate Matrix">
               📊 <span className="text-[10px] font-black uppercase">Excel Aggregate</span>
             </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => {
             const sEntries = entries.filter(e => e.staffId === s.id && e.status === 'authorized');
             const sKPIs = kpis.filter(k => k.assignedToEmail === s.email && k.status === 'approved');
             // Fix: cast metric value to number to avoid "unknown" operator error
             const totalNet = sEntries.reduce((sum, e) => sum + Object.entries(e.metrics).reduce((acc, [k, v]) => acc + (k.includes("Out") ? -(v as number) : (v as number)), 0), 0);
             const totalTarget = sKPIs.reduce((sum, k) => sum + k.target, 0);
             const annualPerc = totalTarget > 0 ? Math.round((totalNet / totalTarget) * 100) : 0;
             
             return (
              <div key={s.id} onClick={() => selectStaffNode(s)} className="p-6 bg-white/5 rounded-[32px] border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group flex flex-col shadow-md">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 font-black overflow-hidden border border-blue-500/20 shrink-0">
                    {s.profilePic ? <img src={s.profilePic} className="w-full h-full object-cover" /> : s.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate uppercase">{s.name}</p>
                    <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">{s.username} • {s.branch}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center text-[7px] font-black uppercase">
                    <span className="text-gray-500">ANNUAL TRANSMISSION EFFICIENCY</span>
                    <span className={annualPerc >= 100 ? 'text-green-400' : 'text-blue-300'}>{annualPerc}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${annualPerc >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(annualPerc, 100)}%` }}></div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                   <button className="flex-1 bg-blue-600/10 group-hover:bg-blue-600 py-3 rounded-xl font-black uppercase text-[8px] tracking-widest transition-all">Inspect Node Strategy</button>
                   <button onClick={(e) => { e.stopPropagation(); downloadStaffDetailCSV(s); }} className="px-4 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl transition-all text-xs" title="Download Excel Matrix">📂</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Staff Detail Overlay */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-[#000d1a]/98 backdrop-blur-3xl z-[200] p-4 md:p-10 animate-fade-up flex items-center justify-center overflow-hidden">
          <div className="glass w-full max-w-7xl rounded-[48px] border border-white/10 p-8 md:p-12 shadow-3xl relative bg-[#001226]/90 flex flex-col overflow-y-auto max-h-[95vh] custom-scrollbar">
            <button onClick={() => setSelectedStaff(null)} className="absolute top-6 right-6 md:top-10 md:right-10 w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all text-xl font-black border border-white/10 shadow-2xl z-20">✕</button>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-white/5 pb-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[32px] overflow-hidden border-2 border-blue-500/20 bg-[#001f3f] flex items-center justify-center shadow-2xl shrink-0">
                  {selectedStaff.profilePic ? <img src={selectedStaff.profilePic} className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-blue-400">{selectedStaff.name.charAt(0)}</span>}
                </div>
                <div className="min-w-0">
                  <h3 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-1 truncate">{selectedStaff.name}</h3>
                  <p className="text-blue-400 font-black text-[9px] md:text-xs uppercase tracking-[0.2em] bg-blue-600/5 px-3 py-1 rounded-lg border border-blue-500/10 inline-block">{selectedStaff.username} // Tactical Mastery Insight</p>
                </div>
              </div>
              <button onClick={() => downloadStaffDetailCSV(selectedStaff)} className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl">📊 Download Excel Matrix</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-8">
                <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span> Specialized Coaching Directive (Amharic)
                  </h4>
                  {loadingStaffAdvice ? (
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"></div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Generating Tactical Directive...</p>
                    </div>
                  ) : (
                    <div className="text-gray-100 font-medium text-sm md:text-base leading-relaxed whitespace-pre-line border-l-2 border-indigo-500/30 pl-6 Amharic-text italic">
                      {staffAdvice || "ምንም አይነት ምክር የለም።"}
                    </div>
                  )}
                </div>

                <div className="bg-black/30 p-8 rounded-[40px] border border-white/5 h-[400px] shadow-inner relative">
                   <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mb-10 text-center">Protocol Achievement Net Trend (Last 15 Cycles)</h4>
                   <ResponsiveContainer width="100%" height="80%">
                      {/* Fix: cast metric value to number to avoid "unknown" operator error */}
                      <AreaChart data={entries.filter(e => e.staffId === selectedStaff.id && e.status === 'authorized').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-15).map(e => ({ date: e.date.split('-').slice(1).join('/'), net: Object.entries(e.metrics).reduce((acc, [k, v]) => acc + (k.includes("Out") ? -(v as number) : (v as number)), 0) }))}>
                        <defs>
                          <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey="date" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#001f3f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '10px' }} />
                        <Area type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] px-2 flex items-center justify-between">
                    <span>Protocol Logs</span>
                  </h4>
                  <div className="space-y-4 overflow-y-auto max-h-[700px] custom-scrollbar pr-2 pb-10">
                      {entries.filter(e => e.staffId === selectedStaff.id && e.status === 'authorized').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
                        <div key={e.id} className="bg-white/5 border border-white/5 p-6 rounded-3xl transition-all hover:bg-white/[0.08] shadow-xl relative overflow-hidden group/item">
                           <div className="absolute left-0 top-0 w-1 h-full bg-blue-600 group-hover/item:w-2 transition-all"></div>
                           <div className="flex justify-between items-center mb-6">
                              <p className="text-[10px] font-black text-white uppercase tracking-widest">{e.date}</p>
                           </div>
                           <div className="space-y-3">
                              {Object.entries(e.metrics).map(([k, v]) => (
                                 <div key={k} className="flex justify-between items-center text-[9px] font-bold uppercase">
                                    <span className="text-blue-400">{k}</span>
                                    <span className="text-white font-mono">{v.toLocaleString()}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                      ))}
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
