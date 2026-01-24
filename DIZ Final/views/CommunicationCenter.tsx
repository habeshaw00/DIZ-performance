
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { db } from '../services/mockDb';
import { UserProfile, Message } from '../types';

const CommunicationCenter: React.FC = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [target, setTarget] = useState<'ALL' | string>('ALL');
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'announcement' | 'priority'>('announcement');
  const [attachmentType, setAttachmentType] = useState<'none' | 'video' | 'document' | 'link' | 'gif'>('none');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [receiptViewerMsg, setReceiptViewerMsg] = useState<Message | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStaff(db.getStaffUsers());
    refreshSent();
    const interval = setInterval(refreshSent, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const refreshSent = () => {
    if (user) {
      const msgs = db.getMessagesSentBy(user.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setSentMessages(msgs);
      if (receiptViewerMsg) {
        const updated = msgs.find(m => m.id === receiptViewerMsg.id);
        if (updated) setReceiptViewerMsg(updated);
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    await new Promise(r => setTimeout(r, 600));

    if (editingMsg) {
      db.updateMessage(editingMsg.id, {
        toId: target,
        content: message,
        type: msgType,
        attachment: attachmentType !== 'none' ? {
          name: attachmentName || `Asset_${Date.now()}`,
          type: attachmentType as any,
          url: attachmentUrl || '#'
        } : undefined,
      });
      setEditingMsg(null);
    } else {
      db.addMessage({
        fromId: user!.id,
        fromName: user!.name,
        toId: target,
        content: message,
        type: msgType,
        attachment: attachmentType !== 'none' ? {
          name: attachmentName || `Asset_${Date.now()}`,
          type: attachmentType as any,
          url: attachmentUrl || '#'
        } : undefined,
        timestamp: new Date().toISOString()
      });
    }

    setIsSending(false);
    resetForm();
    refreshSent();
    setShowPreview(false);
  };

  const resetForm = () => {
    setMessage('');
    setAttachmentName('');
    setAttachmentUrl('');
    setAttachmentType('none');
    setTarget('ALL');
    setMsgType('announcement');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Erase this directive?')) {
      db.deleteMessage(id);
      refreshSent();
    }
  };

  const handleEdit = (m: Message) => {
    setEditingMsg(m);
    setMessage(m.content);
    setTarget(m.toId);
    setMsgType(m.type as any);
    if (m.attachment) {
      setAttachmentType(m.attachment.type as any);
      setAttachmentName(m.attachment.name);
      setAttachmentUrl(m.attachment.url);
    } else {
      setAttachmentType('none');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentUrl(reader.result as string);
        setAttachmentName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-up pb-20">
      <div className="flex items-center gap-6 p-8 glass rounded-[40px] border border-white/5 bg-purple-600/5">
        <div className="w-16 h-16 bg-purple-600/20 rounded-3xl flex items-center justify-center text-3xl shadow-lg border border-purple-500/30">📣</div>
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">Protocol Command</h2>
          <p className="text-purple-400 font-bold uppercase tracking-widest text-[10px]">Transmission Hub & Node Management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div className="glass p-10 rounded-[50px] border border-white/10 shadow-2xl bg-[#000d1a]/40">
            <h3 className="text-xl font-black mb-8 uppercase">{editingMsg ? 'Modify Transmission' : 'Compose Directive'}</h3>
            <form onSubmit={handleSend} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-purple-400 uppercase tracking-widest block">Node Target</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-purple-500 outline-none" value={target} onChange={e => setTarget(e.target.value)}>
                    <option value="ALL">🌍 Global Broadcast (DIZ)</option>
                    {staff.map(s => ( <option key={s.id} value={s.id}>{s.name}</option> ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-purple-400 uppercase tracking-widest block">Priority Class</label>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setMsgType('announcement')} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${msgType === 'announcement' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>Announce</button>
                    <button type="button" onClick={() => setMsgType('priority')} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${msgType === 'priority' ? 'bg-red-600 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>Priority</button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-purple-400 uppercase tracking-widest block">Protocol Message</label>
                <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-8 min-h-[180px] text-sm text-white focus:border-purple-500 outline-none resize-none" placeholder="Draft strategic instruction..." value={message} onChange={e => setMessage(e.target.value)} required />
              </div>

              <div className="space-y-5 bg-white/5 p-8 rounded-[32px] border border-white/5">
                <label className="text-[11px] font-black text-purple-400 uppercase tracking-widest block">Multimedia Attachments</label>
                <div className="flex flex-wrap gap-3">
                  {['document', 'video', 'link', 'gif'].map(type => (
                    <button key={type} type="button" onClick={() => { setAttachmentType(type as any); if(type !== 'link') fileInputRef.current?.click(); }} className={`px-5 py-2.5 rounded-xl transition-all text-[9px] font-black uppercase ${attachmentType === type ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
                      {type === 'document' ? '📄 DOC' : type === 'video' ? '🎬 VIDEO' : type === 'link' ? '🔗 URL' : '🎇 GIF'}
                    </button>
                  ))}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setShowPreview(true)} className="flex-1 bg-white/5 hover:bg-white/10 py-5 rounded-[28px] font-black uppercase text-[10px] border border-white/5 transition-all">👀 Preview</button>
                <button type="submit" disabled={isSending} className="flex-2 bg-gradient-to-r from-purple-700 to-indigo-700 py-6 rounded-[28px] font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all disabled:opacity-50">{isSending ? 'Syncing...' : editingMsg ? 'Update' : 'Broadcast'}</button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] px-2">Transmission Log History</h3>
          <div className="space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
            {sentMessages.map(m => {
              const readCount = m.readBy.length;
              const totalTarget = m.toId === 'ALL' ? staff.length : 1;
              const perc = Math.round((readCount / totalTarget) * 100);
              return (
                <div key={m.id} className="p-6 bg-[#001226]/80 rounded-[32px] border border-white/5 shadow-xl group transition-all hover:border-purple-500/30">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${m.type === 'priority' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>{m.type}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setReceiptViewerMsg(m)} className="p-2 hover:bg-blue-600 rounded-lg text-[10px]">👁️</button>
                      <button onClick={() => handleEdit(m)} className="p-2 hover:bg-blue-600 rounded-lg text-[10px]">✏️</button>
                      <button onClick={() => handleDelete(m.id)} className="p-2 hover:bg-red-600 rounded-lg text-[10px]">🗑️</button>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-300 font-medium line-clamp-3 mb-4 italic leading-relaxed">"{m.content}"</p>
                  
                  <div className="space-y-3 border-t border-white/5 pt-4">
                    <div className="flex justify-between items-center text-[7px] font-black uppercase text-gray-500">
                      <span>Sync Oversight: {readCount} / {totalTarget} Nodes Read</span>
                      <span className={perc === 100 ? 'text-green-400' : 'text-purple-400'}>{perc}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${perc === 100 ? 'bg-green-500' : 'bg-purple-600'}`} style={{ width: `${perc}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {receiptViewerMsg && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
           <div className="glass w-full max-w-md rounded-[48px] border border-white/10 p-10 bg-[#001226] shadow-3xl flex flex-col max-h-[80vh]">
              <h4 className="text-xl font-black text-white uppercase text-center mb-8">Oversight Receipts</h4>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                 {(receiptViewerMsg.toId === 'ALL' ? staff : staff.filter(s => s.id === receiptViewerMsg.toId)).map(s => {
                    const receipt = receiptViewerMsg.readReceipts?.find(r => r.userId === s.id);
                    return (
                      <div key={s.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${receipt ? 'bg-green-600/10 border-green-500/20' : 'bg-white/5 border-white/5 grayscale opacity-50'}`}>
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black overflow-hidden">
                               {s.profilePic ? <img src={s.profilePic} className="w-full h-full object-cover" /> : s.name.charAt(0)}
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-white uppercase">{s.name}</p>
                               <p className="text-[8px] text-gray-500 uppercase font-black">{receipt ? '👁️ Viewed' : '📫 Delivered'}</p>
                            </div>
                         </div>
                         {receipt && <span className="text-[7px] font-mono text-green-500">{new Date(receipt.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>}
                      </div>
                    );
                 })}
              </div>
              <button onClick={() => setReceiptViewerMsg(null)} className="w-full bg-blue-600 mt-8 py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl">Close Oversight</button>
           </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-lg flex items-center justify-center p-8 animate-in zoom-in-95 duration-300">
           <div className="glass w-full max-w-2xl rounded-[64px] border border-purple-500/30 p-12 bg-[#000d1a] shadow-2xl relative">
              <h4 className="text-[9px] font-black text-purple-400 uppercase tracking-[0.5em] text-center mb-12">Protocol Transmission Preview</h4>
              <div className="p-10 bg-white/5 rounded-[48px] border border-white/5 italic text-gray-200 text-lg leading-relaxed shadow-inner">
                "{message || '...waiting...'}"
              </div>
              <button onClick={() => setShowPreview(false)} className="w-full bg-purple-600 mt-12 py-6 rounded-[32px] font-black uppercase tracking-widest text-xs shadow-xl">Dismiss Preview</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationCenter;
