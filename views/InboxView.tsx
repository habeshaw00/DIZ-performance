
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../services/mockDb';
import { Message, Feedback, UserRole } from '../types';

const InboxView: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [comment, setComment] = useState('');
  const [interactionType, setInteractionType] = useState<'comment' | 'idea' | 'suggestion' | 'reaction'>('comment');
  const [replies, setReplies] = useState<Feedback[]>([]);

  useEffect(() => {
    refreshMessages();
  }, [user]);

  useEffect(() => {
    if (selectedMsg && user) {
      setReplies(db.getRepliesForParent(selectedMsg.id, user));
    }
  }, [selectedMsg, user]);

  const refreshMessages = () => {
    setMessages(db.getMessagesForUser(user!.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const handleRead = (msg: Message) => {
    setSelectedMsg(msg);
    db.markMessageAsRead(msg.id, user!.id);
    refreshMessages();
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !selectedMsg || !user) return;
    
    db.addFeedback({
      staffId: user.id,
      staffName: user.name,
      message: `${interactionType.toUpperCase()}: ${comment}`,
      timestamp: new Date().toISOString(),
      status: 'reviewed',
      target: selectedMsg.fromId,
      parentId: selectedMsg.id
    });

    alert(`${interactionType} posted to command node.`);
    setComment('');
    setReplies(db.getRepliesForParent(selectedMsg.id, user));
  };

  const getAttachmentIcon = (type: string) => {
    switch(type) {
      case 'video': return '🎬';
      case 'link': return '🔗';
      case 'image': return '🖼️';
      default: return '📄';
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-up flex flex-col gap-6 md:gap-10 pb-20">
      <section className="space-y-6">
        <div className="flex items-center gap-4 p-6 md:p-8 glass rounded-[32px] md:rounded-[40px] border border-blue-500/20 bg-blue-600/5 shadow-xl">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl md:text-3xl shadow-lg border border-blue-400/30 shrink-0">📣</div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none">Command Center</h2>
            <p className="text-blue-500 font-black uppercase tracking-widest text-[8px] md:text-[9px] mt-1">Directives & Node Sync</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-8 min-h-[600px]">
        {/* Navigation Stream - Hidden on mobile if a message is selected */}
        <div className={`lg:w-80 flex flex-col gap-6 ${selectedMsg ? 'hidden lg:flex' : 'flex'}`}>
          <div className="glass rounded-[32px] border border-white/5 flex-1 overflow-hidden flex flex-col bg-[#000d1a]/60 shadow-inner">
            <div className="p-3 border-b border-white/5 bg-white/5">
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Protocol Log</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {messages.map(msg => (
                <div key={msg.id} onClick={() => handleRead(msg)} className={`p-4 rounded-[20px] border cursor-pointer transition-all relative group ${selectedMsg?.id === msg.id ? 'bg-blue-600/20 border-blue-500/50' : 'bg-[#001226]/60 border-white/5 hover:border-white/10'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${msg.type === 'priority' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>{msg.type}</span>
                    {!msg.readBy.includes(user!.id) && <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>}
                  </div>
                  <p className="text-[10px] font-black text-white uppercase truncate mb-1">{msg.fromName}</p>
                  <p className="text-[8px] text-gray-500 line-clamp-1 font-medium">{msg.content}</p>
                </div>
              ))}
              {messages.length === 0 && <div className="py-20 text-center text-[9px] text-gray-600 font-black uppercase tracking-widest italic opacity-40">Stream Idle</div>}
            </div>
          </div>
        </div>

        {/* Transmission Viewer - Occupies full space on mobile if a message is selected */}
        <div className={`flex-1 flex flex-col gap-6 overflow-hidden ${selectedMsg ? 'flex' : 'hidden lg:flex'}`}>
          {selectedMsg ? (
            <div className="flex flex-col h-full gap-4 md:gap-6 overflow-y-auto custom-scrollbar pr-1 md:pr-4">
              <button 
                onClick={() => setSelectedMsg(null)}
                className="lg:hidden self-start mb-2 px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                ← Back to List
              </button>

              <div className="glass rounded-[36px] md:rounded-[56px] border border-white/10 p-6 md:p-12 shadow-2xl relative overflow-hidden bg-[#001226]/95 flex flex-col animate-in slide-in-from-right-4 duration-500">
                <div className="absolute top-0 right-0 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-blue-500/5 blur-[100px] md:blur-[150px] rounded-full pointer-events-none"></div>
                <div className="flex justify-between items-start mb-8 md:mb-12 relative z-10 border-b border-white/5 pb-6 md:pb-10">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className={`px-4 py-1.5 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-lg ${selectedMsg.type === 'priority' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>{selectedMsg.type}</span>
                      <span className="text-gray-500 font-black text-[8px] uppercase tracking-widest">{new Date(selectedMsg.timestamp).toLocaleString('en-GB')}</span>
                    </div>
                    <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter leading-tight mb-2">Protocol Transmission</h3>
                    <p className="text-blue-400 font-black text-[10px] md:text-xs uppercase tracking-widest truncate">Entity: {selectedMsg.fromName}</p>
                  </div>
                  <button onClick={() => setSelectedMsg(null)} className="hidden lg:block p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all shrink-0">✕</button>
                </div>
                
                <div className="bg-[#001f3f]/90 p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-white/5 shadow-inner mb-6 md:mb-10 relative z-10 flex flex-col justify-center text-center md:text-left">
                  <p className="text-white leading-[1.6] md:leading-[1.8] font-semibold whitespace-pre-line text-base md:text-lg italic px-2">"{selectedMsg.content}"</p>
                </div>

                {selectedMsg.attachment && (
                  <div className="relative z-10 p-5 md:p-8 bg-white/5 rounded-[24px] md:rounded-[40px] border border-white/5 hover:border-blue-500/30 transition-all">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4 md:gap-6 text-center sm:text-left">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600/20 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl shadow-lg shrink-0">{getAttachmentIcon(selectedMsg.attachment.type)}</div>
                        <div className="min-w-0">
                          <p className="text-white font-black uppercase text-sm md:text-base mb-1 truncate max-w-[200px]">{selectedMsg.attachment.name}</p>
                          <p className="text-[8px] md:text-[9px] text-blue-400 font-black uppercase tracking-widest">Type: {selectedMsg.attachment.type}</p>
                        </div>
                      </div>
                      <a href={`${selectedMsg.attachment.url}`} target="_blank" rel="noreferrer" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl md:rounded-[20px] font-black uppercase tracking-widest text-[9px] text-center shadow-lg transition-all active:scale-95">Open Asset</a>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 px-1 md:px-4">
                 <h4 className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest">Responses ({replies.length})</h4>
                 <div className="space-y-3">
                    {replies.map(r => (
                      <div key={r.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 animate-in slide-in-from-left-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[7px] md:text-[8px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded uppercase font-black">{r.staffName.split(' ')[0]}</span>
                          <span className="text-[7px] md:text-[8px] text-gray-600 font-black">{new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-[10px] md:text-[11px] text-gray-300 font-medium italic leading-snug">"{r.message}"</p>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="glass rounded-[32px] md:rounded-[40px] border border-white/10 p-4 md:p-6 bg-[#000d1a]/80 shadow-2xl flex flex-col gap-4 sticky bottom-0 z-10 backdrop-blur-xl">
                 <div className="flex flex-wrap gap-1.5">
                    {['comment', 'idea', 'suggestion', 'reaction'].map(type => (
                      <button key={type} onClick={() => setInteractionType(type as any)} className={`px-3 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${interactionType === type ? 'bg-blue-600 text-white scale-105 shadow-blue-600/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
                        {type}
                      </button>
                    ))}
                 </div>
                 <form onSubmit={handleSendComment} className="flex items-center gap-3">
                    <input 
                      type="text" 
                      placeholder={`Type ${interactionType}...`} 
                      className="flex-1 bg-black/40 border border-white/5 rounded-xl md:rounded-2xl py-2.5 md:py-3 outline-none text-white text-xs md:text-sm px-4 md:px-6 shadow-inner" 
                      value={comment} 
                      onChange={e => setComment(e.target.value)} 
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-5 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-[18px] font-black uppercase tracking-widest text-[8px] md:text-[9px] transition-all shrink-0">Post</button>
                 </form>
              </div>
            </div>
          ) : (
            <div className="glass rounded-[32px] md:rounded-[56px] border border-white/5 flex flex-col items-center justify-center h-full min-h-[500px] border-dashed bg-[#000d1a]/20">
              <div className="w-16 h-16 md:w-20 bg-white/5 rounded-full flex items-center justify-center text-3xl md:text-4xl mb-4 md:mb-6 grayscale opacity-30">📩</div>
              <p className="text-gray-600 font-black uppercase tracking-[0.5em] text-[8px] md:text-[10px]">Select a directive to interact</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxView;
