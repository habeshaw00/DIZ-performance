
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../services/mockDb';
import { Feedback, UserRole, UserProfile } from '../types';

const ZoneIdeasView: React.FC = () => {
  const { user } = useAuth();
  const [suggestion, setSuggestion] = useState('');
  const [feedbackHistory, setFeedbackHistory] = useState<Feedback[]>([]);
  const [editingIdea, setEditingIdea] = useState<Feedback | null>(null);
  const [replyingTo, setReplyingTo] = useState<Feedback | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    refreshHistory();
  }, [user]);

  const refreshHistory = () => {
    // Innovation Vault is now a personal strategic log shared ONLY with manager
    const history = db.getFeedbackForUser(user!);
    // Filter to show only user's own ideas (if staff) or everything (if manager)
    const filtered = user?.role === UserRole.STAFF 
      ? history.filter(f => f.staffId === user.id)
      : history;
    setFeedbackHistory(filtered.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    if (editingIdea) {
      db.updateFeedback(editingIdea.id, { message: suggestion });
      setEditingIdea(null);
      alert('Strategy entry updated.');
    } else {
      db.addFeedback({ 
        staffId: user!.id, 
        staffName: user!.name, 
        message: suggestion, 
        timestamp: new Date().toISOString(), 
        status: 'new',
        target: 'MANAGER' // Innovations shared only with manager
      });
      alert('Strategic achievement logged to your personal folder.');
    }
    
    setSuggestion('');
    refreshHistory();
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !replyText.trim()) return;
    db.addFeedback({
      staffId: user!.id,
      staffName: user!.name,
      message: replyText,
      timestamp: new Date().toISOString(),
      status: 'reviewed',
      target: replyingTo.staffId,
      parentId: replyingTo.id
    });
    setReplyText('');
    setReplyingTo(null);
    refreshHistory();
    alert("Response transmitted to node.");
  };

  const handleDeleteIdea = (id: string) => {
    if (window.confirm('Erase this log from your strategic vault?')) {
      db.deleteFeedback(id);
      refreshHistory();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-up">
      <div className="flex items-center gap-6 p-8 glass rounded-[40px] border border-indigo-500/20 bg-indigo-600/5 shadow-xl">
        <div className="w-16 h-16 bg-indigo-600/20 rounded-3xl flex items-center justify-center text-3xl shadow-lg border border-indigo-500/30">💡</div>
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">Personal Achievement Folder</h2>
          <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px]">Private Strategic Collaboration with Management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <div className="glass p-10 rounded-[40px] border border-white/10 shadow-2xl bg-[#000d1a]/40 sticky top-8">
            <h3 className="text-xl font-black mb-8 uppercase tracking-tight">{editingIdea ? 'Modify Achievement' : 'Log Achievement'}</h3>
            <div className="bg-indigo-900/20 border border-indigo-500/20 p-5 rounded-2xl mb-6">
               <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest leading-relaxed">
                 🔒 This folder is private. Your innovations and achievements are shared only with Wonde (Manager).
               </p>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="space-y-6">
              <textarea 
                className="w-full bg-black/30 border border-white/10 rounded-3xl p-6 min-h-[150px] text-sm text-white focus:border-indigo-500 outline-none resize-none shadow-inner transition-all" 
                placeholder="Detail your operational achievement or innovation..." 
                value={suggestion} 
                onChange={(e) => setSuggestion(e.target.value)} 
                required
              />
              <button className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-3xl font-black transition-all text-xs uppercase shadow-xl shadow-indigo-600/30 active:scale-95">
                {editingIdea ? 'Update Log' : 'Commit Achievement'}
              </button>
              {editingIdea && <button type="button" onClick={() => { setEditingIdea(null); setSuggestion(''); }} className="w-full text-[10px] font-black uppercase text-red-400 mt-2">Cancel Edit</button>}
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] px-2">Achievement History</h4>
          {feedbackHistory.filter(f => !f.parentId).length === 0 ? (
            <div className="py-24 text-center glass rounded-[40px] border-dashed border-white/10 text-xs font-black uppercase text-gray-600 italic opacity-40">Folder Clear.</div>
          ) : (
            feedbackHistory.filter(f => !f.parentId).map(f => (
              <div key={f.id} className="glass rounded-[40px] border border-white/5 overflow-hidden group shadow-xl">
                <div className="p-8 bg-[#001226]/40 border-b border-white/5 relative">
                  {f.staffId === user?.id && (
                    <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingIdea(f); setSuggestion(f.message); }} className="p-2 bg-blue-600/20 hover:bg-blue-600 rounded-lg text-xs transition-all">✏️</button>
                      <button onClick={() => handleDeleteIdea(f.id)} className="p-2 bg-red-600/20 hover:bg-red-600 rounded-lg text-xs transition-all">🗑️</button>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center font-black shadow-lg">{f.staffName.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black uppercase text-white truncate">{f.staffName}</p>
                      <p className="text-[8px] font-black uppercase text-indigo-400 mt-1">{new Date(f.timestamp).toLocaleDateString()}</p>
                    </div>
                    {user?.role === UserRole.MANAGER && <button onClick={() => setReplyingTo(f)} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[9px] font-black uppercase shadow-lg">Post Feedback</button>}
                  </div>
                  <p className="text-white font-medium text-sm leading-relaxed italic border-l-2 border-indigo-500/30 pl-4">"{f.message}"</p>
                </div>
                
                <div className="bg-black/10 pl-10 pr-6 py-6 space-y-4">
                  {feedbackHistory.filter(reply => reply.parentId === f.id).map(reply => (
                    <div key={reply.id} className="p-5 bg-white/5 rounded-3xl border border-white/5 relative group/reply shadow-inner">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                           <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_5px_indigo]"></span>
                           <p className="text-[10px] font-black text-gray-400 uppercase">{reply.staffName} responded:</p>
                        </div>
                        {reply.staffId === user?.id && <button onClick={() => handleDeleteIdea(reply.id)} className="text-[10px] text-red-400 opacity-0 group-hover/reply:opacity-100 transition-all">🗑️</button>}
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed font-medium italic">"{reply.message}"</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {replyingTo && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
          <div className="glass w-full max-w-lg rounded-[48px] border border-white/10 p-10 shadow-2xl bg-[#000d1a]">
            <h3 className="text-xl font-black text-white uppercase mb-6 text-center">Protocol Response</h3>
            <div className="bg-white/5 p-5 rounded-3xl mb-8 border border-white/5 italic text-sm text-gray-400 shadow-inner">"{replyingTo.message}"</div>
            <form onSubmit={handleReplySubmit} className="space-y-6">
              <textarea required className="w-full bg-black/50 border border-white/10 rounded-3xl p-6 text-sm text-white focus:border-indigo-500 outline-none min-h-[150px] resize-none shadow-inner" placeholder="Type tactical response..." value={replyText} onChange={e => setReplyText(e.target.value)} />
              <div className="flex gap-4">
                <button type="button" onClick={() => setReplyingTo(null)} className="flex-1 bg-white/5 text-gray-400 py-4 rounded-2xl font-black text-[9px] uppercase">Cancel</button>
                <button type="submit" className="flex-2 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[9px] uppercase shadow-xl shadow-indigo-600/20 transition-all">Post Response</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoneIdeasView;
