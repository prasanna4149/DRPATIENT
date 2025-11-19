import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appointment, Message, ActivityLog, Category, Doctor, AppStats, FileAttachment } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

interface DataContextType {
  // Categories
  categories: Category[];
  
  // Appointments
  appointments: Appointment[];
  createAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  
  // Messages
  messages: Message[];
  sendMessage: (appointmentId: string, content: string, attachment?: File) => void;
  markMessagesAsRead: (appointmentId: string, userId: string) => void;
  
  // Activity Logs
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  
  // Admin functions
  getDoctors: () => Doctor[];
  approveDoctor: (doctorId: string) => void;
  getAppStats: () => AppStats;
  
  // Helper functions
  getUnreadMessageCount: (appointmentId: string, userId: string) => number;
  getAppointmentMessages: (appointmentId: string) => Message[];
  getPatientHistory: (patientId: string) => Array<{ date: Date; summary: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

const MEDICAL_CATEGORIES: Category[] = [
  { id: '1', name: 'General Physician', slug: 'general-physician', description: 'General healthcare and primary care' ,image: 'https://images.pexels.com/photos/5149754/pexels-photo-5149754.jpeg'},
  { id: '2', name: 'Gynaecology and Sexology', slug: 'gynaecology-sexology', description: 'Women\'s health and reproductive care',image:'https://images.pexels.com/photos/5982467/pexels-photo-5982467.jpeg'},
  { id: '3', name: 'Dermatology', slug: 'dermatology', description: 'Skin, hair, and nail conditions', image: 'https://tse2.mm.bing.net/th/id/OIP.CiMV-pDItQHRWwTD-xoQWwHaEZ?w=555&h=330&rs=1&pid=ImgDetMain&o=7&rm=3' },
  { id: '4', name: 'Psychiatry and Psychology', slug: 'psychiatry-psychology', description: 'Mental health and behavioral disorders',image: 'https://images.pexels.com/photos/19825313/pexels-photo-19825313.jpeg' },
  { id: '5', name: 'Gastroenterology', slug: 'gastroenterology', description: 'Digestive system disorders',   image: 'https://aashrayahospitalgadag.whitecoats.com/wp-content/uploads/sites/66/2023/07/Colon-Surgery.jpg' },
  { id: '6', name: 'Pediatrics', slug: 'pediatrics', description: 'Children\'s healthcare',   image: 'https://images.pexels.com/photos/8316306/pexels-photo-8316306.jpeg' },
  { id: '7', name: 'ENT', slug: 'ent', description: 'Ear, nose, and throat conditions', image: 'https://img.freepik.com/premium-vector/ent-doctor-logo-template-ear-nose-throat-doctor-clinic-mouth-health-otolaryngology-illustration_41737-1016.jpg?w=2000' },
  { id: '8', name: 'Urology and Nephrology', slug: 'urology-nephrology', description: 'Urinary system and kidney care',image: 'https://kidneyandurology.org/wp-content/uploads/2023/07/Preventive-Nephrology.png' },
  { id: '9', name: 'Orthopedics', slug: 'orthopedics', description: 'Bone and joint disorders' ,image:'https://tse4.mm.bing.net/th/id/OIP.qG33yqxpX2N-pGiHXV6t7QHaE8?rs=1&pid=ImgDetMain&o=7&rm=3'},
  { id: '10', name: 'Neurology', slug: 'neurology', description: 'Brain and nervous system disorders',image:'https://tse4.mm.bing.net/th/id/OIP.JfzoenJyRtHss-jdRt5BnQHaDt?w=1920&h=960&rs=1&pid=ImgDetMain&o=7&rm=3' },
  { id: '11', name: 'Cardiology', slug: 'cardiology', description: 'Heart and cardiovascular conditions',image:'https://tse3.mm.bing.net/th/id/OIP.0T2w8g1U6JJ6jIVVMYkXvQHaD4?w=1200&h=630&rs=1&pid=ImgDetMain&o=7&rm=3' },
  { id: '12', name: 'Diabetology', slug: 'nutrition-diabetology', description: 'Nutrition counseling and diabetes care',image:'https://tse4.mm.bing.net/th/id/OIP.R4QikDolCpYpZpcOcn631QHaEK?rs=1&pid=ImgDetMain&o=7&rm=3' },
  { id: '13', name: 'Ophthalmology', slug: 'ophthalmology', description: 'Eye and vision care',image:'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJvYXV0aCI6eyJjbGllbnRfaWQiOiJmcm9udGlmeS1leHBsb3JlciJ9LCJwYXRoIjoiaWhoLWhlYWx0aGNhcmUtYmVyaGFkXC9hY2NvdW50c1wvYzNcLzQwMDA2MjRcL3Byb2plY3RzXC8yMDlcL2Fzc2V0c1wvMGNcLzMzNzg0XC8zOTQxMTExY2JmZTVkNTlkYmE5MGVkMWQ3NDk3ZGM2Zi0xNjQ2OTI0NzMxLmpwZyJ9:ihh-healthcare-berhad:O6LgxuC6K0djc4JcxeU5q-K8h_Xk2yWXVbxOxobSWOU' },
  { id: '14', name: 'Dentistry', slug: 'dentistry', description: 'Oral and dental health',image:'https://rosedentalnashua.com/wp-content/uploads/2020/08/AdobeStock_197373009-scaled.jpeg' },
  { id: '15', name: 'Pulmonology', slug: 'pulmonology', description: 'Lung and respiratory conditions',image:'https://floridalungdoctors.com/wp-content/uploads/2018/04/iStock-675674414-1024x683.jpg' },
  { id: '16', name: 'Oncology', slug: 'oncology', description: 'Cancer diagnosis and treatment',image:'https://dcjournal.com/wp-content/uploads/2023/03/bigstock-Pulmonology-Medicine-Concept-460989283-e1679862023206.jpg' },
  { id: '17', name: 'Physiotherapy', slug: 'physiotherapy', description: 'Physical therapy and rehabilitation' ,image:'https://www.sagarclinic.in/wp-content/uploads/2019/12/Physio-at-home-5-scaled.jpg'},
  { id: '18', name: 'General Surgery', slug: 'general-surgery', description: 'Surgical procedures and interventions',image:'https://tse4.mm.bing.net/th/id/OIP.aLy1a9b2x7ursFkNCSIx2QHaHa?rs=1&pid=ImgDetMain&o=7&rm=3' },
  { id: '19', name: 'Veterinary', slug: 'veterinary', description: 'Animal healthcare',image:'https://www.penangveterinarycentre.com/wp-content/uploads/2024/03/Career_desktop.jpg' },
];

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Initialize sample data
  useEffect(() => {
    if (user) {
      loadFromSupabase();
    }
  }, [user]);
      // Convert timestamp strings back to Date objects
  const loadFromSupabase = async () => {
    if (!user) return;
    const { data: appts } = await supabase
      .from('appointments')
      .select('*')
      .order('datetime', { ascending: true });
    if (appts) {
      setAppointments(
        appts.map((apt: any) => ({
          id: apt.id,
          patientId: apt.patient_id,
          doctorId: apt.doctor_id,
          patientName: apt.patient_name,
          doctorName: apt.doctor_name,
          doctorCategory: apt.doctor_category,
          datetime: new Date(apt.datetime),
          status: apt.status,
          notes: apt.notes || undefined,
          recommendations: apt.recommendations || undefined,
          prescription: apt.prescription || undefined,
          doctorNotes: apt.doctor_notes || undefined,
          patientReview: apt.patient_review || undefined,
          patientRating: apt.patient_rating || undefined,
          patientVitals: apt.patient_vitals || undefined,
          createdAt: new Date(apt.created_at),
          updatedAt: new Date(apt.updated_at),
        }))
      );
    }

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true });
    if (msgs) {
      setMessages(
        msgs.map((m: any) => ({
          id: m.id,
          appointmentId: m.appointment_id,
          senderId: m.sender_id,
          senderRole: m.sender_role,
          content: m.content,
          timestamp: new Date(m.timestamp),
          read: !!m.read,
          attachment: m.attachment_meta
            ? {
                fileName: m.attachment_meta.fileName,
                fileType: m.attachment_meta.fileType,
                fileSize: m.attachment_meta.fileSize,
                fileData: m.attachment_meta.fileData || '',
              }
            : undefined,
        }))
      );
    }

