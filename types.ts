
export enum UserRole {
  STAFF = 'STAFF',
  MANAGER = 'MANAGER',
  CSM = 'CSM'
}

export type AppLanguage = 'en' | 'am' | 'om';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  recoveryEmail?: string;
  role: UserRole;
  passcodeSet: boolean;
  agreementAccepted: boolean;
  emailLinked: boolean;
  profilePic?: string;
  branch?: string;
  permissions?: string[]; 
  supervisorId?: string;
}

export interface KPIConfig {
  id: string;
  name: string;
  target: number;
  assignedToEmail: string;
  unit: string;
  measure: string;
  timeFrame: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  status: 'pending_signature' | 'pending_approval' | 'approved';
  createdBy: string;
  signedByStaff?: boolean;
  signedAt?: string;
  isDeposit?: boolean;
  isOutflow?: boolean;
}

export interface DailyEntry {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  metrics: { [kpiName: string]: number };
  status: 'pending' | 'authorized';
  authorizedBy?: string;
}

export interface TodoItem {
  id: string;
  staffId: string;
  task: string;
  completed: boolean;
  createdAt: string;
  staffName?: string;
}

export interface Feedback {
  id: string;
  staffId: string;
  staffName: string;
  message: string;
  timestamp: string;
  status: 'new' | 'reviewed';
  target: 'MANAGER' | 'CSM' | 'STAFF_ALL' | 'BOTH' | 'PRIVATE' | string; 
  reply?: string;
  viewedByStaff?: boolean; 
  viewedByPortalOwner?: boolean; 
  parentId?: string; 
  reactions?: { [emoji: string]: string[] }; 
}

export interface Message {
  id: string;
  fromId: string;
  fromName: string;
  toId: 'ALL' | string; 
  content: string;
  type: 'text' | 'announcement' | 'priority';
  attachment?: {
    name: string;
    type: 'video' | 'document' | 'image' | 'link';
    url: string;
  };
  timestamp: string;
  readBy: string[]; 
  readReceipts?: { userId: string; timestamp: string }[];
}
