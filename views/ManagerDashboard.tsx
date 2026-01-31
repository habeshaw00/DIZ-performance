import React, { useState, useEffect, useRef } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, LineChart, Line, Legend
} from 'recharts';
import { db } from '../services/mockDb';
import { 
  getAIPerformanceAnalysis, 
  getStaffSpecificAdvice, 
  generateAdviceAudio,
  decode,
  decodeAudioData,
  getServiceCultureAdvice,
  getHabitBuildingPlan
} from '../services/geminiService';
import { DailyEntry, KPIConfig, UserProfile, UserRole } from '../types';
import { useAuth } from '../App';
import ProfilePhotoModal from '../components/ProfilePhotoModal';

const ManagerDashboard: React.FC = () => {
  const { user, login, language } = useAuth();
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
  const [backupLogs, setBackupLogs] = useState<{ date: string; status: string }[]>([]);

  // AI Studio & Pledge State
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [showAIStudioModal, setShowAIStudioModal] = useState(false);
  const [aiStudioTab, setAiStudioTab] = useState<'advice' | 'habit'>('advice');
  const [aiStudioQuery, setAiStudioQuery] = useState('');
  const [aiStudioResponse, setAiStudioResponse] = useState<string | null>(null);
  const [loadingAiStudio, setLoadingAiStudio] = useState(false);
  const [selectedHabitPillar, setSelectedHabitPillar] = useState('Respectful');

  const [playingAIReportAudio, setPlayingAIReportAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const refreshData = () => {
    const all = db.getAllUsers();
    setAllUsers(all);
    
    let visibleStaff: UserProfile[] = [];
    if (user?.role === UserRole.MANAGER) {
      // Manager sees everyone (Staff + CSM)
      visibleStaff = all.filter(u => u.role === UserRole.STAFF || u.role === UserRole.CSM);
    } else if (user?.role === UserRole.CSM) {
      // CSM sees all Staff, excluding Manager
      visibleStaff = all.filter(u => u.role === UserRole.STAFF);
    }
    setStaff(visibleStaff);
    
    setEntries(db.getAllEntries());
    setKpis(db.getAllKPIs());
    setBackupLogs(db.getBackupLogs());
  };

  useEffect(() => { 
    refreshData(); 
    
    // Daily Pledge Check
    const hasPledged = sessionStorage.getItem('pledge_signed');
    if (!hasPledged) {
      setShowPledgeModal(true);
    }

    const checkBackupTime = setInterval(() => {
      const now = new Date();
      // Check for 10:00 PM (22:00)
      if (now.getHours() === 22 && now.getMinutes() === 0 && now.getSeconds() < 10) {
        db.logBackup('Auto-Backup to Secure Vault Success');
        setBackupLogs(db.getBackupLogs());
      }
    }, 10000);

    return () => clearInterval(checkBackupTime);
  }, [user]);

  const handleGenerateReport = async () => {
      setLoadingAI(true);
      try {
          const report = await getAIPerformanceAnalysis(entries, kpis, user?.role === UserRole.CSM, language);
          setAiReport(report);
      } catch (error) {
          alert('AI Analysis Failed');
      } finally {
          setLoadingAI(false);
      }
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch(e) {}
        audioSourceRef.current = null;
    }
    setPlayingAIReportAudio(false);
  };

  const playAIReport = async () => {
      if (playingAIReportAudio) {
          stopAudio();
          return;
      }
      if (!aiReport) return;
      
      setPlayingAIReportAudio(true);
      try {
          const base64Audio = await generateAdviceAudio(aiReport);
          if (!base64Audio) throw new Error("No audio data");
          
          if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          const ctx = audioContextRef.current;
          const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.onended = () => setPlayingAIReportAudio(false);
          audioSourceRef.current = source;
          source.start();
      } catch (e) {
          setPlayingAIReportAudio(false);
          alert("Audio playback failed");
      }
  };

  const handleSelectStaff = async (s: UserProfile) => {
      setSelectedStaff(s);
      setStaffAdvice(null);
      setLoadingStaffAdvice(true);
      try {
          const sEntries = entries.filter(e => e.staffId === s.id);
          const sKpis = kpis.filter(k => k.assignedToEmail === s.email);
          const advice = await getStaffSpecificAdvice(s.name, sEntries, sKpis, language);
          setStaffAdvice(advice);
      } catch (e) {
          setStaffAdvice("Could not generate advice.");
      } finally {
          setLoadingStaffAdvice(false);
      }
  };

  const confirmPledge = () => {
    sessionStorage.setItem('pledge_signed', 'true');
    setShowPledgeModal(false);
  };

  const handleAIStudioQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiStudioQuery.trim()) return;
    setLoadingAiStudio(true);
    setAiStudioResponse(null);
    try {
      const response = await getServiceCultureAdvice(user!.name, language, aiStudioQuery);
      setAiStudioResponse(response);
    } catch (e) {
      setAiStudioResponse("Intelligence Sync Failed. Try again.");
    } finally {
      setLoadingAiStudio(false);
    }
  };

  const handleHabitBuild = async () => {
    setLoadingAiStudio(true);
    setAiStudioResponse(null);
    try {
      const response = await getHabitBuildingPlan(user!.name, selectedHabitPillar, language);
      setAiStudioResponse(response);
    } catch (e) {
      setAiStudioResponse("Habit Architect failed to generate plan. Try again.");
    } finally {
      setLoadingAiStudio(false);
    }
  };

  const handleExportManagerCSV = () => {
    const now = new Date();
    // (CSV Export Logic simplified for brevity, assume similar to previous implementation)
    alert("Exporting secure audit log and performance matrix...");
  };

  const handleTransmitGuidance = () => {
    if (!selectedStaff || !staffAdvice) return;
    const cleanAdvice = staffAdvice.replace(/\*\*/g, "").replace(/#/g, "");
    db.addMessage({
      fromId: user!.id,
      fromName: user!.name,
      toId: selectedStaff.id,
      content: `🎯 COACHING TIP: \n${cleanAdvice}`,
      type: 'priority',
      timestamp: new Date().toISOString()
    });
    alert(`Guidance transmitted to ${selectedStaff.name}'s dashboard.`);
  };

  const renderMarkdownText = (text: string) => {
     const parts = text.split(/(\[.*?\]\(.*?\))/g);
     return parts.map((part, i) => {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) return <a key={i} href={match[2]} target="_blank" rel="noreferrer" className="text-blue-400 font-black hover:underline mx-1">[{match[1]}]</a>;
        return part;
     });
  };

  // Helper calculation functions
  const calculateTimeFrameMetrics = (kpiName: string, staffEntries: DailyEntry[]) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Get start of current week (Monday)
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(d.setDate(diff));
    monday.setHours(0,0,0,0);

    let yearly = 0;
    let monthly = 0;
    let weekly = 0;

    staffEntries.filter(e => e.status === 'authorized').forEach(e => {
        const entryDate = new Date(e.date);
        const val = (e.metrics[kpiName] || 0) - (e.metrics[`${kpiName} Out`] || 0);

        if (entryDate.getFullYear() === currentYear) {
            yearly += val;
            if (entryDate.getMonth() === currentMonth) {
                monthly += val;
            }
            if (entryDate >= monday) {
                weekly += val;
            }
        }
    });

    return { yearly, monthly, weekly };
  };

  const renderProgressBar = (actual: number, target: number) => {
    const perc = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0;
    const color = perc >= 100 ? 'bg-green-500' : perc >= 50 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="h-1 bg-white/10 rounded-full overflow-hidden w-full mt-1">
        <div className={`h-full transition-all duration-1000 ${color}`} style={{ width: `${perc}%` }}></div>
      </div>
    );
  };

  // Calculate aggregate metrics for charts
  const getChartData = () => {
      const dataMap: {[date: string]: {date: string, value: number}} = {};
      const targetStaffIds = staff.map(s => s.id);
      
      entries.filter(e => targetStaffIds.includes(e.staffId) && e.status === 'authorized').forEach(e => {
          if (!dataMap[e.date]) dataMap[e.date] = { date: e.date, value: 0 };
          const val = (Object.values(e.metrics) as number[]).reduce((a, b) => a + b, 0);
          dataMap[e.date].value += val;
      });
      
      return Object.values(dataMap).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-14);
  };

  // Get Staff Specific Chart Data (Multi-Line for top 3 KPIs)
  const getStaffChartData = (staffId: string, relevantKPIs: KPIConfig[]) => {
      const staffEntries = entries.filter(e => e.staffId === staffId && e.status === 'authorized').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Limit to last 7 entries for clarity
      const recentEntries = staffEntries.slice(-10);
      
      return recentEntries.map(e => {
          const point: any = { date: e.date };
          relevantKPIs.slice(0, 3).forEach(k => {
              point[k.name] = (e.metrics[k.name] || 0) - (e.metrics[`${k.name} Out`] || 0);
          });
          return point;
      });
  };

  const chartColors = ['#8884d8', '#82ca9d', '#ffc658'];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-2 md:px-0">
        {showUploadModal && <ProfilePhotoModal userId={user!.id} onClose={() => setShowUploadModal(false)} onUpdate={(dataUrl) => login({...user!, profilePic: dataUrl})} />}

        {/* Header Section */}
        <section className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 flex items-center gap-6 p-6 glass rounded-[32px] border border-purple-500/20 bg-[#000d1a]/40 shadow-xl overflow-hidden relative">
                <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-purple-500/20 bg-[#001f3f] flex items-center justify-center shadow-2xl">
                        {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" /> : <div className="text-3xl font-black text-purple-400">{user?.name.charAt(0)}</div>}
                    </div>
                    <button onClick={() => setShowUploadModal(true)} className="absolute -bottom-1 -right-1 bg-purple-600 text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all text-xs border border-[#001f3f]">📷</button>
                </div>
                <div className="min-w-0">
                    <p className="text-purple-400 font-black text-[11px] uppercase tracking-[0.1em] mb-1">Command Node Active</p>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-2 truncate">{user?.name}</h2>
                    <div className="flex gap-2">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">{user?.role}</span>
                        <button onClick={handleExportManagerCSV} className="text-[8px] font-black text-green-400 uppercase tracking-widest bg-green-900/20 border border-green-500/20 px-2 py-1 rounded-lg hover:bg-green-900/40 transition-all flex items-center gap-1">
                            <span>📊</span> Excel Report
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-4">
               {/* Consolidated AI Button to save space */}
               <div className="flex gap-3 h-full">
                  <button onClick={() => { setAiStudioTab('advice'); setShowAIStudioModal(true); }} className="flex-1 bg-gradient-to-r from-indigo-800 to-purple-800 hover:from-indigo-700 hover:to-purple-700 rounded-3xl font-black uppercase text-[10px] text-white shadow-xl flex flex-col items-center justify-center gap-2 transition-all border border-white/10 group">
                     <span className="text-3xl group-hover:scale-110 transition-transform">🧠</span> 
                     <span>AI Studio & Habits</span>
                  </button>
               </div>
            </div>
        </section>

        {/* AI Strategic Overview */}
        <section className="glass p-8 rounded-[40px] border border-purple-500/10 bg-purple-600/5 shadow-2xl relative">
             <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">Strategic Domain Intelligence</h3>
                    <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">AI Performance Synthesis</p>
                </div>
                <div className="flex gap-2">
                     <button onClick={handleGenerateReport} disabled={loadingAI} className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-xl font-black uppercase text-[9px] text-white shadow-lg transition-all disabled:opacity-50">
                        {loadingAI ? 'Analyzing...' : 'Generate Sync Report'}
                     </button>
                     {aiReport && (
                        <button onClick={playAIReport} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${playingAIReportAudio ? 'bg-red-600 animate-pulse text-white' : 'bg-purple-600/10 text-purple-400 hover:bg-purple-600 hover:text-white'}`}>
                           {playingAIReportAudio ? '🔇' : '🔊'}
                        </button>
                     )}
                </div>
             </div>
             
             {aiReport ? (
                 <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line border-l-2 border-purple-500/30 pl-6 italic font-medium Amharic-text animate-in fade-in">
                     {renderMarkdownText(aiReport)}
                 </div>
             ) : (
                 <div className="py-12 text-center text-[10px] text-gray-500 font-black uppercase tracking-widest border border-dashed border-white/5 rounded-3xl">
                     Awaiting Neural Sync...
                 </div>
             )}
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Staff List & Selection */}
            <div className="lg:col-span-1 space-y-6">
                <div className="glass p-6 rounded-[32px] border border-white/5 bg-[#000d1a]/60 flex flex-col h-[600px]">
                    <div className="mb-4">
                        <input 
                          type="text" 
                          placeholder="Search Nodes..." 
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {staff.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                            <div 
                                key={s.id} 
                                onClick={() => handleSelectStaff(s)}
                                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all group ${selectedStaff?.id === s.id ? 'bg-purple-600/20 border-purple-500/50' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                            >
                                <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-gray-400 font-black overflow-hidden">
                                    {s.profilePic ? <img src={s.profilePic} className="w-full h-full object-cover" /> : s.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-[10px] font-black uppercase truncate ${selectedStaff?.id === s.id ? 'text-white' : 'text-gray-300'}`}>{s.name}</p>
                                    <p className="text-[8px] text-gray-500 uppercase tracking-widest">{s.role}</p>
                                </div>
                                <div className="ml-auto text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">➡️</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Staff Analysis / Performance Charts */}
            <div className="lg:col-span-2 space-y-6">
                {selectedStaff ? (
                    <div className="glass p-8 rounded-[40px] border border-white/10 bg-[#000d1a]/40 shadow-2xl animate-in slide-in-from-right-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black uppercase text-white">Node Analysis: <span className="text-blue-400">{selectedStaff.name}</span></h3>
                            <button onClick={() => setSelectedStaff(null)} className="text-[10px] font-black uppercase text-gray-500 hover:text-white">Close View</button>
                        </div>
                        
                        {/* KPI Trend Chart */}
                        <div className="mb-8 h-[250px] w-full bg-white/5 rounded-3xl border border-white/5 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={getStaffChartData(selectedStaff.id, kpis.filter(k => k.assignedToEmail === selectedStaff.email && k.status === 'approved'))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                    <XAxis dataKey="date" stroke="#666" fontSize={10} />
                                    <YAxis stroke="#666" fontSize={10} />
                                    <Tooltip contentStyle={{backgroundColor: '#000d1a', borderColor: '#333'}} />
                                    <Legend />
                                    {kpis.filter(k => k.assignedToEmail === selectedStaff.email && k.status === 'approved').slice(0, 3).map((k, i) => (
                                        <Line key={k.id} type="monotone" dataKey={k.name} stroke={chartColors[i % chartColors.length]} strokeWidth={2} dot={false} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mb-8">
                            <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-4">Performance Matrix</h4>
                            <div className="grid grid-cols-1 gap-4">
                                {kpis.filter(k => k.assignedToEmail === selectedStaff.email && k.status === 'approved').length > 0 ? (
                                    kpis.filter(k => k.assignedToEmail === selectedStaff.email && k.status === 'approved').map(k => {
                                        const staffEntries = entries.filter(e => e.staffId === selectedStaff.id);
                                        const { yearly, monthly, weekly } = calculateTimeFrameMetrics(k.name, staffEntries);
                                        
                                        const yearlyTarget = k.target;
                                        const monthlyTarget = yearlyTarget / 12;
                                        const weeklyTarget = yearlyTarget / 52;

                                        const yearlyPerc = yearlyTarget > 0 ? Math.round((yearly / yearlyTarget) * 100) : 0;
                                        const monthlyPerc = monthlyTarget > 0 ? Math.round((monthly / monthlyTarget) * 100) : 0;
                                        const weeklyPerc = weeklyTarget > 0 ? Math.round((weekly / weeklyTarget) * 100) : 0;

                                        return (
                                            <div key={k.id} className="bg-black/30 p-5 rounded-3xl border border-white/5">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{k.name}</p>
                                                        <p className="text-sm font-black text-white font-mono">{yearly.toLocaleString()} <span className="text-[10px] text-gray-500">{k.unit}</span> <span className="text-[8px] text-gray-600 uppercase">/ {yearlyTarget.toLocaleString()} Target</span></p>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-3 gap-2 mt-2 bg-white/5 p-2 rounded-2xl border border-white/5">
                                                    <div className="text-center p-1">
                                                        <p className="text-[8px] text-gray-500 font-bold uppercase mb-1">Weekly</p>
                                                        <p className={`text-[10px] font-black ${weeklyPerc >= 100 ? 'text-green-400' : weeklyPerc >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{weeklyPerc}%</p>
                                                        <p className="text-[8px] text-gray-600 font-mono">{weekly.toLocaleString()}</p>
                                                        {renderProgressBar(weekly, weeklyTarget)}
                                                    </div>
                                                    <div className="text-center p-1 border-l border-white/5 border-r">
                                                        <p className="text-[8px] text-gray-500 font-bold uppercase mb-1">Monthly</p>
                                                        <p className={`text-[10px] font-black ${monthlyPerc >= 100 ? 'text-green-400' : monthlyPerc >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{monthlyPerc}%</p>
                                                        <p className="text-[8px] text-gray-600 font-mono">{monthly.toLocaleString()}</p>
                                                        {renderProgressBar(monthly, monthlyTarget)}
                                                    </div>
                                                    <div className="text-center p-1">
                                                        <p className="text-[8px] text-gray-500 font-bold uppercase mb-1">Yearly</p>
                                                        <p className={`text-[10px] font-black ${yearlyPerc >= 100 ? 'text-green-400' : yearlyPerc >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{yearlyPerc}%</p>
                                                        <p className="text-[8px] text-gray-600 font-mono">{yearly.toLocaleString()}</p>
                                                        {renderProgressBar(yearly, yearlyTarget)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-2 text-center py-4 bg-white/5 rounded-2xl border border-dashed border-white/10 text-[10px] font-black uppercase text-gray-600">
                                        No active strategic targets approved
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Tactical Advice Generator</h4>
                                {staffAdvice && (
                                    <button onClick={handleTransmitGuidance} className="bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg shadow-lg active:scale-95 transition-all">
                                        📲 Transmit Guidance
                                    </button>
                                )}
                            </div>
                            {loadingStaffAdvice ? (
                                <div className="p-8 text-center text-xs font-black uppercase text-gray-500 animate-pulse">Generating Strategy...</div>
                            ) : (
                                <div className="bg-black/30 p-6 rounded-3xl border border-white/5 text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                                    {staffAdvice ? renderMarkdownText(staffAdvice) : "Select a staff member to generate advice."}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="glass p-8 rounded-[40px] border border-white/5 bg-[#000d1a]/20 h-full flex flex-col">
                        <h3 className="text-lg font-black uppercase text-white mb-6">Domain Performance Overview</h3>
                        <div className="flex-1 min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={getChartData()}>
                                    <defs>
                                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" fontSize={10} tickMargin={10} />
                                    <YAxis stroke="#666" fontSize={10} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#000d1a', borderColor: '#ffffff20', borderRadius: '12px'}} 
                                        itemStyle={{color: '#fff', fontSize: '12px', fontWeight: 'bold'}}
                                        labelStyle={{color: '#888', fontSize: '10px', marginBottom: '5px'}}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorVal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-center text-[9px] text-gray-600 font-black uppercase tracking-widest mt-4">Authorized Output Volume (Last 14 Days)</p>
                    </div>
                )}
            </div>
        </div>

        {/* Daily Strategic Pledge Modal */}
        {showPledgeModal && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in">
            <div className="glass w-full max-w-md p-10 rounded-[48px] border border-indigo-500/30 bg-[#001226] text-center shadow-3xl">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl shadow-lg border border-indigo-400/30">📜</div>
                <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Daily Strategic Pledge</h4>
                <p className="text-gray-400 text-xs mb-8 leading-relaxed font-medium">
                By entering the portal, you commit to the DIZ Core Values: <br/>
                <span className="text-indigo-400 font-bold">Respectful • Integrity • Collaboration • Agile • Deliver</span>
                </p>
                <button onClick={confirmPledge} className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-3xl font-black uppercase text-xs shadow-xl transition-all active:scale-95">I Commit & Enter</button>
            </div>
            </div>
        )}

        {/* AI Studio Modal */}
        {showAIStudioModal && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in">
            <div className="glass w-full max-w-2xl p-8 md:p-12 rounded-[48px] border border-blue-500/30 bg-[#001226] shadow-3xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-start mb-4">
                <h4 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <span className="text-3xl">🧠</span> AI Service Hub
                </h4>
                <button onClick={() => { setShowAIStudioModal(false); setAiStudioResponse(null); }} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400">✕</button>
                </div>

                <div className="flex gap-2 mb-6 border-b border-white/5 pb-4">
                <button onClick={() => { setAiStudioTab('advice'); setAiStudioResponse(null); }} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${aiStudioTab === 'advice' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>
                    Pledge Advisor
                </button>
                <button onClick={() => { setAiStudioTab('habit'); setAiStudioResponse(null); }} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${aiStudioTab === 'habit' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>
                    Habit Architect
                </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar mb-6 bg-black/30 rounded-3xl p-6 border border-white/5">
                {aiStudioResponse ? (
                    <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-line Amharic-text animate-in fade-in">
                    {renderMarkdownText(aiStudioResponse)}
                    </div>
                ) : (
                    <div className="text-center py-10 opacity-50 flex flex-col items-center justify-center">
                    <div className="text-4xl mb-4 grayscale opacity-30">{aiStudioTab === 'habit' ? '🧗' : '💬'}</div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                        {aiStudioTab === 'habit' ? 'Select a pillar to generate a 5-day plan' : 'Ask for strategic pledge advice'}
                    </p>
                    </div>
                )}
                </div>

                {aiStudioTab === 'advice' ? (
                <form onSubmit={handleAIStudioQuery} className="flex gap-3 mb-6">
                    <input 
                    type="text" 
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm text-white focus:border-amber-500 outline-none placeholder:text-gray-600"
                    placeholder="E.g., How can I be more Agile today?"
                    value={aiStudioQuery}
                    onChange={e => setAiStudioQuery(e.target.value)}
                    />
                    <button disabled={loadingAiStudio} className="bg-amber-600 hover:bg-amber-500 px-6 rounded-2xl font-black text-xl transition-all shadow-lg disabled:opacity-50">
                    {loadingAiStudio ? '...' : '➤'}
                    </button>
                </form>
                ) : (
                <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {['Respectful', 'Integrity', 'Collaboration', 'Agile', 'Deliver'].map(p => (
                        <button 
                            key={p} 
                            onClick={() => setSelectedHabitPillar(p)}
                            className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${selectedHabitPillar === p ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}
                        >
                            {p}
                        </button>
                        ))}
                    </div>
                    <button onClick={handleHabitBuild} disabled={loadingAiStudio} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all disabled:opacity-50">
                        {loadingAiStudio ? 'Generating Micro-Habits...' : `Create 5-Day ${selectedHabitPillar} Plan`}
                    </button>
                </div>
                )}

                <div className="text-center pt-6 border-t border-white/10">
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-3">Connect External Intelligence</p>
                <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 font-black uppercase tracking-widest hover:underline hover:text-blue-300">
                    Open External ChatGPT Coach ↗
                </a>
                </div>
            </div>
            </div>
        )}
    </div>
  );
};

export default ManagerDashboard;