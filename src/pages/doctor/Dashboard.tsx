import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MessageCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Eye
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import MessageModal from '../../components/MessageModel';

type NextBookingCardProps = {
  appointment: any;
  unreadCount: number;
  onShowPatientHistory: (patientId: string) => void;
};

const NextBookingCard: React.FC<NextBookingCardProps> = ({ appointment, unreadCount, onShowPatientHistory }) => {
  const patientHistorySummary = "3 past visits - Last: Annual checkup (Jan 2024)";
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{appointment.patientName}</h3>
          <p className="text-sm text-gray-600">{appointment.doctorCategory}</p>
          <p className="text-xs text-gray-500 mt-1">{patientHistorySummary}</p>
          {appointment.patientVitals && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Current Vitals: </span>
              {appointment.patientVitals.bloodPressure ? (
                <span>BP: {appointment.patientVitals.bloodPressure} </span>
              ) : (
                <span>BP: Not Provided </span>
              )}
              {appointment.patientVitals.temperature ? (
                <span>Temp: {appointment.patientVitals.temperature}°F</span>
              ) : (
                <span>Temp: Not Provided</span>
              )}
            </div>
          )}
          {!appointment.patientVitals && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Current Vitals: </span>
              <span>BP: Not Provided, Temp: Not Provided</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onShowPatientHistory(appointment.patientId)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
            title="View patient history"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
        <div className="flex items-center space-x-1">
          <Calendar className="h-4 w-4" />
          <span>{appointment.datetime.toLocaleDateString()}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4" />
          <span>{appointment.datetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 transition-colors duration-200"
        >
          Accept
        </button>
        <button
          className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md font-medium hover:bg-red-700 transition-colors duration-200"
        >
          Decline
        </button>
      </div>
    </div>
  );
};

type AppointmentItemProps = {
  appointment: any;
  showActions: boolean;
  unreadCount: number;
  isPastDue: boolean;
  onShowPatientHistory: (patientId: string) => void;
  initialRecommendations: string;
  onSaveRecommendations: (value: string) => void;
  initialPrescription: string;
  onSavePrescription: (value: string) => void;
  initialDoctorNotes: string;
  onSaveDoctorNotes: (value: string) => void;
  onMarkCompleted: () => void;
  onMarkNoShow: () => void;
  onMessageClick: (appointmentId: string) => void;
};

