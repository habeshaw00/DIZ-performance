
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { db } from '../services/mockDb';
import { getKPICoachingTips, generateAdviceAudio, decode, decodeAudioData, getAIFocusAlertTips, getGeneralStaffAdvice } from '../services/geminiService';
import { APP_CONFIG, MOTIVATIONAL_QUOTES_AMHARIC } from '../constants';
import { KPIConfig, DailyEntry, TodoItem } from '../types';
import ProfilePhotoModal from '../components/ProfilePhotoModal';

const StaffDashboard: React.FC = () => {
  const { user, login } = useAuth();
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);

  useEffect(() => {
    const data = db.getKPIsForUser(user!.email);
    setKpis(data);
    const staffEntries = db.getEntriesForStaff(user!.id);
    setEntries(staffEntries);
    setTodos(db.getTodosForStaff(user!.id));
    setPerfNote(MOTIVATIONAL_QUOTES_AMHARIC[Math.floor(Math.random() * MOTIVATIONAL_QUOTES_AMHARIC.length)]);
    if (data.length > 0) fetchGeneralAnalysis(data, staffEntries);
    return () => stopAudio();
  }, [user]);

  const fetchGeneralAnalysis = async (staffKPIs: KPIConfig[], staffEntries: DailyEntry[]) => {
    setLoadingGeneral(true);
    try {
      const summary = staffKPIs.map(k => {
        const net = staffEntries.reduce((sum, e) => sum + (e.metrics[k.name] || 0) - (e.metrics[`${k.name} Out`] || 0), 0);
        return { name: k.name, net, target: k.target };
      });
      const advice = await getGeneralStaffAdvice(user!.name, summary);
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
  };

  const playAdvice = async (id: string, text: string) => {
    if (readingId === id) { stopAudio(); return; }
    stopAudio();
    setReadingId(id);
    try {
      const base64Audio = await generateAdviceAudio(text);
      if (!base64Audio) throw new Error();
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setReadingId(null);
      audioSourceRef.current = source;
      source.start();
    } catch (err) { setReadingId(null); }
  };

  const fetchTips = async (kpi: KPIConfig, actual: number) => {
    setLoadingTips(prev => ({ ...prev, [kpi.id]: true }));
    try {
      const tips = await getKPICoachingTips(kpi.name, actual, kpi.target, kpi.unit, user!.name);
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
      const feedback = await getAIFocusAlertTips(user!.name, stagedMetrics, kpis);
      setAiFeedback(feedback);
      setEntries(db.getEntriesForStaff(user!.id));
      setStagedMetrics({});
    } catch (err) { alert("Relay error."); } finally { setIsSubmitting(false); }
  };

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
            <p className="text-blue-400 font-black text-[11px] uppercase tracking-[0.1em] mb-1 Amharic-text">እንደምን ዋሉ፣ {user?.name.split(' ')[0]}! 😊</p>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-2 truncate">{user?.name}</h2>
            <div className="flex gap-2">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">ID: {user?.username}</span>
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">{user?.branch}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 p-8 rounded-[32px] border border-white/5 bg-white/5 backdrop-blur-md flex flex-col justify-center text-center">
          <p className="text-sm md:text-base font-bold leading-relaxed px-6 Amharic-text text-blue-100 italic">"{perfNote}"</p>
        </div>
      </section>

      <section className="glass p-8 rounded-[40px] border border-white/10 bg-blue-600/5 animate-fade-up relative">
        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-blue-400 flex items-center gap-3 mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span> Strategic Intelligence Log
        </h3>
        {generalAdvice && (
          <button onClick={() => setGeneralAdvice(null)} className="absolute top-8 right-8 text-[10px] font-black uppercase text-gray-500 hover:text-white">መዝጊያ ✕</button>
        )}
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
              {kpis.map(kpi => {
                const staffEntries = entries.filter(e => e.status === 'authorized');
                // Net Performance = Deposits - Cash Outs (Outflow templates handle this)
                const net = staffEntries.reduce((sum, e) => sum + (e.metrics[kpi.name] || 0) - (e.metrics[`${kpi.name} Out`] || 0), 0);
                const perc = kpi.target > 0 ? Math.round((net / kpi.target) * 100) : 0;
                
                return (
                  <div key={kpi.id} className="bg-[#001f3f]/40 p-6 rounded-[32px] border border-white/5 group transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase mb-2">{kpi.name}</p>
                        <p className="text-2xl font-black text-white font-mono leading-none">{net.toLocaleString()} <span className="text-xs text-gray-500">{kpi.unit}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => fetchTips(kpi, net)} className="bg-blue-600/10 hover:bg-blue-600/20 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-500/20">{loadingTips[kpi.id] ? '...' : '✨ AI Tips'}</button>
                        {kpiTips[kpi.id] && <button onClick={() => playAdvice(kpi.id, kpiTips[kpi.id])} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${readingId === kpi.id ? 'bg-red-600 animate-pulse' : 'bg-blue-600/10 border border-blue-500/20'}`}>{readingId === kpi.id ? '🔇' : '🔊'}</button>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase">
                        <span className="text-gray-500">Progress to Goal</span>
                        <span className={perc >= 100 ? 'text-green-400' : 'text-blue-300'}>{perc}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className={`h-full transition-all duration-1000 ${perc >= 100 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-blue-600'}`} style={{ width: `${Math.min(perc, 100)}%` }}></div>
                      </div>
                    </div>
                    {kpiTips[kpi.id] && (
                      <div className="mt-4 p-4 bg-black/40 border border-blue-500/10 rounded-2xl text-[11px] text-gray-300 leading-relaxed whitespace-pre-line Amharic-text relative">
                        <button onClick={() => { const n = {...kpiTips}; delete n[kpi.id]; setKpiTips(n); }} className="absolute top-2 right-2 text-[8px] text-gray-600 hover:text-white uppercase">መዝጊያ</button>
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
