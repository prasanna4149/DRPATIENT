import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, MessageCircle, Bot, Stethoscope, Send, Loader2, MessageCircleQuestion } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useChat } from '../contexts/ChatContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  meta?: Record<string, string | number | undefined>;
}

interface PatientProfile {
  id: string;
  name: string;
  email: string;
  age?: number | null;
  sex?: string | null;
  height?: string | null;
  weight?: string | null;
  medications?: string | null;
  allergies?: string | null;
}

interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  category: string;
  bio?: string | null;
  experience?: string | null;
  degrees?: string | null;
}

type ConversationStep =
  | 'welcome'
  | 'collect_issue'
  | 'collect_symptoms'
  | 'collect_duration'
  | 'collect_severity'
  | 'collect_medications'
  | 'collect_allergies'
  | 'confirm_summary'
  | 'fetch_doctors'
  | 'suggest_doctor'
  | 'collect_schedule'
  | 'handoff'
  | 'completed'
  | 'error';

const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  Cardiology: ['heart', 'chest pain', 'palpitation', 'bp', 'blood pressure', 'hypertension', 'stroke'],
  Dermatology: ['skin', 'rash', 'itch', 'acne', 'psoriasis', 'eczema', 'hair', 'nail'],
  Neurology: ['headache', 'migraine', 'seizure', 'stroke', 'numbness', 'tingling', 'memory', 'brain'],
  Pulmonology: ['cough', 'breath', 'asthma', 'wheezing', 'lung', 'chest tightness'],
  Orthopedics: ['joint', 'knee', 'hip', 'back pain', 'fracture', 'bone', 'spine'],
  Ophthalmology: ['eye', 'vision', 'blurry', 'red eye', 'dry eye', 'cataract'],
  ENT: ['ear', 'nose', 'throat', 'sinus', 'hearing', 'tonsil', 'ringing'],
  Gastroenterology: ['stomach', 'abdomen', 'liver', 'digestion', 'ulcer', 'vomit', 'nausea'],
  Psychiatry: ['anxiety', 'depression', 'stress', 'sleep', 'mental', 'panic', 'trauma'],
  Endocrinology: ['diabetes', 'thyroid', 'hormone', 'weight gain', 'pcos'],
  Nephrology: ['kidney', 'urine', 'dialysis', 'renal', 'stones'],
  Urology: ['urine', 'prostate', 'bladder', 'stones', 'incontinence'],
  Pediatrics: ['child', 'baby', 'infant', 'pediatric']
};

const questionTemplates: Record<Exclude<ConversationStep, 'welcome' | 'fetch_doctors' | 'suggest_doctor' | 'handoff' | 'completed' | 'error'>, string> = {
  collect_issue: 'Can you describe what illness or concern you are facing today?',
  collect_symptoms: 'What symptoms are you experiencing? Feel free to list multiple.',
  collect_duration: 'Since when have you been experiencing these symptoms?',
  collect_severity: 'On a scale of 1 (mild) to 10 (severe), how intense are the symptoms?',
  collect_medications: 'Are you currently taking any medications or treatments related to this issue?',
  collect_allergies: 'Do you have any known allergies or sensitivities we should be aware of?',
  confirm_summary: 'Does the summary above look correct? Reply yes to proceed or highlight anything to change.',
  collect_schedule: 'When would you like to schedule the appointment? Please provide date and time (e.g., 2025-11-20 15:30).'
};

const DOCTOR_NAMES = [
  'Dr. Aisha Khan',
  'Dr. David Chen',
  'Dr. Priya Patel',
  'Dr. Michael Brown',
  'Dr. Sofia Martinez',
  'Dr. Liam O’Connor',
  'Dr. Emma Wilson',
  'Dr. Noah Anderson'
];

interface ChatDockProps {
  isCentered?: boolean;
}

