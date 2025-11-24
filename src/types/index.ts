export interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  createdAt: Date;
  // Patient specific
  age?: number;
  sex?: 'male' | 'female' | 'other';
  height?: string;
  weight?: string;
  medications?: string;
  allergies?: string;
  // Doctor specific
  category?: string;
  bio?: string;
  experience?: string;
  degrees?: string;
  isApproved?: boolean;
}

export interface Doctor extends User {
  role: 'doctor';
  category: string;
  bio: string;
  experience: string;
  degrees?: string;
  isApproved: boolean;
  nextAvailableSlot?: Date;
}

export interface Patient extends User {
  role: 'patient';
  age?: number;
  sex?: 'male' | 'female' | 'other';
  height?: string;
  weight?: string;
  medications?: string;
  allergies?: string;
}

export interface Admin extends User {
  role: 'admin';
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  doctorCategory: string;
  datetime: Date;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  recommendations?: string;
  prescription?: string;
  doctorNotes?: string;
  patientReview?: string;
  patientRating?: number;
  patientVitals?: {
    bloodPressure?: string;
    temperature?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FileAttachment {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData?: string;
}

export interface Message {
  id: string;
  appointmentId: string;
  senderId: string;
  senderRole: 'patient' | 'doctor' | 'admin';
  content: string;
  timestamp: Date;
  read: boolean;
  attachment?: FileAttachment;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userRole: 'patient' | 'doctor' | 'admin';
  userName: string;
  action: string;
  details: string;
  timestamp: Date;
}

export interface AppStats {
  totalDoctors: number;
  approvedDoctors: number;
  pendingDoctors: number;
  totalPatients: number;
  todayAppointments: number;
  weekAppointments: number;
  todayMessages: number;
  appointmentsByStatus: {
    pending: number;
    accepted: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  timestamp: Date;
  senderName?: string;
  receiverName?: string;
}

export interface OnlineUser {
  userId: string;
  userName: string;
  role: 'patient' | 'agent';
  lastSeen: Date;
  isOnline: boolean;
}