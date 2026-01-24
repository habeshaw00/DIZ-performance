
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { useAuth } from '../App';
import { Feedback, UserRole, UserProfile } from '../types';

const RequestHub: React.FC = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(['STAFF_ALL']);
  const [replyingTo, setReplyingTo] = useState<Feedback | null>(null);
  const [editingSuggestion, setEditingSuggestion] = useState<Feedback | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    refresh();
    setAllUsers(db.getAllUsers());
    // Mark seen by owner when entering portal
    if (user && (user.role === UserRole.MANAGER || user.role === UserRole.CSM)) {
      db.markHubViewed(user.id);
    }
  }, [user]);

  const refresh = () => {
    const history = db.getRequestsForHub(user!);
    setFeedbacks(history.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;
    const targetString = selectedRecipients.join(',');
    if (editingSuggestion) {
      db.updateFeedback(editingSuggestion.id, { message: suggestion, target: targetString });
      setEditingSuggestion(null);
      alert('Updated.');
    } else {
      db.addFeedback({ 
        staffId: user!.id, staffName: user!.name, message: suggestion, timestamp: new Date().toISOString(), status: 'new', target: targetString
      });
      alert('Broadcasted!');
    }
    setSuggestion('');
    refresh();
  };

  const handleReaction = (id: string, emoji: string) => {
    db.toggleReaction(id, emoji, user!.id);
    refresh();
  };

  const toggleRecipient = (id: string) => {
    if (id === 'STAFF_ALL') { setSelectedRecipients(['STAFF_ALL']); return; }
    const filtered = selectedRecipients.filter(r => r !== 'STAFF_ALL');
    if (filtered.includes(id)) {
      const next = filtered.filter(r => r !== id);
      setSelectedRecipients(next.length === 0 ? ['STAFF_ALL'] : next);
    } else {
      setSelectedRecipients([...filtered, id]);
    }
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !replyText.trim()) return;
    db.addFeedback({
      staffId: user!.id, staffName: user!.name, message: replyText, timestamp: new Date().toISOString(), status: 'reviewed', target: replyingTo.staffId, parentId: replyingTo.id
    });
    alert('Interaction posted.');
    setReplyingTo(null);
    setReplyText('');
    refresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Strict Erasure: Permanent delete of this post/comment?')) { 
      db.deleteFeedback(id); 
      refresh(); 
    }
  };

  const getRecipientNames = (target: string) => {
    if (target === 'STAFF_ALL') return 'Global Team';
    const ids = target.split(',');
    return ids.map(id => allUsers.find(u => u.id === id)?.name.split(' ')[0] || id).join(', ');
  };

  return (
    <div className="space-y-8 pb-10 max-w-6xl mx-auto">
      <div className="p-6 glass rounded-3xl border border-blue-500/20 bg-blue-600/5 shadow-lg flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Request Hub</h2>
          <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-1">Interactive Node Coordination</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="glass p-8 rounded-3xl border border-white/10 shadow-xl bg-[#000d1a]/40 sticky top-4">
            <h3 className="text-sm font-black mb-6 uppercase tracking-tight">New Broadcast / Request</h3>
            <form onSubmit={handlePostSubmit} className="space-y-4">
              <div className="max-h-40 overflow-y-auto custom-scrollbar p-4 bg-black/30 rounded-2xl border border-white/10 space-y-2">
                 <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={selectedRecipients.includes('STAFF_ALL')} onChange={() => toggleRecipient('STAFF_ALL')} className="accent-blue-600 w-4 h-4 rounded" />
                    <span className="text-[10px] font-bold text-gray-300 group-hover:text-white uppercase">Global Team</span>
                 </label>
                 {allUsers.filter(u => u.id !== user?.id).map(u => (
                    <label key={u.id} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={selectedRecipients.includes(u.id)} onChange={() => toggleRecipient(u.id)} className="accent-blue-600 w-4 h-4 rounded" />
                      <span className="text-[10px] font-bold text-gray-300 group-hover:text-white uppercase truncate">{u.name.split(' ')[0]}</span>
                    </label>
                 ))}
              </div>
              <textarea className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 min-h-[120px] text-xs text-white focus:border-blue-500 outline-none resize-none" placeholder="Strategic request, idea, or comment..." value={suggestion} onChange={(e) => setSuggestion(e.target.value)} required />
              <button className="w-full bg-blue-600 hover:bg-blue-500 py-3.5 rounded-2xl font-black transition-all text-[10px] uppercase shadow-lg active:scale-95">
                {editingSuggestion ? 'Update Post' : 'Broadcast Interaction'}
              </button>
              {editingSuggestion && <button type="button" onClick={() => {setEditingSuggestion(null); setSuggestion('');}} className="w-full text-[9px] font-black uppercase text-red-400">Cancel</button>}
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {feedbacks.length === 0 ? (
            <div className="py-20 text-center glass rounded-[40px] border border-dashed border-white/5 opacity-40">
              <p className="text-[10px] font-black uppercase tracking-widest">Stream Idle</p>
            </div>
          ) : (
            feedbacks.map(f => (
              <div key={f.id} className="glass rounded-3xl border border-white/5 overflow-hidden shadow-lg bg-[#001226]/40 relative">
                {!f.viewedByPortalOwner && (user?.role === UserRole.MANAGER || user?.role === UserRole.CSM) && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]"></div>
                )}
                <div className="p-6 border-b border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-black text-xs overflow-hidden border border-blue-500/20">
                        {allUsers.find(u => u.id === f.staffId)?.profilePic ? <img src={allUsers.find(u => u.id === f.staffId)?.profilePic} className="w-full h-full object-cover" /> : f.staffName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-xs text-white uppercase">{f.staffName}</p>
                        <p className="text-[8px] text-blue-400 uppercase font-black mt-1">To: {getRecipientNames(f.target)}</p>
                      </div>
                    </div>
                    {(f.staffId === user?.id || user?.role === UserRole.MANAGER || user?.role === UserRole.CSM) && (
                      <div className="flex gap-2">
                         {f.staffId === user?.id && <button onClick={() => { setEditingSuggestion(f); setSuggestion(f.message); setSelectedRecipients(f.target.split(',')); }} className="p-1.5 hover:bg-blue-600/20 rounded-lg text-xs">✏️</button>}
                         <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-red-600/20 rounded-lg text-xs text-red-400">🗑️</button>
                      </div>
                    )}
                  </div>
                  <div className="bg-black/30 p-5 rounded-2xl mb-4 italic text-gray-200 text-sm leading-relaxed border-l-2 border-l-blue-500">
                    "{f.message}"
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {['👍', '💡', '🔥', '🚀'].map(emoji => {
                        const count = f.reactions?.[emoji]?.length || 0;
                        const reacted = f.reactions?.[emoji]?.includes(user?.id || '');
                        return (
                          <button 
                            key={emoji} 
                            onClick={() => handleReaction(f.id, emoji)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-2 ${reacted ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}
                          >
                            {emoji} {count > 0 && <span className="text-[10px]">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setReplyingTo(f)} className="px-5 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl text-[9px] font-black uppercase text-blue-400 transition-all">Reply / Comment</button>
                  </div>
                </div>

                <div className="bg-black/10 pl-8 pr-4 py-4 space-y-3">
                  {db.getRepliesForParent(f.id, user!).map(reply => (
                    <div key={reply.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 relative group/reply shadow-inner">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase">{reply.staffName} responded:</p>
                        {(reply.staffId === user?.id || user?.role === UserRole.MANAGER || user?.role === UserRole.CSM) && (
                          <button onClick={() => handleDelete(reply.id)} className="text-[9px] text-red-400 hover:scale-110 transition-all">🗑️</button>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 leading-snug italic">"{reply.message}"</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {replyingTo && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="glass w-full max-w-lg rounded-[40px] border border-white/10 p-8 bg-[#001226] shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6 uppercase text-center">Node Interaction</h3>
            <div className="bg-black/30 p-4 rounded-2xl mb-6 text-xs text-gray-400 italic">Replying to: {replyingTo.message.substring(0, 50)}...</div>
            <textarea required className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-xs text-white outline-none min-h-[120px] mb-6 resize-none" placeholder="Type private or public reply..." value={replyText} onChange={e => setReplyText(e.target.value)} />
            <div className="flex gap-4">
              <button type="button" onClick={() => { setReplyingTo(null); setReplyText(''); }} className="flex-1 bg-white/5 py-4 rounded-2xl font-black uppercase text-[9px] text-gray-400">Cancel</button>
              <button onClick={handleReplySubmit} className="flex-2 bg-blue-600 py-4 rounded-2xl font-black uppercase text-[9px] text-white shadow-lg active:scale-95 transition-all">Post Interaction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestHub;
