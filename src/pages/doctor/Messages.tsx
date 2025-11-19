import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, User, Calendar, Clock, Paperclip, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import FileAttachmentComponent from '../../components/FileAttachment';

const Messages = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { appointments, getAppointmentMessages, sendMessage, markMessagesAsRead } = useData();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const appointment = appointments.find(apt => apt.id === appointmentId);

  useEffect(() => {
    if (appointmentId && user) {
      const appointmentMessages = getAppointmentMessages(appointmentId);
      setMessages(appointmentMessages);
      markMessagesAsRead(appointmentId, user.id);
    }
  }, [appointmentId, user, getAppointmentMessages, markMessagesAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedFile) || !appointmentId) return;

    await sendMessage(appointmentId, message, selectedFile || undefined);
    setMessage('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Refresh messages
    const updatedMessages = getAppointmentMessages(appointmentId);
    setMessages(updatedMessages);

    // Navigate back after sending (hash router friendly)
    navigate('/doctor/dashboard', { replace: true });
    setTimeout(() => {
      if (!window.location.hash.includes('#/doctor/dashboard')) {
        window.location.hash = '#/doctor/dashboard';
      }
    }, 0);
  };

  if (!appointment || !user) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Appointment not found</h1>
          <Link to="/doctor/dashboard" className="text-blue-600 hover:text-blue-700">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const canSendMessages = appointment.status === 'accepted';

  return (
    <div className="px-4 sm:px-6 lg:px-8 h-[calc(100vh-120px)]">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <Link 
            to="/doctor/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          
          {/* Appointment Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{appointment.patientName}</h1>
                  <p className="text-gray-600">{appointment.doctorCategory}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
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
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                appointment.status === 'accepted' ? 'bg-green-100 text-green-800' :
                appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {appointment.status === 'accepted' ? 'Confirmed' :
                 appointment.status === 'pending' ? 'Pending' :
                 appointment.status}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col min-h-0">
          {/* Messages List */}
          <div className="flex-1 p-6 overflow-y-auto">
            {!canSendMessages && (
              <div className="text-center py-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    {appointment.status === 'pending' 
                      ? 'Accept the appointment first to enable messaging.'
                      : 'Messaging is not available for this appointment.'
                    }
                  </p>
                </div>
              </div>
            )}

            {messages.length === 0 && canSendMessages && (
              <div className="text-center py-8">
                <p className="text-gray-500">No messages yet. Start the conversation!</p>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.senderId === user.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {msg.content && (
                      <p className={`text-sm ${
                        msg.senderId === user.id ? 'text-white' : 'text-gray-900'
                      }`}>{msg.content}</p>
                    )}
                    {msg.attachment && (
                      <div className="mt-2">
                        <FileAttachmentComponent 
                          attachment={msg.attachment} 
                          isOwnMessage={msg.senderId === user.id}
                        />
                      </div>
                    )}
                    <p className={`text-xs mt-1 ${
                      msg.senderId === user.id ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          {canSendMessages && (
            <div className="border-t border-gray-200 p-4">
              {selectedFile && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Paperclip className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-900 truncate">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-blue-600">
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
                    className="ml-2 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
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
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!message.trim() && !selectedFile}
                  aria-label="Send message"
                  className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
              {/* Attach File Button */}
              <div className="mt-3">
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
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
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

export default Messages;