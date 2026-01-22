
import { UserRole, UserProfile, KPIConfig, DailyEntry, Feedback, Message, TodoItem } from '../types';

const INITIAL_USERS: UserProfile[] = [
  { 
    id: '1', 
    username: 'meron', 
    name: 'Meron Getahun', 
    email: 'meron.g@dukem.com', 
    role: UserRole.STAFF, 
    passcodeSet: false, 
    agreementAccepted: false, 
    emailLinked: false, 
    branch: 'DIZ branch',
    supervisorId: '7',
    permissions: ['can_view_notes', 'can_view_vault'],
    profilePic: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&h=200&auto=format&fit=crop'
  },
  { 
    id: '2', 
    username: 'sanbata', 
    name: 'Sanbata Bekele', 
    email: 'sanbata.b@dukem.com', 
    role: UserRole.STAFF, 
    passcodeSet: false, 
    agreementAccepted: false, 
    emailLinked: false, 
    branch: 'DIZ branch',
    supervisorId: '7',
    permissions: ['can_view_notes', 'can_view_vault'],
    profilePic: 'https://images.unsplash.com/photo-1531123897727-8f129e16fd3c?q=80&w=200&h=200&auto=format&fit=crop'
  },
  { 
    id: '3', 
    username: 'genet', 
    name: 'Genet Dereje', 
    email: 'genet.d@dukem.com', 
    role: UserRole.STAFF, 
    passcodeSet: false, 
    agreementAccepted: false, 
    emailLinked: false, 
    branch: 'DIZ branch',
    supervisorId: '7',
    permissions: ['can_view_notes', 'can_view_vault'],
    profilePic: 'https://images.unsplash.com/photo-1567532939604-b6c5b0ad2e01?q=80&w=200&h=200&auto=format&fit=crop'
  },
  { 
    id: '4', 
    username: 'selima', 
    name: 'Selima Hassen', 
    email: 'selima.h@dukem.com', 
    role: UserRole.STAFF, 
    passcodeSet: false, 
    agreementAccepted: false, 
    emailLinked: false, 
    branch: 'DIZ branch',
    supervisorId: '7',
    permissions: ['can_view_notes', 'can_view_vault'],
    profilePic: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?q=80&w=200&h=200&auto=format&fit=crop'
  },
  { 
    id: '6', 
    username: 'manager', 
    name: 'Wonde', 
    email: 'manager@dukem.com', 
    role: UserRole.MANAGER, 
    passcodeSet: false, 
    agreementAccepted: false, 
    emailLinked: false, 
    branch: 'DIZ branch',
    permissions: ['all_access'],
    profilePic: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&h=200&auto=format&fit=crop'
  },
  { 
    id: '7', 
    username: 'dawit', 
    name: 'Dawit Asres', 
    email: 'dawit.a@dukem.com', 
    role: UserRole.CSM, 
    passcodeSet: false, 
    agreementAccepted: false, 
    emailLinked: false, 
    branch: 'DIZ branch',
    permissions: ['can_view_notes', 'can_view_vault'],
    profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&h=200&auto=format&fit=crop'
  },
];

class MockDatabase {
  private users: UserProfile[] = JSON.parse(localStorage.getItem('dukem_users') || JSON.stringify(INITIAL_USERS));
  private kpis: KPIConfig[] = JSON.parse(localStorage.getItem('dukem_kpis') || '[]');
  private entries: DailyEntry[] = JSON.parse(localStorage.getItem('dukem_entries') || '[]');
  private feedback: Feedback[] = JSON.parse(localStorage.getItem('dukem_feedback') || '[]');
  private messages: Message[] = JSON.parse(localStorage.getItem('dukem_messages') || '[]');
  private todos: TodoItem[] = JSON.parse(localStorage.getItem('dukem_todos') || '[]');
  private backupLogs: { date: string; status: string }[] = JSON.parse(localStorage.getItem('dukem_backups') || '[]');
  // Mock password storage - in real app use secure hashing
  private passwords: { [id: string]: string } = JSON.parse(localStorage.getItem('dukem_passwords') || '{}');

  private persist() {
    localStorage.setItem('dukem_users', JSON.stringify(this.users));
    localStorage.setItem('dukem_kpis', JSON.stringify(this.kpis));
    localStorage.setItem('dukem_entries', JSON.stringify(this.entries));
    localStorage.setItem('dukem_feedback', JSON.stringify(this.feedback));
    localStorage.setItem('dukem_messages', JSON.stringify(this.messages));
    localStorage.setItem('dukem_todos', JSON.stringify(this.todos));
    localStorage.setItem('dukem_backups', JSON.stringify(this.backupLogs));
    localStorage.setItem('dukem_passwords', JSON.stringify(this.passwords));
  }

