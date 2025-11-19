import React, { useEffect, useState } from 'react';
import { LogOut, Users, Calendar, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import PatientList from '../../components/PatientList';
import DoctorList from '../../components/DoctorList';
import AgentPatientChat from '../../components/AgentPatientChat';
import AgentDoctorChat from '../../components/AgentDoctorChat';

const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { onlineUsers, getUnreadCount } = useChat();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDoctorName, setSelectedDoctorName] = useState<string | null>(null);
  const [showDoctorChat, setShowDoctorChat] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'agent') {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get patients and doctors from online users
  const patients = onlineUsers.filter((u) => u.role === 'patient');
  const doctors = onlineUsers.filter((u) => u.role === 'doctor');

  const handleSelectPatient = (patientId: string, patientName: string) => {
    setSelectedPatientId(patientId);
    setSelectedPatientName(patientName);
    setShowChat(true);
  };

  const handleSelectDoctor = (doctorId: string, doctorName: string) => {
    setSelectedDoctorId(doctorId);
    setSelectedDoctorName(doctorName);
    setShowDoctorChat(true);
  };

  const handleBack = () => {
    setShowChat(false);
    setSelectedPatientId(null);
    setSelectedPatientName(null);
  };

  const handleDoctorBack = () => {
    setShowDoctorChat(false);
    setSelectedDoctorId(null);
    setSelectedDoctorName(null);
  };

  // Patient Chat View
  if (showChat) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 flex-shrink-0">
            <PatientList
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={handleSelectPatient}
              getUnreadCount={getUnreadCount}
            />
          </div>
          <div className="flex-1">
            <AgentPatientChat
              selectedPatientId={selectedPatientId}
              selectedPatientName={selectedPatientName}
              onBack={handleBack}
            />
          </div>
        </div>
      </div>
    );
  }

  // Doctor Chat View
  if (showDoctorChat) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 flex-shrink-0">
            <DoctorList
              doctors={doctors}
              selectedDoctorId={selectedDoctorId}
              onSelectDoctor={handleSelectDoctor}
              getUnreadCount={getUnreadCount}
            />
          </div>
          <div className="flex-1">
            <AgentDoctorChat
              selectedDoctorId={selectedDoctorId}
              selectedDoctorName={selectedDoctorName}
              onBack={handleDoctorBack}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent Dashboard</h1>
            {user && (
              <p className="text-gray-600">Welcome, Agent {user.name || 'User'}!</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Patient Chats Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient Chats</h2>
        {patients.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No patients online</h3>
              <p className="text-sm text-gray-500">
                When patients log in, they will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {patients.map((patient) => {
                const unreadCount = getUnreadCount(patient.userId);
                return (
                  <button
                    key={patient.userId}
                    onClick={() => handleSelectPatient(patient.userId, patient.userName)}
                    className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 text-left"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {patient.userName.charAt(0).toUpperCase()}
                      </div>
                      {patient.isOnline && (
                        <div className="absolute bottom-0 right-0">
                          <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{patient.userName}</p>
                      <p className="text-sm text-gray-500">
                        {patient.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <div className="bg-blue-600 text-white text-xs font-semibold rounded-full h-6 w-6 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Doctor Chats Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Doctor Chats</h2>
        {doctors.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors online</h3>
              <p className="text-sm text-gray-500">
                When doctors log in, they will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {doctors.map((doctor) => {
                const unreadCount = getUnreadCount(doctor.userId);
                return (
                  <button
                    key={doctor.userId}
                    onClick={() => handleSelectDoctor(doctor.userId, doctor.userName)}
                    className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 text-left"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {doctor.userName.charAt(0).toUpperCase()}
                      </div>
                      {doctor.isOnline && (
                        <div className="absolute bottom-0 right-0">
                          <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doctor.userName}</p>
                      <p className="text-sm text-gray-500">
                        {doctor.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <div className="bg-blue-600 text-white text-xs font-semibold rounded-full h-6 w-6 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Assigned Patients Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Assigned Patients</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assigned patients yet</h3>
              <p className="text-sm text-gray-500">
                Patients assigned to you will appear here
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Appointments</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Online Patients</p>
              <p className="text-2xl font-bold text-gray-900">{patients.filter(p => p.isOnline).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;