const AppointmentItem: React.FC<AppointmentItemProps> = ({
  appointment,
  showActions,
  unreadCount,
  isPastDue,
  onShowPatientHistory,
  initialRecommendations,
  onSaveRecommendations,
  initialPrescription,
  onSavePrescription,
  initialDoctorNotes,
  onSaveDoctorNotes,
  onMarkCompleted,
  onMarkNoShow,
  onMessageClick,
}) => {
  const [recommendationsInput, setRecommendationsInput] = React.useState(initialRecommendations || '');
  const [prescriptionInput, setPrescriptionInput] = React.useState(initialPrescription || '');
  const [doctorNotesInput, setDoctorNotesInput] = React.useState(initialDoctorNotes || '');

  React.useEffect(() => {
    setRecommendationsInput(initialRecommendations || '');
  }, [initialRecommendations, appointment.id]);

  React.useEffect(() => {
    setPrescriptionInput(initialPrescription || '');
  }, [initialPrescription, appointment.id]);

  React.useEffect(() => {
    setDoctorNotesInput(initialDoctorNotes || '');
  }, [initialDoctorNotes, appointment.id]);
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{appointment.patientName}</h3>
          <p className="text-sm text-gray-600">{appointment.doctorCategory}</p>
          {appointment.patientVitals && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Vitals: </span>
              {appointment.patientVitals.bloodPressure && (
                <span>BP: {appointment.patientVitals.bloodPressure} </span>
              )}
              {appointment.patientVitals.temperature && (
                <span>Temp: {appointment.patientVitals.temperature}°F</span>
              )}
            </div>
          )}
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
        <button
          onClick={() => onShowPatientHistory(appointment.patientId)}
          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <Eye className="h-4 w-4" />
          <span>History</span>
        </button>
      </div>

      {appointment.recommendations && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-start space-x-2">
            <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Recommendations:</h4>
              <p className="text-sm text-blue-800">{appointment.recommendations}</p>
            </div>
          </div>
        </div>
      )}

      {appointment.prescription && (
        <div className="mb-4 p-3 bg-green-50 rounded-md">
          <div className="flex items-start space-x-2">
            <FileText className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-900">Prescription:</h4>
              <p className="text-sm text-green-800">{appointment.prescription}</p>
            </div>
          </div>
        </div>
      )}

      {appointment.doctorNotes && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-md">
          <div className="flex items-start space-x-2">
            <FileText className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-900">Doctor's Private Notes:</h4>
              <p className="text-sm text-yellow-800">{appointment.doctorNotes}</p>
            </div>
          </div>
        </div>
      )}

      {appointment.status === 'completed' && !appointment.recommendations && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Recommendations:
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={recommendationsInput}
              onChange={(e) => setRecommendationsInput(e.target.value)}
              placeholder="Treatment notes, medications, follow-up..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button
              onClick={() => onSaveRecommendations(recommendationsInput)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {(appointment.status === 'accepted' || appointment.status === 'completed') && (
        <div className="mb-4 space-y-4">
          {!appointment.prescription && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prescribe Medicine:
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={prescriptionInput}
                  onChange={(e) => setPrescriptionInput(e.target.value)}
                  placeholder="Medicine name, dosage, instructions..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={() => onSavePrescription(prescriptionInput)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors duration-200"
                >
                  Prescribe
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Private Doctor Notes:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={doctorNotesInput}
                onChange={(e) => setDoctorNotesInput(e.target.value)}
                placeholder="Private notes (not visible to patient)..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={() => onSaveDoctorNotes(doctorNotesInput)}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors duration-200"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className={`text-xs px-2 py-1 rounded-full ${appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
            appointment.status === 'accepted' ? 'bg-green-100 text-green-800' :
              appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                appointment.status === 'no_show' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
          }`}>
          {appointment.status === 'completed' ? 'Completed' :
            appointment.status === 'accepted' ? 'Confirmed' :
              appointment.status === 'cancelled' ? 'Cancelled' :
                appointment.status === 'no_show' ? 'No Show' :
                  appointment.status}
        </div>
        <div className="flex items-center space-x-2">
          {isPastDue && showActions && (
            <>
              <button
                onClick={onMarkCompleted}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Mark Completed
              </button>
              <button
                onClick={onMarkNoShow}
                className="bg-orange-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-orange-700 transition-colors duration-200"
              >
                No Show
              </button>
            </>
          )}
          {appointment.status === 'accepted' && (
            <button
              onClick={() => onMessageClick(appointment.id)}
              className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 hover:text-white transition-colors duration-200"
            >
              <MessageCircle className="h-3 w-3" />
              <span>Message</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center ml-1">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { appointments, updateAppointment, getUnreadMessageCount } = useData();
  const [activeTab, setActiveTab] = useState<'next' | 'upcoming' | 'past'>('next');
  const [showPatientHistory, setShowPatientHistory] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<{ [key: string]: string }>({});
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<{ [key: string]: string }>({});
  const [doctorNotes, setDoctorNotes] = useState<{ [key: string]: string }>({});
  const [isAvailable, setIsAvailable] = useState<boolean>(() => {
    try {
      return localStorage.getItem('doctorAvailability') === 'online';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('doctorAvailability', isAvailable ? 'online' : 'offline');
    } catch { }
  }, [isAvailable]);

  if (!user || user.role !== 'doctor') return null;

  const doctorAppointments = appointments.filter(apt => apt.doctorId === user.id);

  // Next Booking - earliest pending appointment
  const nextBooking = doctorAppointments
    .filter(apt => apt.status === 'pending')
    .sort((a, b) => a.datetime.getTime() - b.datetime.getTime())[0];

  // Upcoming - accepted future appointments
  const upcomingAppointments = doctorAppointments
    .filter(apt => apt.status === 'accepted' && apt.datetime > new Date())
    .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

  // Past - completed/cancelled appointments
  const pastAppointments = doctorAppointments
    .filter(apt =>
      apt.status === 'completed' ||
      apt.status === 'cancelled' ||
      apt.status === 'no_show' ||
      (apt.status === 'accepted' && apt.datetime <= new Date())
    )
    .sort((a, b) => b.datetime.getTime() - a.datetime.getTime());

  const handleAcceptAppointment = (appointmentId: string) => {
    updateAppointment(appointmentId, { status: 'accepted' });
  };

  const handleDeclineAppointment = (appointmentId: string) => {
    updateAppointment(appointmentId, { status: 'cancelled' });
  };

  const handleMarkCompleted = (appointmentId: string) => {
    const recommendation = recommendations[appointmentId] || '';
    updateAppointment(appointmentId, {
      status: 'completed',
      recommendations: recommendation
    });
  };

  const handleMarkNoShow = (appointmentId: string) => {
    updateAppointment(appointmentId, { status: 'no_show' });
  };

  const updateRecommendations = (appointmentId: string, recommendation: string) => {
    updateAppointment(appointmentId, { recommendations: recommendation });
  };

  const updatePrescription = (appointmentId: string, prescription: string) => {
    updateAppointment(appointmentId, { prescription: prescription });
  };

  const updateDoctorNotes = (appointmentId: string, notes: string) => {
    updateAppointment(appointmentId, { doctorNotes: notes });
  };

  const mockPatientHistory = {
    'patient-1': [
      { date: new Date('2024-01-15'), summary: 'Annual checkup - all vitals normal' },
      { date: new Date('2023-11-20'), summary: 'Follow-up for blood pressure monitoring' },
      { date: new Date('2023-08-10'), summary: 'Initial consultation for hypertension' },
    ]
  };

  const PatientHistoryModal = ({ patientId, onClose }: { patientId: string; onClose: () => void }) => {
    const { getPatientHistory } = useData();
    const history: Array<{ date: Date; summary: string }> = getPatientHistory(patientId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Patient History</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close modal">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="p-6 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No previous visits</p>
            ) : (
              <div className="space-y-4">
                {history.map((visit: { date: Date; summary: string }, index: number) => (
                  <div key={index} className="border-l-2 border-blue-200 pl-4">
                    <div className="text-sm font-medium text-gray-900">
                      {visit.date.toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {visit.summary}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const NextBookingCard = React.memo(({ appointment }: { appointment: any }) => {
    const unreadCount = getUnreadMessageCount(appointment.id, user.id);

    // Mock patient history summary for demo
    const patientHistorySummary = "3 past visits - Last: Annual checkup (Jan 2024)";

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{appointment.patientName}</h3>
            <p className="text-sm text-gray-600">{appointment.doctorCategory}</p>
            <p className="text-xs text-gray-500 mt-1">{patientHistorySummary}</p>
            {appointment.patientVitals && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Current Vitals: </span>
                {appointment.patientVitals.bloodPressure && (
                  <span>BP: {appointment.patientVitals.bloodPressure} </span>
                )}
                {!appointment.patientVitals.bloodPressure && (
                  <span>BP: Not Provided </span>
                )}
                {appointment.patientVitals.temperature && (
                  <span>Temp: {appointment.patientVitals.temperature}°F</span>
                )}
                {!appointment.patientVitals.temperature && (
                  <span>Temp: Not Provided</span>
                )}
              </div>
            )}
            {!appointment.patientVitals && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Current Vitals: </span>
                <span>BP: Not Provided, Temp: Not Provided</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPatientHistory(appointment.patientId)}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
              title="View patient history"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{appointment.datetime.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{appointment.datetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => handleAcceptAppointment(appointment.id)}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 transition-colors duration-200"
          >
            Accept
          </button>
          <button
            onClick={() => handleDeclineAppointment(appointment.id)}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md font-medium hover:bg-red-700 transition-colors duration-200"
          >
            Decline
          </button>
        </div>
      </div>
    );
  });

  const AppointmentCard = React.memo(({ appointment, showActions = false, onMessageClick }: { appointment: any; showActions?: boolean; onMessageClick?: (appointmentId: string) => void }) => {
    const unreadCount = getUnreadMessageCount(appointment.id, user.id);
    const isPastDue = appointment.datetime <= new Date() && appointment.status === 'accepted';

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{appointment.patientName}</h3>
            <p className="text-sm text-gray-600">{appointment.doctorCategory}</p>
            {appointment.patientVitals && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Vitals: </span>
                {appointment.patientVitals.bloodPressure && (
                  <span>BP: {appointment.patientVitals.bloodPressure} </span>
                )}
                {appointment.patientVitals.temperature && (
                  <span>Temp: {appointment.patientVitals.temperature}°F</span>
                )}
              </div>
            )}
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
          <button
            onClick={() => setShowPatientHistory(appointment.patientId)}
            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Eye className="h-4 w-4" />
            <span>History</span>
          </button>
        </div>

        {appointment.recommendations && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <div className="flex items-start space-x-2">
              <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Recommendations:</h4>
                <p className="text-sm text-blue-800">{appointment.recommendations}</p>
              </div>
            </div>
          </div>
        )}

        {appointment.prescription && (
          <div className="mb-4 p-3 bg-green-50 rounded-md">
            <div className="flex items-start space-x-2">
              <FileText className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-green-900">Prescription:</h4>
                <p className="text-sm text-green-800">{appointment.prescription}</p>
              </div>
            </div>
          </div>
        )}

        {appointment.doctorNotes && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-md">
            <div className="flex items-start space-x-2">
              <FileText className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900">Doctor's Private Notes:</h4>
                <p className="text-sm text-yellow-800">{appointment.doctorNotes}</p>
              </div>
            </div>
          </div>
        )}

        {appointment.status === 'completed' && !appointment.recommendations && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Recommendations:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={recommendations[appointment.id] || ''}
                onChange={(e) => setRecommendations(prev => ({
                  ...prev,
                  [appointment.id]: e.target.value
                }))}
                placeholder="Treatment notes, medications, follow-up..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={() => {
                  updateRecommendations(appointment.id, recommendations[appointment.id] || '');
                  setRecommendations({ ...recommendations, [appointment.id]: '' });
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {(appointment.status === 'accepted' || appointment.status === 'completed') && (
          <div className="mb-4 space-y-4">
            {!appointment.prescription && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prescribe Medicine:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={prescriptions[appointment.id] || ''}
                    onChange={(e) => setPrescriptions(prev => ({
                      ...prev,
                      [appointment.id]: e.target.value
                    }))}
                    placeholder="Medicine name, dosage, instructions..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={() => {
                      updatePrescription(appointment.id, prescriptions[appointment.id] || '');
                      setPrescriptions({ ...prescriptions, [appointment.id]: '' });
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors duration-200"
                  >
                    Prescribe
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Private Doctor Notes:
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={doctorNotes[appointment.id] || appointment.doctorNotes || ''}
                  onChange={(e) => setDoctorNotes(prev => ({
                    ...prev,
                    [appointment.id]: e.target.value
                  }))}
                  placeholder="Private notes (not visible to patient)..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={() => {
                    updateDoctorNotes(appointment.id, doctorNotes[appointment.id] || '');
                    setDoctorNotes({ ...doctorNotes, [appointment.id]: '' });
                  }}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors duration-200"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className={`text-xs px-2 py-1 rounded-full ${appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              appointment.status === 'accepted' ? 'bg-green-100 text-green-800' :
                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  appointment.status === 'no_show' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
            }`}>
            {appointment.status === 'completed' ? 'Completed' :
              appointment.status === 'accepted' ? 'Confirmed' :
                appointment.status === 'cancelled' ? 'Cancelled' :
                  appointment.status === 'no_show' ? 'No Show' :
                    appointment.status}
          </div>

          <div className="flex items-center space-x-2">
            {isPastDue && showActions && (
              <>
                <button
                  onClick={() => handleMarkCompleted(appointment.id)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors duration-200"
                >
                  Mark Completed
                </button>
                <button
                  onClick={() => handleMarkNoShow(appointment.id)}
                  className="bg-orange-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-orange-700 transition-colors duration-200"
                >
                  Patient Absent
                </button>
              </>
            )}
            {appointment.status === 'accepted' && onMessageClick && (
              <button
                onClick={() => onMessageClick(appointment.id)}
                className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 hover:text-white transition-colors duration-200"
              >
                <MessageCircle className="h-3 w-3" />
                <span>Message</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center ml-1">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Doctor Dashboard</h1>
          <p className="text-gray-600">Manage your appointments and patient care</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">Availability:</span>
          <button
            type="button"
            onClick={() => setIsAvailable(v => !v)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full border transition-all duration-300 ${isAvailable ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}
            aria-pressed={isAvailable}
            aria-label="Toggle availability"
          >
            <span className="mr-2 text-lg transition-all duration-300">{isAvailable ? '🟢' : '⚪'}</span>
            <span className={`text-sm font-semibold transition-colors duration-300 ${isAvailable ? 'text-green-700' : 'text-gray-600'}`}>{isAvailable ? 'Online' : 'Offline'}</span>
          </button>
        </div>
      </div>

      {/* Doctor Approval Status */}
      {!user.isApproved && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Account Pending Approval</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your doctor account is pending admin approval. You won't be able to accept appointments until approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('next')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'next'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Next Booking {nextBooking ? '(1)' : '(0)'}
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'upcoming'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Upcoming ({upcomingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'past'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Past ({pastAppointments.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'next' && (
          <div>
            {!nextBooking ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending appointments</h3>
                <p className="text-gray-500">New appointment requests will appear here</p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Next Booking to Review</h2>
                <NextBookingCard
                  appointment={nextBooking}
                  unreadCount={getUnreadMessageCount(nextBooking.id, user.id)}
                  onShowPatientHistory={(pid: string) => setShowPatientHistory(pid)}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming appointments</h3>
                <p className="text-gray-500">Accepted appointments will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Upcoming Appointments</h2>
                {upcomingAppointments.map(appointment => (
                  <AppointmentItem
                    key={appointment.id}
                    appointment={appointment}
                    showActions={true}
                    unreadCount={getUnreadMessageCount(appointment.id, user.id)}
                    isPastDue={appointment.datetime <= new Date() && appointment.status === 'accepted'}
                    onShowPatientHistory={(pid) => setShowPatientHistory(pid)}
                    initialRecommendations={recommendations[appointment.id] || ''}
                    onSaveRecommendations={(value) => {
                      updateRecommendations(appointment.id, value);
                      setRecommendations({ ...recommendations, [appointment.id]: '' });
                    }}
                    initialPrescription={prescriptions[appointment.id] || ''}
                    onSavePrescription={(value) => {
                      updatePrescription(appointment.id, value);
                      setPrescriptions({ ...prescriptions, [appointment.id]: '' });
                    }}
                    initialDoctorNotes={doctorNotes[appointment.id] || appointment.doctorNotes || ''}
                    onSaveDoctorNotes={(value) => {
                      updateDoctorNotes(appointment.id, value);
                      setDoctorNotes({ ...doctorNotes, [appointment.id]: '' });
                    }}
                    onMarkCompleted={() => handleMarkCompleted(appointment.id)}
                    onMarkNoShow={() => handleMarkNoShow(appointment.id)}
                    onMessageClick={setSelectedAppointmentId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'past' && (
          <div>
            {pastAppointments.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No past appointments</h3>
                <p className="text-gray-500">Completed appointments will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Past Appointments</h2>
                {pastAppointments.map(appointment => (
                  <AppointmentItem
                    key={appointment.id}
                    appointment={appointment}
                    showActions={appointment.status === 'accepted'}
                    unreadCount={getUnreadMessageCount(appointment.id, user.id)}
                    isPastDue={appointment.datetime <= new Date() && appointment.status === 'accepted'}
                    onShowPatientHistory={(pid) => setShowPatientHistory(pid)}
                    initialRecommendations={recommendations[appointment.id] || ''}
                    onSaveRecommendations={(value) => {
                      updateRecommendations(appointment.id, value);
                      setRecommendations({ ...recommendations, [appointment.id]: '' });
                    }}
                    initialPrescription={prescriptions[appointment.id] || ''}
                    onSavePrescription={(value) => {
                      updatePrescription(appointment.id, value);
                      setPrescriptions({ ...prescriptions, [appointment.id]: '' });
                    }}
                    initialDoctorNotes={doctorNotes[appointment.id] || appointment.doctorNotes || ''}
                    onSaveDoctorNotes={(value) => {
                      updateDoctorNotes(appointment.id, value);
                      setDoctorNotes({ ...doctorNotes, [appointment.id]: '' });
                    }}
                    onMarkCompleted={() => handleMarkCompleted(appointment.id)}
                    onMarkNoShow={() => handleMarkNoShow(appointment.id)}
                    onMessageClick={setSelectedAppointmentId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Patient History Modal */}
      {showPatientHistory && (
        <PatientHistoryModal
          patientId={showPatientHistory}
          onClose={() => setShowPatientHistory(null)}
        />
      )}

      {/* Message Modal */}
      {selectedAppointmentId && (
        <MessageModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;