const ChatDock: React.FC<ChatDockProps> = ({ isCentered = false }) => {
  const { user, token } = useAuth();
  const { sendMessage: sendRealtimeMessage, onlineUsers } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [step, setStep] = useState<ConversationStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [intake, setIntake] = useState({
    issue: '',
    symptoms: '',
    duration: '',
    severity: '',
    medications: '',
    allergies: '',
    schedule: ''
  });
  const [suggestedDoctor, setSuggestedDoctor] = useState<DoctorProfile | null>(null);
  const [handedOffDoctorId, setHandedOffDoctorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const shouldOpen = localStorage.getItem('openChatDockAfterLogin') === '1';
    if (shouldOpen) {
      const t = setTimeout(() => {
        setIsOpen(true);
        localStorage.removeItem('openChatDockAfterLogin');
        setHasInitialized(true);
      }, 400);
      return () => clearTimeout(t);
    }
    setHasInitialized(true);
  }, []);

  const assistantStatus = useMemo(() => {
    if (loading) return 'Thinking...';
    if (step === 'handoff' && handedOffDoctorId) return 'Chat started with doctor';
    if (error) return 'Issue loading assistant';
    return 'Ready to help';
  }, [loading, step, handedOffDoctorId, error]);

  useEffect(() => {
    const shouldOpen = localStorage.getItem('openChatDockAfterLogin') === '1';
    if (shouldOpen) {
      const t = setTimeout(() => {
        setIsOpen(true);
        localStorage.removeItem('openChatDockAfterLogin');
        setHasInitialized(true);
      }, 400);
      return () => clearTimeout(t);
    }
    setHasInitialized(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setHasEntered(true), 40);
      return () => clearTimeout(t);
    }
    setHasEntered(false);
  }, [isOpen]);

  useEffect(() => {
    if (hasEntered) {
      inputRef.current?.focus();
    }
  }, [hasEntered]);

  const addMessage = (role: ChatMessage['role'], content: string, meta?: ChatMessage['meta']) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role, content, meta }]);
  };

  useEffect(() => {
    if (!isOpen || messages.length > 0) return;
    addMessage('assistant', 'Hi there! I’m your personal health assistant. Let me look you up...');
    bootstrapProfile();
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;
    setInputText('');
    addMessage('user', trimmed);
    inputRef.current?.focus();

    switch (step) {
      case 'collect_issue':
        setIntake(prev => ({ ...prev, issue: trimmed }));
        setStep('collect_symptoms');
        addMessage('assistant', questionTemplates.collect_symptoms);
        break;
      case 'collect_symptoms':
        setIntake(prev => ({ ...prev, symptoms: trimmed }));
        setStep('collect_duration');
        addMessage('assistant', questionTemplates.collect_duration);
        break;
      case 'collect_duration':
        setIntake(prev => ({ ...prev, duration: trimmed }));
        setStep('collect_severity');
        addMessage('assistant', questionTemplates.collect_severity);
        break;
      case 'collect_severity':
        if (!/^(10|[1-9])$/.test(trimmed)) {
          addMessage('assistant', 'Please enter a whole number from 1 to 10 to describe severity.');
          return;
        }
        setIntake(prev => ({ ...prev, severity: trimmed }));
        setStep('collect_medications');
        addMessage('assistant', questionTemplates.collect_medications);
        break;
      case 'collect_medications':
        setIntake(prev => ({ ...prev, medications: trimmed }));
        setStep('collect_allergies');
        addMessage('assistant', questionTemplates.collect_allergies);
        break;
      case 'collect_allergies':
        setIntake(prev => ({ ...prev, allergies: trimmed }));
        summarizeIntake({ ...intake, allergies: trimmed });
        break;
      case 'confirm_summary':
        if (trimmed.toLowerCase().startsWith('y')) {
          setStep('fetch_doctors');
          await fetchMatchingDoctor();
        } else {
          addMessage('assistant', 'No worries—please tell me which part to update or re-describe your symptoms.');
          setStep('collect_symptoms');
        }
        break;
      case 'suggest_doctor':
        if (!suggestedDoctor) {
          addMessage('assistant', 'I do not yet have a doctor suggestion. Let’s try fetching again.');
          await fetchMatchingDoctor();
          return;
        }
        if (trimmed.toLowerCase().includes('yes')) {
          if (!intake.schedule) {
            addMessage('assistant', questionTemplates.collect_schedule);
            setStep('collect_schedule');
            return;
          }
          await handoffToDoctor();
        } else if (trimmed.toLowerCase().includes('no')) {
          addMessage('assistant', 'Okay, let me look for another specialist.');
          await fetchMatchingDoctor(true);
        } else {
          addMessage('assistant', 'Please reply "yes" to proceed with this doctor, or "no" if you’d like another option.');
        }
        break;
      case 'collect_schedule':
        {
          const dt = new Date(trimmed);
          if (isNaN(dt.getTime())) {
            addMessage('assistant', 'I could not understand that date/time. Please use a format like 2025-11-20 15:30.');
            return;
          }
          if (dt.getTime() <= Date.now()) {
            addMessage('assistant', 'The selected time is in the past. Please provide a future date and time.');
            return;
          }
          setIntake(prev => ({ ...prev, schedule: dt.toISOString() }));
          await handoffToDoctor();
        }
        break;
      case 'handoff':
        addMessage('assistant', 'You are already connected with the doctor. Please continue chatting in the dedicated window.');
        break;
      default:
        addMessage('assistant', 'Let me review your details once more.');
    }
  };

  const bootstrapProfile = async () => {
    if (!user || !token) {
      addMessage('assistant', 'Please sign in to use the assistant.');
      setStep('completed');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/assistant/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Profile fetch failed');
      const json = await res.json();
      const data = json.patient;
      const patient: PatientProfile = {
        id: data.id,
        name: data.name,
        email: data.email,
        age: data.age,
        sex: data.sex,
        height: data.height,
        weight: data.weight,
        medications: data.medications,
        allergies: data.allergies,
      };
      setProfile(patient);
      addMessage('assistant', `Hi ${patient.name.split(' ')[0]} 👋. I’m here to help you find the right doctor.`);
      setStep('collect_issue');
      addMessage('assistant', questionTemplates.collect_issue);
    } catch (err: any) {
      console.error('Failed to load patient profile', err);
      setError(err.message || 'Unable to fetch profile');
      addMessage('assistant', 'I had trouble loading your profile. Please refresh and try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const summarizeIntake = (finalIntake = intake) => {
    const summary = `Summary:
• Issue: ${finalIntake.issue || 'Not specified'}
• Symptoms: ${finalIntake.symptoms || 'Not specified'}
• Duration: ${finalIntake.duration || 'Not specified'}
• Severity: ${finalIntake.severity || 'Not rated'}
• Medications: ${finalIntake.medications || 'None reported'}
• Allergies: ${finalIntake.allergies || 'None reported'}`;
    addMessage('assistant', summary.replace(/\n/g, '\n'));
    addMessage('assistant', questionTemplates.confirm_summary);
    setStep('confirm_summary');
  };

  const detectSpecialty = () => {
    const text = `${intake.issue} ${intake.symptoms}`.toLowerCase();
    let bestMatch: { specialty: string; score: number } | null = null;
    Object.entries(SPECIALTY_KEYWORDS).forEach(([specialty, keywords]) => {
      const score = keywords.reduce((acc, keyword) => (text.includes(keyword) ? acc + 1 : acc), 0);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { specialty, score };
      }
    });
    if (bestMatch && bestMatch.score > 0) {
      return bestMatch.specialty;
    }
    return undefined;
  };

  const fetchMatchingDoctor = async (excludeCurrent = false) => {
    if (!token) return;
    setLoading(true);
    try {
      addMessage('assistant', 'Let me search for suitable doctors...');
      const res = await fetch(`${API_URL}/api/assistant/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          issue: intake.issue,
          symptoms: intake.symptoms,
          duration: intake.duration,
          severity: intake.severity ? Number(intake.severity) : undefined,
          medications: intake.medications,
          allergies: intake.allergies,
          exclude_doctor_id: excludeCurrent ? suggestedDoctor?.id : undefined,
        }),
      });
      if (!res.ok) throw new Error('Doctor recommend failed');
      const json = await res.json();
      const doc = json.doctor;
      if (!doc) {
        addMessage('assistant', 'I could not find an approved doctor that matches the criteria right now. I can notify you when one is available.');
        setStep('completed');
        return;
      }
      const doctor: DoctorProfile = {
        id: doc.id,
        name: doc.name,
        email: doc.email,
        category: doc.category,
        bio: doc.bio,
        degrees: doc.degrees,
        experience: doc.experience,
      };
      setSuggestedDoctor(doctor);
      setStep('suggest_doctor');
      addMessage(
        'assistant',
        `I recommend ${doctor.name} (${doctor.category}). ${doctor.experience ? `Experience: ${doctor.experience}. ` : ''}Would you like to proceed with this doctor? (yes/no)`
      );
    } catch (err: any) {
      console.error('Doctor search failed', err);
      addMessage('assistant', 'I had trouble fetching doctors. Please try again later.');
      setError(err.message || 'Doctor search failed');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handoffToDoctor = async () => {
    if (!user || !token || !profile || !suggestedDoctor) {
      addMessage('assistant', 'I lost the doctor details. Let me search again.');
      await fetchMatchingDoctor();
      return;
    }
    if (!intake.schedule) {
      addMessage('assistant', questionTemplates.collect_schedule);
      setStep('collect_schedule');
      return;
    }
    const dt = new Date(intake.schedule);
    if (isNaN(dt.getTime()) || dt.getTime() <= Date.now()) {
      addMessage('assistant', 'The selected time is invalid or in the past. Please provide a future date and time.');
      setStep('collect_schedule');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        patient_id: user.id,
        doctor_id: suggestedDoctor.id,
        patient_name: profile.name,
        doctor_name: suggestedDoctor.name,
        doctor_category: suggestedDoctor.category,
        datetime: dt.toISOString(),
        symptoms: `${intake.issue}; ${intake.symptoms}`,
      };
      const res = await fetch(`${API_URL}/api/assistant/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Appointment request failed');
      setHandedOffDoctorId(suggestedDoctor.id);
      setStep('handoff');
      addMessage('assistant', 'Appointment request sent to the doctor. Chat will be enabled once the doctor approves. You can check the Messages section after approval.');
      addMessage('assistant', 'If you would like another recommendation, just type "restart".');
    } catch (err: any) {
      console.error('Failed to create appointment', err);
      addMessage('assistant', 'I could not request the appointment due to a system issue. Please try again.');
      setError(err.message || 'Appointment request failed');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  if (!hasInitialized) return null;

  return (
    <div className="pointer-events-none">
      <h2 className={`chatbot-heading ${isOpen ? 'open' : ''} ${isCentered ? 'chatbot-centered' : ''}`}>AI Health Assistant 💬</h2>
      <div className={`chatbot-container ${isOpen ? 'open' : ''} ${isCentered ? 'chatbot-centered' : ''}`} {...(isOpen ? {} : { 'aria-hidden': true })}>
        <div className="pointer-events-auto flex-1 min-h-0 bg-white shadow-2xl border border-neutral-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-gradient-to-r from-sky-500 to-blue-600 text-white">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-full p-2">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide opacity-80">AI Assistant</p>
                <p className="text-sm font-semibold">{assistantStatus}</p>
              </div>
            </div>
            <button
              className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition"
              onClick={() => setIsOpen(false)}
              aria-label="Minimize chat"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>

          <section className="flex-1 flex flex-col bg-[#e6f7ff]">
            <header className={`px-4 py-3 border-b border-neutral-200 flex items-center space-x-2 ${hasEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'} transition-all`}>
              <Stethoscope className="h-5 w-5 text-blue-500" />
              <p className="text-sm text-slate-600">Describe your symptoms and I’ll find the right doctor.</p>
            </header>

            <div className={`chatbot-messages flex-1 overflow-y-auto px-4 py-4 space-y-3 ${hasEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all`} aria-live="polite">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div
                    className={`max-w-[85%] px-4 py-2 rounded-2xl shadow-sm border whitespace-pre-wrap break-words text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : msg.role === 'system'
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : 'bg-white text-gray-900 border-gray-200'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <footer className={`px-4 py-3 border-t border-neutral-200 bg-white`}>
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    disabled={step === 'error' || step === 'completed'}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    ref={inputRef}
                    placeholder={step === 'handoff' ? 'Please continue the chat in Messages section.' : 'Type your reply...'}
                    className="flex-1 form-input rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-blue-500 pr-10"
                  />
                  {loading && (
                    <Loader2 className="h-4 w-4 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || loading || step === 'error' || step === 'completed'}
                  className="inline-flex items-center px-4 py-2 rounded-2xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </button>
              </div>
              {step === 'handoff' && handedOffDoctorId && (
                <p className="text-xs text-emerald-600 mt-2 flex items-center space-x-1">
                  <MessageCircleQuestion className="h-4 w-4" />
                  <span>Doctor chat is ready. Visit Messages to continue the conversation.</span>
                </p>
              )}
            </footer>
          </section>
        </div>
      </div>

      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`chatbot-toggle pointer-events-auto ${isCentered ? 'chatbot-toggle-centered' : ''}`}
        aria-label={isOpen ? 'Minimize chat' : 'Open chat'}
      >
        {isOpen ? <Minus className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default ChatDock;