  exportDatabase() {
    return JSON.stringify({
      users: this.users,
      kpis: this.kpis,
      entries: this.entries,
      feedback: this.feedback,
      messages: this.messages,
      todos: this.todos,
      timestamp: new Date().toISOString()
    });
  }

  importDatabase(json: string) {
    try {
      const data = JSON.parse(json);
      if (data.users) this.users = data.users;
      if (data.kpis) this.kpis = data.kpis;
      if (data.entries) this.entries = data.entries;
      if (data.feedback) this.feedback = data.feedback;
      if (data.messages) this.messages = data.messages;
      if (data.todos) this.todos = data.todos;
      this.persist();
      return true;
    } catch (e) {
      return false;
    }
  }

  getBackupLogs() { return this.backupLogs; }
  logBackup(status: string) {
    this.backupLogs.push({ date: new Date().toISOString(), status });
    this.persist();
  }

  async login(username: string, passcode: string): Promise<UserProfile | null> {
    await new Promise(r => setTimeout(r, 800));
    const user = this.users.find(u => u.username === username);
    if (!user) return null;
    
    // Check custom password first
    if (this.passwords[user.id]) {
      if (this.passwords[user.id] === passcode) return user;
      return null;
    }

    // Default passwords for first login
    if (passcode === '1234' || passcode === `${username}123` || user.passcodeSet) return user;
    return null;
  }

