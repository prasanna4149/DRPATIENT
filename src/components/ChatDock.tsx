import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, MessageCircle, Bot, Stethoscope, Send, Loader2, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
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

interface ChatDockProps {
  isCentered?: boolean;
}

const ChatDock: React.FC<ChatDockProps> = ({ isCentered = false }) => {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // Flow State
  const [recommendedDoctors, setRecommendedDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [intakeSummary, setIntakeSummary] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [appointmentBooked, setAppointmentBooked] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const shouldOpen = localStorage.getItem('openChatDockAfterLogin') === '1';
    if (shouldOpen) {
      setTimeout(() => {
        setIsOpen(true);
        localStorage.removeItem('openChatDockAfterLogin');
        setHasInitialized(true);
      }, 400);
    } else {
      setHasInitialized(true);
    }
  }, []);

  const assistantStatus = useMemo(() => {
    if (loading) return 'Thinking...';
    if (appointmentBooked) return 'Appointment Confirmed';
    return 'AI Health Assistant';
  }, [loading, appointmentBooked]);

  const addMessage = (role: ChatMessage['role'], content: string) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role, content }]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => {
    if (isOpen && messages.length === 0 && user) {
      addMessage('assistant', `Hi ${user.name.split(' ')[0]}! I'm your health assistant. How can I help you today?`);
    }
  }, [isOpen, messages.length, user]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || loading) return;

    setInputText('');
    addMessage('user', text);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });

      const res = await fetch(`${API_URL}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: history.filter(m => m.role !== 'system'),
          patient_context: user ? { name: user.name, age: user.age } : undefined
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');
      const data = await res.json();

      addMessage('assistant', data.message);

      if (data.action === 'recommend_doctor') {
        setRecommendedDoctors(data.data.doctors);
        setIntakeSummary(data.data.intake_summary);
        // The UI will render the doctor selection cards below the last message
      }

    } catch (err) {
      console.error(err);
      addMessage('assistant', 'I encountered an error. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSelectDoctor = (doctor: DoctorProfile) => {
    setSelectedDoctor(doctor);
    addMessage('assistant', `You selected Dr. ${doctor.name}. Please choose a date and time for your appointment.`);
    setShowDatePicker(true);
    setRecommendedDoctors([]);
  };

  const handleDateConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    setShowDatePicker(false);

    // Show confirmation summary
    const summary = `
📋 **Appointment Summary**

**Patient:** ${user?.name}
**Doctor:** Dr. ${selectedDoctor?.name} (${selectedDoctor?.category})
**Date & Time:** ${new Date(selectedDate).toLocaleString()}

**Your Symptoms:**
• Issue: ${intakeSummary?.issue || 'Not specified'}
• Symptoms: ${intakeSummary?.symptoms || 'Not specified'}
• Duration: ${intakeSummary?.duration || 'Not specified'}
• Severity: ${intakeSummary?.severity || 'Not rated'}/10
• Medications: ${intakeSummary?.medications || 'None'}
• Allergies: ${intakeSummary?.allergies || 'None'}

Please review and proceed to payment.`;

    addMessage('assistant', summary);
    setShowPayment(true);
  };

  const handlePayment = async () => {
    setPaymentProcessing(true);
    // Simulate payment delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setPaymentProcessing(false);
    setShowPayment(false);

    await bookAppointment();
  };

  const bookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !intakeSummary || !user || !token) return;
    setLoading(true);
    try {
      const payload = {
        patient_id: user.id,
        doctor_id: selectedDoctor.id,
        patient_name: user.name,
        doctor_name: selectedDoctor.name,
        doctor_category: selectedDoctor.category,
        datetime: new Date(selectedDate).toISOString(),
        symptoms: `${intakeSummary.issue}; ${intakeSummary.symptoms}`,
      };

      const res = await fetch(`${API_URL}/api/assistant/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Booking failed');

      setAppointmentBooked(true);
      addMessage('assistant', 'Payment successful! Your appointment has been confirmed. You can view it in your dashboard.');
      addMessage('assistant', 'A chat channel with the doctor has been opened in the Messages section.');
    } catch (err) {
      console.error(err);
      addMessage('assistant', 'Payment succeeded but booking failed. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (!hasInitialized) return null;

  return (
    <div>
      <div
        className={`chatbot-container ${isOpen ? 'open' : ''} ${isCentered ? 'chatbot-centered' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="pointer-events-auto flex-1 min-h-0 bg-white shadow-2xl border border-neutral-200 rounded-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-white text-neutral-800">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 rounded-full p-2">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900">AI Assistant</p>
                <p className="text-xs font-medium text-blue-600 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                  {assistantStatus}
                </p>
              </div>
            </div>
            <button
              className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
              onClick={() => setIsOpen(false)}
              aria-label="Minimize chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="chatbot-messages flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm whitespace-pre-wrap break-words text-sm leading-relaxed ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Doctor Recommendations */}
            {recommendedDoctors.length > 0 && !selectedDoctor && (
              <div className="space-y-3 mt-4 animate-slide-up">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Recommended Doctors</p>
                {recommendedDoctors.map(doc => (
                  <div key={doc.id} className="doctor-suggestion-card bg-white p-4 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => handleSelectDoctor(doc)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{doc.name}</h4>
                        <p className="text-sm text-blue-500 font-medium">{doc.category}</p>
                        <p className="text-xs text-slate-500 mt-1">{doc.experience || '5+ years experience'}</p>
                      </div>
                      <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <Stethoscope className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <button className="w-full mt-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                      Select Doctor
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Date Picker */}
            {showDatePicker && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-slide-up">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                  Select Appointment Time
                </h4>
                <form onSubmit={handleDateConfirm} className="space-y-3">
                  <input
                    type="datetime-local"
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                  />
                  <button type="submit" className="w-full py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors">
                    Confirm Time
                  </button>
                </form>
              </div>
            )}

            {/* Payment Section */}
            {showPayment && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-slide-up">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                  Complete Payment
                </h4>
                <div className="bg-slate-50 p-3 rounded-lg mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Consultation Fee</span>
                    <span className="font-semibold">$50.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Service Fee</span>
                    <span className="font-semibold">$2.00</span>
                  </div>
                  <div className="border-t border-slate-200 my-2"></div>
                  <div className="flex justify-between text-sm font-bold text-slate-900">
                    <span>Total</span>
                    <span>$52.00</span>
                  </div>
                </div>
                <button
                  onClick={handlePayment}
                  disabled={paymentProcessing}
                  className="w-full py-2.5 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  {paymentProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Pay & Book Appointment'
                  )}
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <footer className={`px-4 py-3 border-t border-neutral-200 bg-white`}>
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative pointer-events-auto">
                <input
                  type="text"
                  value={inputText}
                  disabled={loading || showDatePicker || showPayment || appointmentBooked}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  ref={inputRef}
                  placeholder={appointmentBooked ? "Appointment booked!" : "Type your reply..."}
                  className="flex-1 form-input rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-blue-500 pr-10"
                  aria-label="Chat input"
                />
                {loading && (
                  <Loader2 className="h-4 w-4 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
              <button
                onClick={() => void handleSend()}
                disabled={!inputText.trim() || loading || showDatePicker || showPayment || appointmentBooked}
                className="inline-flex items-center px-4 py-2 rounded-2xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-50"
                aria-label="Send message"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </div>
            {appointmentBooked && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center space-x-1">
                <CheckCircle className="h-4 w-4" />
                <span>Appointment confirmed! Check your dashboard and Messages section.</span>
              </p>
            )}
          </footer>
        </div>
      </div>

      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`chatbot-toggle pointer-events-auto ${isCentered ? 'chatbot-toggle-centered' : ''} ${isOpen ? 'open' : ''}`}
        aria-label={isOpen ? 'Minimize chat' : 'Open chat'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default ChatDock;
