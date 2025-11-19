import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Calendar, Clock, Paperclip } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import FileAttachmentComponent from './FileAttachment';
import { Message } from '../types';

interface MessageModalProps {
  appointmentId: string;
  onClose: () => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ appointmentId, onClose }) => {
  const { user } = useAuth();
  const { appointments, getAppointmentMessages, sendMessage, markMessagesAsRead } = useData();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<'doctor' | 'agent'>('doctor');
  const [agentMessages, setAgentMessages] = useState<Array<{ id: string; sender: 'patient' | 'agent'; content: string; timestamp: Date }>>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const appointment = appointments.find(apt => apt.id === appointmentId);
  const [doctorOnline, setDoctorOnline] = useState<boolean>(() => {
    try { return localStorage.getItem('doctorAvailability') === 'online'; } catch { return false; }
  });

  useEffect(() => {
    const sync = () => {
      try { setDoctorOnline(localStorage.getItem('doctorAvailability') === 'online'); } catch {}
    };
    const interval = setInterval(sync, 3000);
    const onStorage = (e: StorageEvent) => { if (e.key === 'doctorAvailability') sync(); };
    window.addEventListener('storage', onStorage);
    return () => { clearInterval(interval); window.removeEventListener('storage', onStorage); };
  }, []);

  // Simple privacy masking
  const maskContent = (text: string): string => {
    const phoneRegex = /\b\d{10}\b/;
    const emailRegex = /[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/;
    const addressRegex = /(road|street|st\.?|colony|sector|city|avenue|ave\.?|block|lane)/i;
    if (phoneRegex.test(text) || emailRegex.test(text) || addressRegex.test(text)) {
      return '🔒 [Hidden for privacy]';
    }
    return text;
  };

  const doctorReplies = [
    'Thanks for sharing. I’ll review your report and get back shortly.',
    'Please take this medication twice daily.',
    'Upload your latest blood test report if available.',
    'Please monitor your temperature and stay hydrated.',
  ];

  const simulateDoctorReply = () => {
    if (!appointment) return;
    const content = doctorReplies[Math.floor(Math.random() * doctorReplies.length)];
    const doctorMessage: Message = {
      id: crypto.randomUUID(),
      appointmentId: appointment.id,
      senderId: appointment.doctorId,
      senderRole: 'doctor',
      content,
      timestamp: new Date(),
      read: false,
    };
    setMessages(prev => [...prev, doctorMessage]);
  };

  useEffect(() => {
    if (appointmentId && user) {
      const appointmentMessages = getAppointmentMessages(appointmentId);
      setMessages(appointmentMessages);
      markMessagesAsRead(appointmentId, user.id);
    }
  }, [appointmentId, user, getAppointmentMessages, markMessagesAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentMessages, activeChat]);

  // Initialize Agent Chat when switching to tab the first time
  useEffect(() => {
    if (activeChat === 'agent' && agentMessages.length === 0 && appointment) {
      const intro: Array<{ id: string; sender: 'patient' | 'agent'; content: string; timestamp: Date }> = [
        {
          id: crypto.randomUUID(),
          sender: 'agent',
          content: '👋 Hello! I’m your local support agent. I can help you find nearby hospitals, clinics, or travel options.',
          timestamp: new Date(),
        },
      ];
      const detailsParts = [
        appointment.patientName || 'Patient',
        'Your city',
        appointment.doctorCategory || 'General',
        '₹3000 Budget',
      ];
      intro.push({
        id: crypto.randomUUID(),
        sender: 'agent',
        content: `Patient Details: ${detailsParts.join(' | ')}`,
        timestamp: new Date(),
      });
      setAgentMessages(intro);
    }
  }, [activeChat, agentMessages.length, appointment]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedFile) || !appointmentId) return;

    if (activeChat === 'doctor') {
      // Determine content with privacy masking and upload success copy
      const trimmed = message.trim();
      const contentToSend = selectedFile && !trimmed
        ? `📎 ${selectedFile.name} uploaded successfully.`
        : maskContent(trimmed);

      await sendMessage(appointmentId, contentToSend, selectedFile || undefined);
      setMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh messages
      const updatedMessages = getAppointmentMessages(appointmentId);
      setMessages(updatedMessages);

      // Simulate doctor reply in 1.5s
      setTimeout(simulateDoctorReply, 1500);
    } else {
      // Agent chat path (local only)
      const trimmed = message.trim();
      if (!trimmed && !selectedFile) return;
      const now = new Date();
      const patientMsg = {
        id: crypto.randomUUID(),
        sender: 'patient' as const,
        content: trimmed,
        timestamp: now,
      };
      setAgentMessages(prev => [...prev, patientMsg]);
      setMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => {
        const agentReplies = [
          'There’s a nearby hospital 2 km away — would you like directions?',
          'I’ve found a clinic within your budget.',
          'I can help arrange transport if needed.',
        ];
        const reply = agentReplies[Math.floor(Math.random() * agentReplies.length)];
        setAgentMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'agent', content: reply, timestamp: new Date() }]);
      }, 1500);
    }
  };

  if (!appointment || !user) {
    return null;
  }

  const canSendMessages = appointment.status === 'accepted';
  const isDoctor = user.role === 'doctor';
  const otherPartyName = isDoctor ? appointment.patientName : appointment.doctorName;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-2xl w-full h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-primary-600 to-secondary-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-3">
                  <span>{otherPartyName}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${doctorOnline ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80'}`}>
                    <span className="mr-1">{doctorOnline ? '🟢' : '⚪'}</span>
                    {doctorOnline ? 'Online' : 'Offline'}
                  </span>
                </h2>
                <p className="text-primary-100">{appointment.doctorCategory}</p>
                <div className="flex items-center space-x-4 text-sm text-primary-100 mt-1">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{appointment.datetime.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{appointment.datetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                appointment.status === 'accepted' ? 'bg-success-500/20 text-success-100 border border-success-400/30' :
                appointment.status === 'pending' ? 'bg-warning-500/20 text-warning-100 border border-warning-400/30' :
                'bg-white/20 text-white border border-white/30'
              }`}>
                {appointment.status === 'accepted' ? 'Confirmed' :
                 appointment.status === 'pending' ? (isDoctor ? 'Awaiting Your Approval' : 'Awaiting Confirmation') :
                 appointment.status}
              </div>
              <button 
                onClick={onClose}
                aria-label="Close modal"
                className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {/* Tabs */}
          <div className="border-b border-neutral-200 px-6 pt-4">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => setActiveChat('doctor')}
                className={`text-sm font-semibold px-3 py-2 rounded-t-md ${activeChat === 'doctor' ? 'text-primary-700 border-b-2 border-primary-600' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                Chat with Doctor
              </button>
              <button
                type="button"
                onClick={() => setActiveChat('agent')}
                className={`text-sm font-semibold px-3 py-2 rounded-t-md ${activeChat === 'agent' ? 'text-primary-700 border-b-2 border-primary-600' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                Chat with Agent
              </button>
            </div>
          </div>
          {/* Messages List */}
          <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
            {activeChat === 'agent' && (
              <div className="mb-4">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200">
                  Agent Support
                </div>
              </div>
            )}
            {!canSendMessages && (
              <div className="text-center py-8">
                <div className="bg-warning-50 border border-warning-200 rounded-xl p-6 mb-4">
                  <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-warning-600" />
                  </div>
                  <p className="text-sm text-warning-800 font-medium">
                    {appointment.status === 'pending' 
                      ? (isDoctor 
                          ? 'Accept the appointment first to enable messaging.'
                          : 'Messaging will be available once the doctor confirms your appointment.'
                        )
                      : 'Messaging is not available for this appointment.'
                    }
                  </p>
                </div>
              </div>
            )}

            {messages.length === 0 && canSendMessages && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-medium text-neutral-900 mb-2">Start the conversation</h3>
                <p className="text-neutral-500">Send your first message to begin chatting with {otherPartyName}.</p>
              </div>
            )}

            <div className="space-y-4">
              {(activeChat === 'doctor' ? messages : agentMessages).map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${(activeChat === 'doctor' ? (msg.senderId === user.id) : (msg.sender === 'patient')) ? 'justify-end' : 'justify-start'} animate-slide-up`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-soft ${
                      (activeChat === 'doctor' ? (msg.senderId === user.id) : (msg.sender === 'patient'))
                        ? 'bg-green-100 text-green-900 border border-green-200'
                        : 'bg-blue-50 text-blue-900 border border-blue-200'
                    }`}
                  >
                    {msg.content && (
                      <p className={`text-sm leading-relaxed font-medium`}>{msg.content}</p>
                    )}
                    {msg.attachment && (
                      <div className="mt-2">
                        <FileAttachmentComponent 
                          attachment={msg.attachment} 
                          isOwnMessage={(activeChat === 'doctor' ? (msg.senderId === user.id) : (msg.sender === 'patient'))}
                        />
                      </div>
                    )}
                    <p className={`text-xs mt-2 ${
                      (activeChat === 'doctor' ? (msg.senderId === user.id) : (msg.sender === 'patient')) ? 'text-green-700/70' : 'text-blue-700/70'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          {canSendMessages && (
            <div className="flex-shrink-0 border-t border-neutral-200 p-6 bg-neutral-50">
              {selectedFile && (
                <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Paperclip className="h-4 w-4 text-primary-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-primary-900 truncate">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-primary-600">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="ml-2 p-1 text-primary-600 hover:text-primary-800 hover:bg-primary-100 rounded transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex space-x-4">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={activeChat === 'doctor' ? `Message ${otherPartyName}...` : 'Message Agent Support...'}
                  className="flex-1 form-input bg-white shadow-sm"
                />
                <button
                  type="submit"
                  disabled={!message.trim() && !selectedFile}
                  aria-label="Send message"
                  className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
              {/* Attach File Button */}
              <div className="mt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.zip"
                  aria-label="Attach file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Validate file type
                      const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.zip'];
                      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
                      if (validExtensions.includes(fileExtension)) {
                        setSelectedFile(file);
                      } else {
                        alert('Please select a valid file type (.jpg, .png, .pdf, .zip)');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-neutral-700 bg-white border-2 border-neutral-300 rounded-xl hover:bg-neutral-50 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageModal;