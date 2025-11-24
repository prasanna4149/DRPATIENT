import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appointment, Message, ActivityLog, Category, Doctor, AppStats, FileAttachment, Patient } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

interface DataContextType {
  categories: Category[];
  appointments: Appointment[];
  patients: Patient[];
  createAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  messages: Message[];
  sendMessage: (appointmentId: string, content: string, attachment?: File) => void;
  markMessagesAsRead: (appointmentId: string, userId: string) => void;
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  getDoctors: () => Doctor[];
  approveDoctor: (doctorId: string) => void;
  getAppStats: () => AppStats;
  getUnreadMessageCount: (appointmentId: string, userId: string) => number;
  getAppointmentMessages: (appointmentId: string) => Message[];
  getPatientHistory: (patientId: string) => Array<{ date: Date; summary: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}


const MEDICAL_CATEGORIES: Category[] = [
  { id: '1', name: 'General Physician', slug: 'general-physician', description: 'General healthcare and primary care', image: 'https://images.pexels.com/photos/5149754/pexels-photo-5149754.jpeg' },
  { id: '2', name: 'Gynaecology and Sexology', slug: 'gynaecology-sexology', description: 'Women\'s health and reproductive care', image: 'https://images.pexels.com/photos/5982467/pexels-photo-5982467.jpeg' },
  { id: '3', name: 'Dermatology', slug: 'dermatology', description: 'Skin, hair, and nail conditions', image: 'https://tse2.mm.bing.net/th/id/OIP.CiMV-pDItQHRWwTD-xoQWwHaEZ?w=555&h=330&rs=1&pid=ImgDetMain&o=7&rm=3' },
  { id: '4', name: 'Psychiatry and Psychology', slug: 'psychiatry-psychology', description: 'Mental health and behavioral disorders', image: 'https://images.pexels.com/photos/19825313/pexels-photo-19825313.jpeg' },
  { id: '5', name: 'Gastroenterology', slug: 'gastroenterology', description: 'Digestive system disorders', image: 'https://aashrayahospitalgadag.whitecoats.com/wp-content/uploads/sites/66/2023/07/Colon-Surgery.jpg' },
  { id: '6', name: 'Pediatrics', slug: 'pediatrics', description: 'Children\'s healthcare', image: 'https://images.pexels.com/photos/8316306/pexels-photo-8316306.jpeg' },
  { id: '7', name: 'ENT', slug: 'ent', description: 'Ear, nose, and throat conditions', image: 'https://img.freepik.com/premium-vector/ent-doctor-logo-template-ear-nose-throat-doctor-clinic-mouth-health-otolaryngology-illustration_41737-1016.jpg?w=2000' },
  { id: '8', name: 'Urology and Nephrology', slug: 'urology-nephrology', description: 'Urinary system and kidney care', image: 'https://kidneyandurology.org/wp-content/uploads/2023/07/Preventive-Nephrology.png' },
  { id: '9', name: 'Orthopedics', slug: 'orthopedics', description: 'Bone and joint disorders', image: 'https://tse4.mm.bing.net/th/id/OIP.qG33yqxpX2N-pGiHXV6t7QHaE8?rs=1&pid=ImgDetMain&o=7&rm=3' },
  { id: '10', name: 'Neurology', slug: 'neurology', description: 'Brain and nervous system disorders', image: 'https://tse4.mm.bing.net/th/id/OIP.JfzoenJyRtHss-jdRt5BnQHaDt?w=1920&h=960&rs=1&pid=ImgDetMain&o=7&rm=3' },
  { id: '11', name: 'Cardiology', slug: 'cardiology', description: 'Heart and cardiovascular conditions', image: 'https://tse3.mm.bing.net/th/id/OIP.0T2w8g1U6JJ6jIVVMYkXvQHaD4?w=1200&h=630&rs=1&pid=ImgDetMain&o=7&rm=3' },
  { id: '12', name: 'Diabetology', slug: 'nutrition-diabetology', description: 'Nutrition counseling and diabetes care', image: 'https://tse4.mm.bing.net/th/id/OIP.R4QikDolCpYpZpcOcn631QHaEK?rs=1&pid=ImgDetMain&o=7&rm=3' },
  { id: '13', name: 'Ophthalmology', slug: 'ophthalmology', description: 'Eye and vision care', image: 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJvYXV0aCI6eyJjbGllbnRfaWQiOiJmcm9udGlmeS1leHBsb3JlciJ9LCJwYXRoIjoiaWhoLWhlYWx0aGNhcmUtYmVyaGFkXC9hY2NvdW50c1wvYzNcLzQwMDA2MjRcL3Byb2plY3RzXC8yMDlcL2Fzc2V0c1wvMGNcLzMzNzg0XC8zOTQxMTExY2JmZTVkNTlkYmE5MGVkMWQ3NDk3ZGM2Zi0xNjQ2OTI0NzMxLmpwZyJ9:ihh-healthcare-berhad:O6LgxuC6K0djc4JcxeU5q-K8h_Xk2yWXVbxOxobSWOU' },
  { id: '14', name: 'Dentistry', slug: 'dentistry', description: 'Oral and dental health', image: 'https://rosedentalnashua.com/wp-content/uploads/2020/08/AdobeStock_197373009-scaled.jpeg' },
  { id: '15', name: 'Pulmonology', slug: 'pulmonology', description: 'Lung and respiratory conditions', image: 'https://floridalungdoctors.com/wp-content/uploads/2018/04/iStock-675674414-1024x683.jpg' },
  { id: '16', name: 'Oncology', slug: 'oncology', description: 'Cancer diagnosis and treatment', image: 'https://dcjournal.com/wp-content/uploads/2023/03/bigstock-Pulmonology-Medicine-Concept-460989283-e1679862023206.jpg' },
  { id: '17', name: 'Physiotherapy', slug: 'physiotherapy', description: 'Physical therapy and rehabilitation', image: 'https://www.sagarclinic.in/wp-content/uploads/2019/12/Physio-at-home-5-scaled.jpg' },
  { id: '18', name: 'General Surgery', slug: 'general-surgery', description: 'Surgical procedures and interventions', image: 'https://tse4.mm.bing.net/th/id/OIP.aLy1a9b2x7ursFkNCSIx2QHaHa?rs=1&pid=ImgDetMain&o=7&rm=3' },
  { id: '19', name: 'Veterinary', slug: 'veterinary', description: 'Animal healthcare', image: 'https://www.penangveterinarycentre.com/wp-content/uploads/2024/03/Career_desktop.jpg' },
];

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    if (user) loadFromSupabase();
  }, [user]);

  const loadFromSupabase = async () => {
    if (!user) return;

    // Fetch appointments
    const { data: appts } = await supabase.from('appointments').select('*').order('datetime', { ascending: true });
    if (appts) setAppointments(appts.map((apt: any) => ({
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
    })));

    // Fetch messages
    const { data: msgs } = await supabase.from('messages').select('*').order('timestamp', { ascending: true });
    if (msgs) setMessages(msgs.map((m: any) => ({
      id: m.id,
      appointmentId: m.appointment_id,
      senderId: m.sender_id,
      senderRole: m.sender_role,
      content: m.content,
      timestamp: new Date(m.timestamp),
      read: !!m.read,
      attachment: m.attachment_meta ? {
        fileName: m.attachment_meta.fileName,
        fileType: m.attachment_meta.fileType,
        fileSize: m.attachment_meta.fileSize,
        fileData: m.attachment_meta.fileData || '',
      } : undefined,
    })));

    // Fetch activity logs
    const { data: logs } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false });
    if (logs) setActivityLogs(logs.map((l: any) => ({
      id: l.id,
      userId: l.user_id,
      userRole: l.user_role,
      userName: l.user_name,
      action: l.action,
      details: l.details,
      timestamp: new Date(l.timestamp),
    })));

    // Fetch doctors
    const { data: docs } = await supabase.from('doctors').select('*');
    if (docs) {
      const mappedDoctors: Doctor[] = docs.map((d: any) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        role: 'doctor',
        createdAt: new Date(d.created_at),
        category: d.category,
        bio: d.bio ?? '',
        experience: d.experience ?? '',
        degrees: d.degrees ?? undefined,
        isApproved: Boolean(d.is_approved),
      }));
      setDoctors(mappedDoctors);
    }

    // Fetch patients
    const { data: pts, error } = await supabase.from('patients').select('*');
    console.log('Supabase patients:', pts, 'Error:', error);
    if (pts) {
      const mappedPatients: Patient[] = pts.map((p: any) => ({
        id: p.id,
        role: 'patient',
        name: p.email,  // Use email if name not present
        email: p.email,
        age: p.age,
        sex: p.sex,
        height: p.height,
        weight: p.weight,
        medications: p.medications || '',
        allergies: p.allergies || '',
        createdAt: new Date(p.created_at),
      }));
      console.log('Mapped patients:', mappedPatients);
      setPatients(mappedPatients);
    }

  };

  const createAppointment = async (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
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
    setAppointments([...appointments, { ...appointment, id, createdAt: new Date(), updatedAt: new Date() }]);
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.status) payload.status = updates.status;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.recommendations !== undefined) payload.recommendations = updates.recommendations;
    if (updates.prescription !== undefined) payload.prescription = updates.prescription;
    if (updates.doctorNotes !== undefined) payload.doctor_notes = updates.doctorNotes;
    if (updates.patientReview !== undefined) payload.patient_review = updates.patientReview;
    if (updates.patientRating !== undefined) payload.patient_rating = updates.patientRating;
    if (updates.patientVitals !== undefined) payload.patient_vitals = updates.patientVitals;

    await supabase.from('appointments').update(payload).eq('id', id);
    setAppointments(appointments.map(apt => apt.id === id ? { ...apt, ...updates, updatedAt: new Date() } : apt));
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
        attachmentMeta = { fileName: attachment.name, fileType: attachment.type, fileSize: attachment.size, fileData: '' };
      }
    }

    const id = crypto.randomUUID();
    await supabase.from('messages').insert({
      id,
      appointment_id: appointmentId,
      sender_id: user.id,
      sender_role: user.role,
      content: content || (attachmentMeta ? `📎 ${attachmentMeta.fileName}` : ''),
      timestamp: new Date().toISOString(),
      read: false,
      attachment_url: attachmentUrl,
      attachment_meta: attachmentMeta || null,
    });

    setMessages([...messages, { id, appointmentId, senderId: user.id, senderRole: user.role, content: content || (attachmentMeta ? `📎 ${attachmentMeta.fileName}` : ''), timestamp: new Date(), read: false, attachment: attachmentMeta }]);
  };

  const markMessagesAsRead = async (appointmentId: string, userId: string) => {
    await supabase.from('messages').update({ read: true }).eq('appointment_id', appointmentId).neq('sender_id', userId);
    setMessages(messages.map(msg => msg.appointmentId === appointmentId && msg.senderId !== userId ? { ...msg, read: true } : msg));
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

  const getDoctors = () => doctors;

  const approveDoctor = async (doctorId: string) => {
    try {
      console.log('Approving/Revoking doctor:', doctorId);
      const { data, error: fetchError } = await supabase.from('doctors').select('is_approved,name').eq('id', doctorId).limit(1);

      if (fetchError) {
        console.error('Error fetching doctor status:', fetchError);
        return;
      }

      const current = data?.[0];
      if (!current) {
        console.error('Doctor not found:', doctorId);
        return;
      }

      const next = !current.is_approved;
      console.log('Setting is_approved to:', next);

      const { error: updateError } = await supabase.from('doctors').update({ is_approved: next }).eq('id', doctorId);

      if (updateError) {
        console.error('Error updating doctor status:', updateError);
        return;
      }

      // Refresh doctors state
      const { data: refreshed, error: refreshError } = await supabase.from('doctors').select('*');

      if (refreshError) {
        console.error('Error refreshing doctors list:', refreshError);
        return;
      }

      if (refreshed) {
        const mappedDoctors: Doctor[] = refreshed.map((d: any) => ({
          id: d.id,
          name: d.name,
          email: d.email,
          role: 'doctor',
          createdAt: new Date(d.created_at),
          category: d.category,
          bio: d.bio ?? '',
          experience: d.experience ?? '',
          degrees: d.degrees ?? undefined,
          isApproved: Boolean(d.is_approved),
        }));
        setDoctors(mappedDoctors);
        console.log('Doctors list refreshed. Total:', mappedDoctors.length);
      }
    } catch (err) {
      console.error('Unexpected error in approveDoctor:', err);
    }
  };

  const getAppStats = (): AppStats => {
    const totalPatients = patients.length;

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayAppointments = appointments.filter(a => a.datetime.toDateString() === today.toDateString());
    const weekAppointments = appointments.filter(a => a.datetime >= weekAgo);
    const todayMessages = messages.filter(m => m.timestamp.toDateString() === today.toDateString());

    const appointmentsByStatus = appointments.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {} as any);

    const stats = {
      totalDoctors: doctors.length,
      approvedDoctors: doctors.filter(d => d.isApproved).length,
      pendingDoctors: doctors.filter(d => !d.isApproved).length,
      totalPatients,
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
    console.log('App Stats:', stats);
    return stats;
  };

  const getUnreadMessageCount = (appointmentId: string, userId: string) =>
    messages.filter(msg => msg.appointmentId === appointmentId && msg.senderId !== userId && !msg.read).length;

  const getAppointmentMessages = (appointmentId: string) =>
    messages.filter(msg => msg.appointmentId === appointmentId).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const getPatientHistory = (patientId: string) =>
    appointments
      .filter(a => a.patientId === patientId)
      .sort((a, b) => b.datetime.getTime() - a.datetime.getTime())
      .map(a => ({
        date: a.datetime,
        summary: `${a.status} with Dr. ${a.doctorName} (${a.doctorCategory})`,
      }));

  const value: DataContextType = {
    categories: MEDICAL_CATEGORIES,
    appointments,
    patients,
    createAppointment,
    updateAppointment,
    messages,
    sendMessage,
    markMessagesAsRead,
    activityLogs,
    addActivityLog,
    getDoctors,
    approveDoctor,
    getAppStats,
    getUnreadMessageCount,
    getAppointmentMessages,
    getPatientHistory,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};