    const { data: logs } = await supabase
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    if (logs) {
      setActivityLogs(
        logs.map((l: any) => ({
          id: l.id,
          userId: l.user_id,
          userRole: l.user_role,
          userName: l.user_name,
          action: l.action,
          details: l.details,
          timestamp: new Date(l.timestamp),
        }))
      );
    }
  };

  const initializeSampleData = () => {};

  const createAppointment = async (
    appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const id = crypto.randomUUID();
    await supabase.from('appointments').insert({
      id,
      patient_id: appointment.patientId,
      doctor_id: appointment.doctorId,
      patient_name: appointment.patientName,
      doctor_name: appointment.doctorName,
      doctor_category: appointment.doctorCategory,
      datetime: appointment.datetime.toISOString(),
      status: appointment.status,
      notes: appointment.notes || null,
      recommendations: appointment.recommendations || null,
      prescription: appointment.prescription || null,
      doctor_notes: appointment.doctorNotes || null,
      patient_review: appointment.patientReview || null,
      patient_rating: appointment.patientRating || null,
      patient_vitals: appointment.patientVitals || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setAppointments([
      ...appointments,
      { ...appointment, id, createdAt: new Date(), updatedAt: new Date() },
    ]);
    if (user) {
      addActivityLog({
        userId: user.id,
        userRole: user.role,
        userName: user.name,
        action: 'APPOINTMENT_CREATED',
        details: `Appointment booked with ${appointment.doctorName} for ${appointment.datetime.toLocaleDateString()}`,
      });
    }
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const payload: any = {};
    if (updates.status) payload.status = updates.status;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.recommendations !== undefined) payload.recommendations = updates.recommendations;
    if (updates.prescription !== undefined) payload.prescription = updates.prescription;
    if (updates.doctorNotes !== undefined) payload.doctor_notes = updates.doctorNotes;
    if (updates.patientReview !== undefined) payload.patient_review = updates.patientReview;
    if (updates.patientRating !== undefined) payload.patient_rating = updates.patientRating;
    if (updates.patientVitals !== undefined) payload.patient_vitals = updates.patientVitals;
    payload.updated_at = new Date().toISOString();
    await supabase.from('appointments').update(payload).eq('id', id);

    const updatedAppointments = appointments.map(apt =>
      apt.id === id ? { ...apt, ...updates, updatedAt: new Date() } : apt
    );
    setAppointments(updatedAppointments);

    if (user && updates.status) {
      const appointment = appointments.find(apt => apt.id === id);
      if (appointment) {
        addActivityLog({
          userId: user.id,
          userRole: user.role,
          userName: user.name,
          action: `APPOINTMENT_${updates.status?.toUpperCase()}`,
          details: `Appointment ${updates.status} - ${appointment.patientName} with Dr. ${appointment.doctorName}`,
        });
      }
    }
  };

  const sendMessage = async (appointmentId: string, content: string, attachment?: File) => {
    if (!user) return;

    let attachmentUrl: string | null = null;
    let attachmentMeta: FileAttachment | undefined;

    if (attachment) {
      const path = `${appointmentId}/${crypto.randomUUID()}_${attachment.name}`;
      const { error } = await supabase.storage.from('attachments').upload(path, attachment);
      if (!error) {
        const { data } = supabase.storage.from('attachments').getPublicUrl(path);
        attachmentUrl = data.publicUrl;
        attachmentMeta = {
          fileName: attachment.name,
          fileType: attachment.type,
          fileSize: attachment.size,
          fileData: '',
        };
      }
    }

    const id = crypto.randomUUID();
    await supabase.from('messages').insert({
      id,
      appointment_id: appointmentId,
      sender_id: user.id,
      sender_role: user.role as 'patient' | 'doctor',
      content: content || (attachmentMeta ? `📎 ${attachmentMeta.fileName}` : ''),
      timestamp: new Date().toISOString(),
      read: false,
      attachment_url: attachmentUrl,
      attachment_meta: attachmentMeta || null,
    });

    setMessages([
      ...messages,
      {
        id,
        appointmentId,
        senderId: user.id,
        senderRole: user.role as 'patient' | 'doctor',
        content: content || (attachmentMeta ? `📎 ${attachmentMeta.fileName}` : ''),
        timestamp: new Date(),
        read: false,
        attachment: attachmentMeta,
      },
    ]);
  };

  const markMessagesAsRead = async (appointmentId: string, userId: string) => {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('appointment_id', appointmentId)
      .neq('sender_id', userId);
    setMessages(messages.map(msg =>
      msg.appointmentId === appointmentId && msg.senderId !== userId ? { ...msg, read: true } : msg
    ));
  };

  const addActivityLog = async (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const id = crypto.randomUUID();
    const timestamp = new Date();
    await supabase.from('activity_logs').insert({
      id,
      user_id: log.userId,
      user_role: log.userRole,
      user_name: log.userName,
      action: log.action,
      details: log.details,
      timestamp: timestamp.toISOString(),
    });
    setActivityLogs([{ ...log, id, timestamp }, ...activityLogs]);
  };

  const getDoctors = (): Doctor[] => {
    const mapped = activityLogs; // placeholder to satisfy TS in this scope
    mapped.length; // no-op
    return [];
  };

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase.from('doctors').select('*');
      if (data) {
        const doctors: Doctor[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          email: d.email,
          role: 'doctor',
          createdAt: new Date(d.created_at),
          category: d.category,
          bio: d.bio || '',
          experience: d.experience || '',
          degrees: d.degrees || undefined,
          isApproved: !!d.is_approved,
        }));
        // keep doctors accessible via getDoctors closure
        getDoctorsRef.current = doctors;
      }
    };
    fetchDoctors();
  }, []);

  const getDoctorsRef = { current: [] as Doctor[] };
  const getDoctorsImpl = (): Doctor[] => getDoctorsRef.current;

  const approveDoctor = async (doctorId: string) => {
    const { data } = await supabase.from('doctors').select('is_approved,name').eq('id', doctorId).limit(1);
    const current = data?.[0];
    const next = !current?.is_approved;
    await supabase.from('doctors').update({ is_approved: next }).eq('id', doctorId);
    if (user && current) {
      addActivityLog({
        userId: user.id,
        userRole: user.role,
        userName: user.name,
        action: next ? 'DOCTOR_APPROVED' : 'DOCTOR_UNAPPROVED',
        details: `Dr. ${current.name} has been ${next ? 'approved' : 'unapproved'}`,
      });
    }
    // refresh doctors cache
    const { data: refreshed } = await supabase.from('doctors').select('*');
    if (refreshed) {
      getDoctorsRef.current = refreshed.map((d: any) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        role: 'doctor',
        createdAt: new Date(d.created_at),
        category: d.category,
        bio: d.bio || '',
        experience: d.experience || '',
        degrees: d.degrees || undefined,
        isApproved: !!d.is_approved,
      }));
    }
  };

  const getAppStats = (): AppStats => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const doctors = users.filter((u: any) => u.role === 'doctor');
    const patients = users.filter((u: any) => u.role === 'patient');
    
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayAppointments = appointments.filter(apt => 
      apt.datetime.toDateString() === today.toDateString()
    );
    
    const weekAppointments = appointments.filter(apt => 
      apt.datetime >= weekAgo
    );

    const todayMessages = messages.filter(msg => 
      msg.timestamp.toDateString() === today.toDateString()
    );

    const appointmentsByStatus = appointments.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {} as any);

    return {
      totalDoctors: doctors.length,
      approvedDoctors: doctors.filter((d: any) => d.isApproved).length,
      pendingDoctors: doctors.filter((d: any) => !d.isApproved).length,
      totalPatients: patients.length,
      todayAppointments: todayAppointments.length,
      weekAppointments: weekAppointments.length,
      todayMessages: todayMessages.length,
      appointmentsByStatus: {
        pending: appointmentsByStatus.pending || 0,
        accepted: appointmentsByStatus.accepted || 0,
        completed: appointmentsByStatus.completed || 0,
        cancelled: appointmentsByStatus.cancelled || 0,
        no_show: appointmentsByStatus.no_show || 0,
      },
    };
  };

  const getUnreadMessageCount = (appointmentId: string, userId: string): number => {
    return messages.filter(msg => 
      msg.appointmentId === appointmentId && 
      msg.senderId !== userId && 
      !msg.read
    ).length;
  };

  const getAppointmentMessages = (appointmentId: string): Message[] => {
    return messages
      .filter(msg => msg.appointmentId === appointmentId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  // Build a lightweight patient history from appointments for the given patient
  const getPatientHistory = (patientId: string): Array<{ date: Date; summary: string }> => {
    return appointments
      .filter(apt => apt.patientId === patientId && (apt.status === 'completed' || apt.status === 'accepted' || apt.status === 'no_show' || apt.status === 'cancelled'))
      .sort((a, b) => b.datetime.getTime() - a.datetime.getTime())
      .map(apt => ({
        date: apt.datetime,
        summary: `${apt.status === 'completed' ? 'Completed visit' : apt.status === 'accepted' ? 'Confirmed visit' : apt.status === 'no_show' ? 'No show' : 'Cancelled'} with Dr. ${apt.doctorName} (${apt.doctorCategory})`,
      }));
  };

  const value = {
    categories: MEDICAL_CATEGORIES,
    appointments,
    createAppointment,
    updateAppointment,
    messages,
    sendMessage,
    markMessagesAsRead,
    activityLogs,
    addActivityLog,
    getDoctors: getDoctorsImpl,
    approveDoctor,
    getAppStats,
    getUnreadMessageCount,
    getAppointmentMessages,
    getPatientHistory,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};