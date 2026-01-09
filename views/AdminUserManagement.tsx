
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { UserProfile, UserRole } from '../types';
import { APP_CONFIG } from '../constants';
import { useAuth } from '../App';

const AdminUserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showPermissionsFor, setShowPermissionsFor] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    role: UserRole.STAFF,
    branch: APP_CONFIG.BRANCHES[0]
  });

  useEffect(() => {
    refresh();
  }, []);

  const refresh = () => setUsers(db.getAllUsers());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      db.updateUser(editingUser.id, formData);
    } else {
      db.addUser(formData);
    }
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: '', username: '', email: '', role: UserRole.STAFF, branch: APP_CONFIG.BRANCHES[0] });
    refresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Strict Confirmation: Are you sure you want to remove this user from the system?')) {
      db.deleteUser(id);
      refresh();
    }
  };

  const togglePermission = (userId: string, perm: string) => {
    db.togglePermission(userId, perm);
    refresh();
  };

  const openEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      branch: user.branch || APP_CONFIG.BRANCHES[0]
    });
    setShowModal(true);
  };

  const availablePermissions = [
    { id: 'can_view_notes', label: '📒 Private Notes access' },
    { id: 'can_view_vault', label: '💡 Innovation Vault access' },
    { id: 'can_export_csv', label: '📊 Detailed CSV Export rights' },
    { id: 'can_sync_ai', label: '🤖 AI Tactical Sync rights' },
  ];

  return (
    <div className="space-y-6 md:space-y-10 animate-fade-up max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-6 md:p-8 glass rounded-[32px] md:rounded-[40px] border border-white/5 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-2xl md:text-3xl shadow-lg border border-blue-500/30 shrink-0">👥</div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">User Management</h2>
            <p className="text-blue-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px] mt-1">Staff Lifecycle & Permissions Hub</p>
          </div>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setShowModal(true); }}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl"
        >
          Add New Member
        </button>
      </div>

      <div className="glass rounded-[32px] md:rounded-[40px] border border-white/5 overflow-hidden shadow-2xl bg-[#000d1a]/40">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-white/5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 md:px-8 py-5 md:py-6">Member Details</th>
                <th className="px-6 md:px-8 py-5 md:py-6">Role / Branch</th>
                <th className="px-6 md:px-8 py-5 md:py-6">Active Rights</th>
                <th className="px-6 md:px-8 py-5 md:py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="group hover:bg-white/5 transition-all">
                  <td className="px-6 md:px-8 py-5 md:py-6">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:xl bg-blue-600/10 flex items-center justify-center text-blue-400 font-black shrink-0 overflow-hidden">
                        {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" /> : u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-white text-xs md:text-sm truncate uppercase">{u.name}</p>
                        <p className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">ID: {u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 md:px-8 py-5 md:py-6">
                    <p className={`text-[8px] md:text-[9px] font-black uppercase inline-block px-3 py-1 rounded-full mb-1 ${u.role === UserRole.MANAGER ? 'bg-red-500/20 text-red-400' : u.role === UserRole.CSM ? 'bg-purple-500/20 text-purple-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                      {u.role}
                    </p>
                    <p className="text-[10px] md:text-xs text-gray-400 font-medium truncate">{u.branch || 'DIZ branch'}</p>
                  </td>
                  <td className="px-6 md:px-8 py-5 md:py-6">
                    <div className="flex flex-wrap gap-1">
                      {u.permissions?.map(p => (
                         <span key={p} className="bg-blue-600/10 text-blue-400 text-[7px] font-black uppercase px-2 py-0.5 rounded border border-blue-500/20">{p.replace('can_view_', '')}</span>
                      ))}
                      {(!u.permissions || u.permissions.length === 0) && <span className="text-[8px] text-gray-600 uppercase font-black">No extra rights</span>}
                    </div>
                  </td>
                  <td className="px-6 md:px-8 py-5 md:py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => setShowPermissionsFor(u.id)} className="p-2 md:p-3 bg-white/5 rounded-lg md:rounded-xl hover:bg-blue-600/20 text-blue-400 transition-all text-[9px] font-black uppercase tracking-widest">Rights</button>
                       <button onClick={() => openEdit(u)} className="p-2 md:p-3 bg-white/5 rounded-lg md:rounded-xl hover:bg-blue-600/20 text-blue-400 transition-all text-xs md:text-sm">✏️</button>
                       <button onClick={() => handleDelete(u.id)} className="p-2 md:p-3 bg-white/5 rounded-lg md:rounded-xl hover:bg-red-600/20 text-red-400 transition-all text-xs md:text-sm">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPermissionsFor && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="glass w-full max-w-md rounded-[40px] border border-white/10 p-10 bg-[#001226] shadow-3xl">
              <h3 className="text-xl font-black text-white uppercase mb-6 text-center">Manage Rights: {users.find(u => u.id === showPermissionsFor)?.name}</h3>
              <div className="space-y-4 mb-8">
                 {availablePermissions.map(perm => (
                    <label key={perm.id} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 cursor-pointer group">
                       <span className="text-xs font-black uppercase text-gray-400 group-hover:text-white">{perm.label}</span>
                       <input 
                         type="checkbox" 
                         className="w-6 h-6 rounded-lg accent-blue-600"
                         checked={users.find(u => u.id === showPermissionsFor)?.permissions?.includes(perm.id) || false}
                         onChange={() => togglePermission(showPermissionsFor, perm.id)}
                       />
                    </label>
                 ))}
              </div>
              <button onClick={() => setShowPermissionsFor(null)} className="w-full bg-blue-600 py-5 rounded-[24px] font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Synchronize Rights</button>
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[110] bg-[#001f3f]/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass w-full max-w-lg rounded-[32px] md:rounded-[48px] border border-white/10 p-6 md:p-12 shadow-2xl relative max-h-[95vh] overflow-y-auto">
            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-6 md:mb-8 text-center md:text-left">
              {editingUser ? 'Update Member Profile' : 'Register New Member'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 px-1">Full Name</label>
                  <input required className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 text-xs md:text-sm outline-none focus:border-blue-500 text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 px-1">Work ID (Username)</label>
                  <input required className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 text-xs md:text-sm outline-none focus:border-blue-500 text-white" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 px-1">Internal Email</label>
                <input type="email" required className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 text-xs md:text-sm outline-none focus:border-blue-500 text-white" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 px-1">System Role</label>
                  <select className="w-full bg-[#001f3f] border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 text-xs md:text-sm text-white" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                    <option value={UserRole.STAFF}>STAFF</option>
                    <option value={UserRole.MANAGER}>MANAGER</option>
                    <option value={UserRole.CSM}>CSM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 px-1">Current Branch</label>
                  <select className="w-full bg-[#001f3f] border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 text-xs md:text-sm text-white" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})}>
                    {APP_CONFIG.BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 md:gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 py-4 md:py-5 rounded-[20px] md:rounded-3xl font-black uppercase tracking-widest text-[9px] md:text-xs">Cancel</button>
                <button type="submit" className="flex-2 bg-blue-600 py-4 md:py-5 rounded-[20px] md:rounded-3xl font-black uppercase tracking-widest text-[9px] md:text-xs text-white shadow-xl">Commit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
