
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { db } from '../services/mockDb';
import { 
  getKPICoachingTips, 
  generateAdviceAudio, 
  decode, 
  decodeAudioData, 
  getAIFocusAlertTips, 
  getGeneralStaffAdvice, 
  getServiceCultureAdvice,
  getHabitBuildingPlan 
} from '../services/geminiService';
import { APP_CONFIG, MOTIVATIONAL_QUOTES } from '../constants';
import { KPIConfig, DailyEntry, TodoItem, AppLanguage } from '../types';
import ProfilePhotoModal from '../components/ProfilePhotoModal';

const StaffDashboard: React.FC = () => {
  const { user, login, language } = useAuth();
  const [kpis, setKpis] = useState<KPIConfig[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [perfNote, setPerfNote] = useState('');
  const [generalAdvice, setGeneralAdvice] = useState<string | null>(null);
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [kpiTips, setKpiTips] = useState<{ [kpiId: string]: string }>({});
  const [loadingTips, setLoadingTips] = useState<{ [kpiId: string]: boolean }>({});
  
  const [stagedMetrics, setStagedMetrics] = useState<{ [kpiName: string]: number }>({});
  const [selectedKpiIndex, setSelectedKpiIndex] = useState<string>("");
  const [metricInValue, setMetricInValue] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState<{ [kpiId: string]: boolean }>({});

  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [showAIStudioModal, setShowAIStudioModal] = useState(false);
  const [aiStudioTab, setAiStudioTab] = useState<'advice' | 'habit'>('advice');
  const [aiStudioQuery, setAiStudioQuery] = useState('');
  const [aiStudioResponse, setAiStudioResponse] = useState<string | null>(null);
  const [loadingAiStudio, setLoadingAiStudio] = useState(false);
  const [selectedHabitPillar, setSelectedHabitPillar] = useState('Respectful');

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [playingGeneralAudio, setPlayingGeneralAudio] = useState(false);

  useEffect(() => {
    refreshData();
    // Set random quote on mount/login based on language
    const currentQuotes = MOTIVATIONAL_QUOTES[language] || MOTIVATIONAL_QUOTES.en;
    setPerfNote(currentQuotes[Math.floor(Math.random() * currentQuotes.length)]);
    
    // Check for daily pledge session
    const hasPledged = sessionStorage.getItem('pledge_signed');
    if (!hasPledged) {
      setShowPledgeModal(true);
    }

    return () => stopAudio();
  }, [user, language]); 

  const refreshData = () => {
    const data = db.getKPIsForUser(user!.email);
    setKpis(data);
    const staffEntries = db.getEntriesForStaff(user!.id);
    setEntries(staffEntries);
    setTodos(db.getTodosForStaff(user!.id));
    
    // Auto-fetch general advice if we have approved KPIs
    const approved = data.filter(k => k.status === 'approved');
    if (approved.length > 0) fetchGeneralAnalysis(approved, staffEntries);
  };

  const confirmPledge = () => {
    const pledgeText = `✅ Daily Strategy Pledge: I commit to Respectful, Integrity, Collaboration, Agile, and Deliver for ${new Date().toLocaleDateString()}.`;
    db.addTodo(user!.id, pledgeText);
    setTodos(db.getTodosForStaff(user!.id));
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    
    if (language === 'en') {
        if (hour >= 5 && hour < 12) return "Good Morning";
        if (hour >= 12 && hour < 18) return "Good Afternoon";
        return "Good Evening";
    }
    if (language === 'om') {
        if (hour >= 5 && hour < 12) return "Akkam Bultan";
        if (hour >= 12 && hour < 18) return "Akkam Ooltan";
        return "Akkam Bultan"; // Evening greeting similar context
    }
    // Default Amharic
    if (hour >= 5 && hour < 12) return "እንደምን አደሩ";
    if (hour >= 12 && hour < 18) return "እንደምን ዋሉ";
    return "እንደምን አመሹ";
  };

  const fetchGeneralAnalysis = async (staffKPIs: KPIConfig[], staffEntries: DailyEntry[]) => {
    setLoadingGeneral(true);
    try {
      const summary = staffKPIs.map(k => {
        const net = staffEntries.reduce((sum, e) => sum + (e.metrics[k.name] || 0) - (e.metrics[`${k.name} Out`] || 0), 0);
        return { name: k.name, net, target: k.target };
      });
      const advice = await getGeneralStaffAdvice(user!.name, summary, language);
      setGeneralAdvice(advice);
    } catch (e) {
      setGeneralAdvice("Focus on maintaining consistency.");
    } finally {
      setLoadingGeneral(false);
    }
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch(e) {}
      audioSourceRef.current = null;
    }
    setReadingId(null);
    setPlayingGeneralAudio(false);
  };

  const playAdvice = async (id: string, text: string) => {
    if (readingId === id) { stopAudio(); return; }
    stopAudio();
    setReadingId(id);
    try {
      const base64Audio = await generateAdviceAudio(text);
      if (!base64Audio) throw new Error();
      playAudioData(base64Audio, () => setReadingId(null));
    } catch (err) { setReadingId(null); }
  };

  const playGeneralAdviceAudio = async () => {
    if (playingGeneralAudio) { stopAudio(); return; }
    if (!generalAdvice) return;
    stopAudio();
    setPlayingGeneralAudio(true);
    try {
      const base64Audio = await generateAdviceAudio(generalAdvice);
      if (!base64Audio) throw new Error();
      playAudioData(base64Audio, () => setPlayingGeneralAudio(false));
    } catch (err) { setPlayingGeneralAudio(false); }
  };

  const playAudioData = async (base64Audio: string, onEnded: () => void) => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const ctx = audioContextRef.current;
    const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = onEnded;
    audioSourceRef.current = source;
    source.start();
  };

  const fetchTips = async (kpi: KPIConfig, actual: number) => {
    setLoadingTips(prev => ({ ...prev, [kpi.id]: true }));
    try {
      const tips = await getKPICoachingTips(kpi.name, actual, kpi.target, kpi.unit, user!.name, language);
      setKpiTips(prev => ({ ...prev, [kpi.id]: tips }));
    } catch (e) { alert("AI Sync Error."); } finally { setLoadingTips(prev => ({ ...prev, [kpi.id]: false })); }
  };

  const renderMarkdownText = (text: string) => {
     const parts = text.split(/(\[.*?\]\(.*?\))/g);
     return parts.map((part, i) => {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) return <a key={i} href={match[2]} target="_blank" rel="noreferrer" className="text-blue-400 font-black hover:underline mx-1">[{match[1]}]</a>;
        return part;
     });
  };

  const handleStageMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKpiIndex || !metricInValue) return;
    const template = APP_CONFIG.STANDARD_KPI_TEMPLATES[parseInt(selectedKpiIndex)];
    const val = parseFloat(metricInValue);
    if (isNaN(val)) return;
    setStagedMetrics(prev => ({ ...prev, [template.name]: (prev[template.name] || 0) + val }));
    setMetricInValue("");
    setSelectedKpiIndex("");
  };

  const removeFromQueue = (kpiName: string) => {
    const next = { ...stagedMetrics };
    delete next[kpiName];
    setStagedMetrics(next);
  };

  const handleFinalize = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (Object.keys(stagedMetrics).length === 0) return;
    setIsSubmitting(true);
    try {
      db.addEntry({ staffId: user!.id, staffName: user!.name, date: new Date().toISOString().split('T')[0], metrics: stagedMetrics, status: 'pending' });
      const feedback = await getAIFocusAlertTips(user!.name, stagedMetrics, kpis, language);
      setAiFeedback(feedback);
      setEntries(db.getEntriesForStaff(user!.id));
      setStagedMetrics({});
    } catch (err) { alert("Relay error."); } finally { setIsSubmitting(false); }
  };

  const toggleTermAcceptance = (id: string) => {
    setAcceptedTerms(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSignContract = (kpiId: string) => {
    if (!acceptedTerms[kpiId]) return;
    db.staffSignKPI(kpiId);
    refreshData();
  };

  const handleExportCSV = () => {
    const now = new Date();
    const rows = [
      ["STAFF PERFORMANCE MATRIX - NODE: " + user!.name.toUpperCase()],
      ["ID: " + user!.username.toUpperCase(), "BRANCH: " + (user!.branch || 'DIZ branch')],
      ["EXPORTED ON: " + now.toLocaleDateString() + " " + now.toLocaleTimeString()],
      [],
      ["KPI NAME", "UNIT", "NET ACTUAL", "DAILY GOAL", "DAILY %", "WEEKLY GOAL", "WEEKLY %", "MONTHLY GOAL", "MONTHLY %", "YEARLY GOAL", "YEARLY %"]
    ];

    kpis.filter(k => k.status === 'approved').forEach(k => {
      const net = entries.filter(e => e.status === 'authorized').reduce((sum, e) => sum + (e.metrics[k.name] || 0) - (e.metrics[`${k.name} Out`] || 0), 0);
      
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
    link.setAttribute("download", `My_Performance_${user!.username}_${now.getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateTimeFrameMetrics = (kpiName: string, allEntries: DailyEntry[]) => {
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

    allEntries.filter(e => e.status === 'authorized').forEach(e => {
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

  const pendingSignatureKPIs = kpis.filter(k => k.status === 'pending_signature');
  const pendingApprovalKPIs = kpis.filter(k => k.status === 'pending_approval');
  const approvedKPIs = kpis.filter(k => k.status === 'approved');
  const pendingEntries = entries.filter(e => e.status === 'pending');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 px-2 md:px-0">
      {showUploadModal && <ProfilePhotoModal userId={user!.id} onClose={() => setShowUploadModal(false)} onUpdate={(dataUrl) => login({...user!, profilePic: dataUrl})} />}

      <section className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex items-center gap-6 p-6 glass rounded-[32px] border border-blue-500/10 bg-[#000d1a]/40 shadow-xl overflow-hidden relative">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-blue-500/20 bg-[#001f3f] flex items-center justify-center shadow-2xl">
              {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" /> : <div className="text-3xl font-black text-blue-400">{user?.name.charAt(0)}</div>}
            </div>
            <button onClick={() => setShowUploadModal(true)} className="absolute -bottom-1 -right-1 bg-blue-600 text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all text-xs border border-[#001f3f]">📷</button>
          </div>
          <div className="min-w-0">
            <p className="text-blue-400 font-black text-[11px] uppercase tracking-[0.1em] mb-1 Amharic-text">{getGreeting()}፣ {user?.name.split(' ')[0]}! 😊</p>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-2 truncate">{user?.name}</h2>
            <div className="flex gap-2 flex-wrap">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">ID: {user?.username}</span>
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">{user?.branch}</span>
              <button onClick={handleExportCSV} className="text-[8px] font-black text-green-400 uppercase tracking-widest bg-green-900/20 border border-green-500/20 px-2 py-1 rounded-lg hover:bg-green-900/40 transition-all flex items-center gap-1">
                <span>📊</span> Excel Export
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col gap-4">
           <div className="p-6 rounded-[32px] border border-white/5 bg-white/5 backdrop-blur-md flex-1 flex flex-col justify-center text-center">
             <p className="text-sm md:text-base font-bold leading-relaxed px-6 Amharic-text text-blue-100 italic">"{perfNote}"</p>
           </div>
           
           {/* Service Culture & AI Studio Buttons */}
           <div className="flex gap-3">
              <button 
                onClick={() => { setAiStudioQuery("Give me a tip based on the Service Culture Pledge"); setAiStudioTab('advice'); setShowAIStudioModal(true); }}
                className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 py-3 rounded-2xl font-black uppercase text-[10px] text-white shadow-lg transition-all border border-amber-500/30 flex items-center justify-center gap-2"
              >
                <span>🛡️</span> Service Pledge AI
              </button>
              <button 
                onClick={() => { setAiStudioTab('habit'); setShowAIStudioModal(true); }}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 py-3 rounded-2xl font-black uppercase text-[10px] text-white shadow-lg transition-all border border-blue-500/30 flex items-center justify-center gap-2"
              >
                <span>🧠</span> Habit Architect
              </button>
           </div>
        </div>
      </section>

      {/* KPI Signature Alert Section */}
      {(pendingSignatureKPIs.length > 0 || pendingApprovalKPIs.length > 0) && (
        <section className="glass p-8 rounded-[40px] border border-amber-500/30 bg-amber-600/10 animate-fade-up shadow-3xl">
          <div className="flex items-center gap-4 mb-6">
             <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center text-2xl animate-bounce">✍️</div>
             <div>
                <h3 className="text-lg font-black uppercase text-amber-500 tracking-tight">Pending Strategic Targets</h3>
                <p className="text-[10px] text-amber-200/60 font-bold uppercase tracking-widest">Please review and sign your new performance contracts</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Active Signing Required */}
            {pendingSignatureKPIs.map(k => (
              <div key={k.id} className="bg-black/40 p-6 rounded-3xl border border-amber-500/20 relative overflow-hidden flex flex-col">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{k.name}</p>
                       <p className="text-2xl font-black text-white font-mono">{k.target.toLocaleString()} <span className="text-xs text-gray-500">{k.unit}</span></p>
                    </div>
                 </div>
                 
                 <div className="mt-auto space-y-3">
                    <div 
                      onClick={() => toggleTermAcceptance(k.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${acceptedTerms[k.id] ? 'bg-amber-600/20 border-amber-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                    >
                       <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${acceptedTerms[k.id] ? 'bg-amber-500 border-amber-500 text-black' : 'border-gray-500'}`}>
                          {acceptedTerms[k.id] && <span className="font-bold text-xs">✓</span>}
                       </div>
                       <p className="text-[9px] font-black uppercase text-gray-300">Seen & Signed</p>
                    </div>

                    <button 
                      onClick={() => handleSignContract(k.id)} 
                      disabled={!acceptedTerms[k.id]}
                      className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:bg-gray-700 py-3 rounded-xl font-black uppercase text-[10px] text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      Send Back to Approver
                    </button>
                 </div>
              </div>
            ))}

            {/* Waiting for Approval */}
            {pendingApprovalKPIs.map(k => (
              <div key={k.id} className="bg-black/20 p-6 rounded-3xl border border-white/5 relative overflow-hidden opacity-75">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{k.name}</p>
                       <p className="text-xl font-black text-gray-400 font-mono">{k.target.toLocaleString()} <span className="text-xs text-gray-600">{k.unit}</span></p>
                    </div>
                 </div>
                 <div className="mt-4 flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <p className="text-[9px] font-black uppercase text-yellow-500 tracking-widest">Sent • Waiting Approval</p>
                 </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="glass p-8 rounded-[40px] border border-white/10 bg-blue-600/5 animate-fade-up relative">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-blue-400 flex items-center gap-3">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span> Strategic Intelligence Log
          </h3>
          <div className="flex gap-2">
             <button onClick={playGeneralAdviceAudio} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${playingGeneralAudio ? 'bg-red-600 animate-pulse text-white' : 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20'}`} title="Listen to Analysis">
               {playingGeneralAudio ? '🔇' : '🔊'}
             </button>
             {generalAdvice && (
               <button onClick={() => setGeneralAdvice(null)} className="text-[10px] font-black uppercase text-gray-500 hover:text-white px-2">✕ Close</button>
             )}
          </div>
        </div>
        {loadingGeneral ? (
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-4 h-4 bg-blue-500/20 rounded-full"></div>
            <p className="text-[10px] text-gray-500 font-black uppercase">Analyzing Domain Metrics...</p>
          </div>
        ) : (
          <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line border-l-2 border-blue-500/20 pl-6 italic font-medium Amharic-text">
            {generalAdvice ? renderMarkdownText(generalAdvice) : "Awaiting transmission data..."}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-8 rounded-[40px] border border-white/5 bg-[#000d1a]/20 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 flex items-center gap-3 mb-10">የሥራ አፈጻጸም ማዕከል</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {approvedKPIs.map(kpi => {
                const { yearly, monthly, weekly } = calculateTimeFrameMetrics(kpi.name, entries);
                
                const yearlyTarget = kpi.target;
                const monthlyTarget = yearlyTarget / 12;
                const weeklyTarget = yearlyTarget / 52;

                const yearlyPerc = yearlyTarget > 0 ? Math.round((yearly / yearlyTarget) * 100) : 0;
                const monthlyPerc = monthlyTarget > 0 ? Math.round((monthly / monthlyTarget) * 100) : 0;
                const weeklyPerc = weeklyTarget > 0 ? Math.round((weekly / weeklyTarget) * 100) : 0;
                
                return (
                  <div key={kpi.id} className="bg-[#001f3f]/40 p-6 rounded-[32px] border border-white/5 group transition-all hover:bg-[#001f3f]/60">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase mb-2 truncate max-w-[150px]">{kpi.name}</p>
                        <p className="text-2xl font-black text-white font-mono leading-none">
                          {yearly.toLocaleString()} <span className="text-xs text-gray-500">{kpi.unit}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => fetchTips(kpi, yearly)} className="bg-blue-600/10 hover:bg-blue-600/20 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-500/20">AI Tips</button>
                        {kpiTips[kpi.id] && <button onClick={() => playAdvice(kpi.id, kpiTips[kpi.id])} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${readingId === kpi.id ? 'bg-red-600 animate-pulse' : 'bg-blue-600/10 border border-blue-500/20'}`}>{readingId === kpi.id ? '🔇' : '🔊'}</button>}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 bg-black/20 p-2 rounded-2xl border border-white/5">
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

                    {kpiTips[kpi.id] && (
                      <div className="mt-4 p-4 bg-black/40 border border-blue-500/10 rounded-2xl text-[11px] text-gray-300 leading-relaxed whitespace-pre-line Amharic-text relative animate-in fade-in">
                        <button onClick={() => { const n = {...kpiTips}; delete n[kpi.id]; setKpiTips(n); }} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-red-500 hover:text-white rounded-full text-[10px] font-bold transition-all">✕</button>
                        {renderMarkdownText(kpiTips[kpi.id])}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="glass p-8 rounded-[40px] border border-white/10 bg-[#000d1a]/40 shadow-3xl h-full flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-400 Amharic-text mb-2">የግል ግምገማ እና ማስታወሻ</h3>
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-8">🔒 Private Vault</p>
            <form onSubmit={(e) => { e.preventDefault(); if(newTodo.trim()){ db.addTodo(user!.id, newTodo); setTodos(db.getTodosForStaff(user!.id)); setNewTodo(''); } }} className="flex gap-2 mb-8">
              <input type="text" className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white outline-none focus:border-blue-500 shadow-inner" placeholder="New Strategy Note..." value={newTodo} onChange={(e) => setNewTodo(e.target.value)} />
              <button type="submit" className="bg-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg transition-all active:scale-90">+</button>
            </form>
            <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2 min-h-[400px]">
              {todos.map(todo => (
                <div key={todo.id} className="p-5 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group/todo hover:bg-white/[0.08] transition-all">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <input type="checkbox" checked={todo.completed} onChange={() => { db.toggleTodo(todo.id); setTodos(db.getTodosForStaff(user!.id)); }} className="w-6 h-6 accent-blue-500 cursor-pointer rounded-xl border-white/10" />
                    <p className={`text-[11px] font-bold truncate ${todo.completed ? 'line-through text-gray-600 italic' : 'text-gray-200'}`}>{todo.task}</p>
                  </div>
                  <button onClick={() => { db.deleteTodo(todo.id); setTodos(db.getTodosForStaff(user!.id)); }} className="text-red-400/40 hover:text-red-400 p-2 transition-all opacity-0 group-hover/todo:opacity-100">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="glass p-10 rounded-[48px] border border-white/5 bg-[#000d1a]/40 shadow-3xl mt-10">
        <form onSubmit={handleStageMetric} className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">የሥራ ሪፖርት ማስተላለፊያ</h3>
            <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl mb-4">
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest leading-relaxed">
                Use templates ending with "Out" to log cash outflows/deposits out.
              </p>
            </div>
            <select className="w-full bg-[#001f3f] border border-white/10 rounded-2xl p-5 text-sm text-white font-bold outline-none focus:border-blue-500 transition-all shadow-inner" value={selectedKpiIndex} onChange={e => setSelectedKpiIndex(e.target.value)} required>
              <option value="">ዘርፍ ይምረጡ...</option>
              {APP_CONFIG.STANDARD_KPI_TEMPLATES.map((t, i) => (
                <option key={i} value={i}>{t.name} ({t.unit})</option>
              ))}
            </select>
            <input type="number" step="any" className="w-full bg-[#001f3f] border border-white/10 rounded-2xl p-5 text-sm text-white font-mono outline-none" placeholder="ቁጥር ያስገቡ..." value={metricInValue} onChange={e => setMetricInValue(e.target.value)} required />
            <button className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">ወደ ወረፋ ያስገቡ</button>
          </div>
          <div className="flex flex-col bg-black/30 p-8 rounded-[40px] border border-white/5">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 px-1">የተመዘገቡ መረጃዎች (Staging Queue)</h3>
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
              {Object.entries(stagedMetrics).map(([name, val]) => (
                <div key={name} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl group hover:bg-white/10 transition-all">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase truncate pr-4">{name}</span>
                    <span className="text-sm font-black text-white font-mono">+{val.toLocaleString()}</span>
                  </div>
                  <button onClick={() => removeFromQueue(name)} className="text-red-400 p-2 hover:bg-red-400/20 rounded-lg text-xs transition-all">✕ Remove</button>
                </div>
              ))}
              {Object.keys(stagedMetrics).length === 0 && <p className="text-center py-10 text-[9px] font-black uppercase text-gray-700 tracking-widest">Queue Null</p>}
            </div>
            {Object.keys(stagedMetrics).length > 0 && (
              <button onClick={handleFinalize} disabled={isSubmitting} className="w-full bg-green-600 mt-8 py-5 rounded-[24px] font-black uppercase text-xs shadow-xl active:scale-95 transition-all">ሪፖርቱን በይፋ ላክ</button>
            )}
          </div>
        </form>
      </section>

      {/* Pending Auth Section (Sent Items) */}
      {pendingEntries.length > 0 && (
        <section className="glass p-10 rounded-[48px] border border-white/5 bg-[#000d1a]/40 shadow-3xl mt-10 animate-fade-up">
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">⏳</span>
                <h3 className="text-lg font-black uppercase tracking-tight text-amber-500">Pending Authorization Queue</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingEntries.map(entry => (
                    <div key={entry.id} className="bg-black/40 p-5 rounded-3xl border border-amber-500/20 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{entry.date}</span>
                            <span className="px-3 py-1 bg-amber-600/20 text-amber-500 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">Sent to Manager</span>
                        </div>
                        <div className="space-y-2">
                            {Object.entries(entry.metrics).map(([k,v]) => (
                                <div key={k} className="flex justify-between items-center">
                                    <span className="text-[10px] text-gray-400 font-bold truncate max-w-[150px]">{k}</span>
                                    <span className="text-xs font-mono text-white">{v.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
      )}

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

      {/* AI Studio Intelligence Sync Modal */}
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

      {aiFeedback && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in">
          <div className="glass w-full max-w-lg p-12 rounded-[64px] border border-blue-500/20 bg-[#001f3f] flex flex-col items-center shadow-3xl text-center">
            <div className="text-6xl mb-8 animate-bounce">🚀</div>
            <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-8">Transmission Confirmed</h4>
            <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-line font-medium mb-12 italic Amharic-text text-center">
              {renderMarkdownText(aiFeedback)}
            </div>
            <button onClick={() => setAiFeedback(null)} className="w-full bg-blue-600 py-6 rounded-[32px] font-black uppercase text-xs active:scale-95 transition-all">ተመለስ</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