  async updatePasscode(userId: string, newPasscode: string): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) { 
      user.passcodeSet = true; 
      this.passwords[userId] = newPasscode;
      this.persist(); 
    }
  }

  async changePassword(userId: string, oldPass: string, newPass: string): Promise<boolean> {
    const user = this.users.find(u => u.id === userId);
    if (!user) return false;
    
    // Check old password
    const currentPass = this.passwords[userId] || '1234'; // Default fallback if not set properly in mock
    if (currentPass !== oldPass && user.passcodeSet) return false;
    
    this.passwords[userId] = newPass;
    this.persist();
    return true;
  }

  async acceptAgreement(userId: string): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) { user.agreementAccepted = true; this.persist(); }
  }

  async linkEmail(userId: string, gmail: string): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) { user.recoveryEmail = gmail; user.emailLinked = true; this.persist(); }
  }

  getAllUsers() { return this.users; }

  addUser(userData: any) {
    const newUser: UserProfile = {
      ...userData,
      id: Math.random().toString(36).substr(2, 9),
      passcodeSet: false,
      agreementAccepted: false,
      emailLinked: false,
      permissions: ['can_view_notes', 'can_view_vault']
    };
    this.users.push(newUser);
    this.persist();
    return newUser;
  }

  updateUser(id: string, updates: Partial<UserProfile>) {
    this.users = this.users.map(u => u.id === id ? { ...u, ...updates } as UserProfile : u);
    this.persist();
  }

  togglePermission(userId: string, permission: string) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      if (!user.permissions) user.permissions = [];
      if (user.permissions.includes(permission)) {
        user.permissions = user.permissions.filter(p => p !== permission);
      } else {
        user.permissions.push(permission);
      }
      this.persist();
    }
  }

  updateSupervisor(userId: string, supervisorId: string | null) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.supervisorId = supervisorId || undefined;
      this.persist();
    }
  }

  deleteUser(id: string) {
    this.users = this.users.filter(u => u.id !== id);
    this.persist();
  }

  getKPIsForUser(email: string) { 
    // Return approved, pending signature, and pending approval (so staff can see wait status)
    return this.kpis.filter(k => k.assignedToEmail === email && (k.status === 'approved' || k.status === 'pending_signature' || k.status === 'pending_approval')); 
  }

  getPendingKPIs() { return this.kpis.filter(k => k.status !== 'approved'); }
  getAllKPIs() { return this.kpis; }

  addKPI(kpi: Omit<KPIConfig, 'id'>) {
    const newKpi = { ...kpi, id: Math.random().toString(36).substr(2, 9), status: 'pending_signature', signedByStaff: false } as KPIConfig;
    this.kpis.push(newKpi);
    this.persist();
    return newKpi;
  }

  staffSignKPI(id: string) {
    const kpi = this.kpis.find(k => k.id === id);
    if (kpi) {
      kpi.status = 'pending_approval';
      kpi.signedByStaff = true;
      kpi.signedAt = new Date().toISOString();
      this.persist();
    }
  }

  approveKPI(id: string) {
    const kpi = this.kpis.find(k => k.id === id);
    if (kpi) { kpi.status = 'approved'; this.persist(); }
  }

  approveAllKPIs() {
    // Only approve those that have been signed by staff
    this.kpis = this.kpis.map(k => k.status === 'pending_approval' ? { ...k, status: 'approved' } : k);
    this.persist();
  }

  updateKPI(id: string, updates: Partial<KPIConfig>) {
    this.kpis = this.kpis.map(k => k.id === id ? { ...k, ...updates } as KPIConfig : k);
    this.persist();
  }

  deleteKPI(id: string) {
    this.kpis = this.kpis.filter(k => k.id !== id);
    this.persist();
  }

  addEntry(entry: Omit<DailyEntry, 'id'>) {
    const newEntry = { ...entry, id: Math.random().toString(36).substr(2, 9) } as DailyEntry;
    this.entries.push(newEntry);
    this.persist();
    return newEntry;
  }

  getEntriesForStaff(staffId: string) { return this.entries.filter(e => e.staffId === staffId); }
  getPendingEntries() { return this.entries.filter(e => e.status === 'pending'); }

  authorizeEntry(entryId: string, authorizerId: string) {
    const entry = this.entries.find(e => e.id === entryId);
    if (entry) { entry.status = 'authorized'; entry.authorizedBy = authorizerId; this.persist(); }
  }

  approveAllEntries(authorizerId: string) {
    this.entries = this.entries.map(e => e.status === 'pending' ? { ...e, status: 'authorized', authorizedBy: authorizerId } : e);
    this.persist();
  }

  rejectEntry(entryId: string, reason: string, authorizerName: string) {
    const entry = this.entries.find(e => e.id === entryId);
    if (entry) {
      this.addMessage({
        fromId: 'SYSTEM',
        fromName: authorizerName,
        toId: entry.staffId,
        content: `🚨 YOUR KPI SUBMISSION FOR ${entry.date} WAS REJECTED. REASON: ${reason}`,
        type: 'priority',
        timestamp: new Date().toISOString()
      });
      this.entries = this.entries.filter(e => e.id !== entryId);
      this.persist();
    }
  }

  getAllEntries() { return this.entries; }
  
  addFeedback(f: Omit<Feedback, 'id'>) {
    const newF = { ...f, id: Math.random().toString(36).substr(2, 9), viewedByStaff: false, viewedByPortalOwner: false, reactions: {} } as Feedback;
    this.feedback.push(newF);
    this.persist();
    return newF;
  }
  
  getFeedbackForUser(user: UserProfile) {
    return this.feedback.filter(f => {
      const targets = f.target.split(',');
      if (targets.includes(user.id) || targets.includes('ALL') || targets.includes('STAFF_ALL')) return true;
      if (f.target === 'BOTH' && (user.role === UserRole.MANAGER || user.role === UserRole.CSM)) return true;
      if (f.target === user.role) return true;
      if (f.staffId === user.id) return true;
      if (user.role === UserRole.MANAGER) return true;
      return false;
    });
  }

  getRequestsForHub(user: UserProfile) {
     return this.feedback.filter(f => {
        const targets = f.target.split(',');
        const isRecipient = targets.includes(user.id) || targets.includes('STAFF_ALL') || targets.includes('ALL');
        const isOwner = f.staffId === user.id;
        const isManager = user.role === UserRole.MANAGER;
        const isCSM = user.role === UserRole.CSM;
        return (isRecipient || isOwner || isManager || isCSM) && !f.parentId;
     });
  }

  getRepliesForParent(parentId: string, currentUser: UserProfile) {
    return this.feedback.filter(f => {
      if (f.parentId !== parentId) return false;
      const isManager = currentUser.role === UserRole.MANAGER;
      const isCSM = currentUser.role === UserRole.CSM;
      const isReplier = f.staffId === currentUser.id;
      const isTargetedToMe = f.target.split(',').includes(currentUser.id);
      return isManager || isCSM || isReplier || isTargetedToMe;
    });
  }

  markHubViewed(userId: string) {
    this.feedback = this.feedback.map(f => {
      if (f.target.includes(userId) || f.target === 'MANAGER' || f.target === 'CSM' || f.target === 'BOTH') {
        return { ...f, viewedByPortalOwner: true };
      }
      return f;
    });
    this.persist();
  }

  toggleReaction(feedbackId: string, emoji: string, userId: string) {
    const f = this.feedback.find(x => x.id === feedbackId);
    if (f) {
      if (!f.reactions) f.reactions = {};
      if (!f.reactions[emoji]) f.reactions[emoji] = [];
      const index = f.reactions[emoji].indexOf(userId);
      if (index > -1) {
        f.reactions[emoji].splice(index, 1);
      } else {
        f.reactions[emoji].push(userId);
      }
      this.persist();
    }
  }

  getUnreadMessageCount(userId: string) {
    return this.messages.filter(m => (m.toId === userId || m.toId === 'ALL') && !m.readBy.includes(userId)).length;
  }

  updateFeedback(id: string, updates: Partial<Feedback>) {
    this.feedback = this.feedback.map(f => f.id === id ? { ...f, ...updates } : f);
    this.persist();
  }

  deleteFeedback(id: string) {
    this.feedback = this.feedback.filter(f => f.id !== id && f.parentId !== id);
    this.persist();
  }

  markFeedbackViewed(id: string) {
    this.feedback = this.feedback.map(f => f.id === id ? { ...f, viewedByStaff: true } : f);
    this.persist();
  }

  getNewFeedbackCountForPortalOwner(role: UserRole) {
    return this.feedback.filter(f => !f.viewedByPortalOwner && !f.parentId && (f.target === role || f.target === 'BOTH' || f.target === 'STAFF_ALL')).length;
  }

  getUnviewedRepliesCountForStaff(staffId: string) {
    return this.feedback.filter(f => f.staffId === staffId && f.status === 'reviewed' && !f.viewedByStaff).length;
  }

  addMessage(m: Omit<Message, 'id' | 'readBy'>) {
    const newM: Message = { ...m, id: Math.random().toString(36).substr(2, 9), readBy: [], readReceipts: [] };
    this.messages.push(newM);
    this.persist();
    return newM;
  }

  updateMessage(id: string, updates: Partial<Message>) {
    this.messages = this.messages.map(m => m.id === id ? { ...m, ...updates } : m);
    this.persist();
  }

  deleteMessage(id: string) {
    this.messages = this.messages.filter(m => m.id !== id);
    this.persist();
  }

  getMessagesForUser(userId: string) { return this.messages.filter(m => m.toId === userId || m.toId === 'ALL'); }
  
  getMessagesSentBy(userId: string) { return this.messages.filter(m => m.fromId === userId); }

  markMessageAsRead(messageId: string, userId: string) {
    const msg = this.messages.find(m => m.id === messageId);
    if (msg && !msg.readBy.includes(userId)) { 
      msg.readBy.push(userId); 
      if (!msg.readReceipts) msg.readReceipts = [];
      msg.readReceipts.push({ userId, timestamp: new Date().toISOString() });
      this.persist(); 
    }
  }

  getVisibleStaffStaffOnly(currentUser: UserProfile) {
    const all = this.users;
    if (currentUser.role === UserRole.MANAGER) return all.filter(u => u.id !== currentUser.id);
    if (currentUser.role === UserRole.CSM) return all.filter(u => u.supervisorId === currentUser.id);
    return [];
  }

  getStaffAndCSMUsers() { return this.users.filter(u => u.role === UserRole.STAFF || u.role === UserRole.CSM); }
  getStaffUsers() { return this.users.filter(u => u.role === UserRole.STAFF); }
  getTodosForStaff(staffId: string) { return this.todos.filter(t => t.staffId === staffId); }
  
  addTodo(staffId: string, task: string) {
    const newTodo: TodoItem = { id: Math.random().toString(36).substr(2, 9), staffId, task, completed: false, createdAt: new Date().toISOString() };
    this.todos.push(newTodo);
    this.persist();
    return newTodo;
  }

  toggleTodo(id: string) {
    this.todos = this.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    this.persist();
  }

  deleteTodo(id: string) {
    this.todos = this.todos.filter(t => t.id !== id);
    this.persist();
  }

  isKpiSubmittedToday(staffId: string, kpiName: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.entries.some(e => e.staffId === staffId && e.date === today && e.metrics[kpiName] !== undefined);
  }

  async updateProfilePic(userId: string, dataUrl: string): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) { user.profilePic = dataUrl; this.persist(); }
  }
}

export const db = new MockDatabase();
