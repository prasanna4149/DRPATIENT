import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MessageCircle, User, CheckCircle, XCircle, AlertCircle, Star } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import MessageModal from '../../components/MessageModel';

const Appointments = () => {
  const { user } = useAuth();
  const { appointments, getUnreadMessageCount } = useData();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  if (!user) return null;

  const patientAppointments = appointments.filter(apt => apt.patientId === user.id);

  const upcomingAppointments = patientAppointments.filter(apt => 
    apt.status === 'pending' || 
    (apt.status === 'accepted' && apt.datetime > new Date())
  );

  const pastAppointments = patientAppointments.filter(apt => 
    apt.status === 'completed' || 
    apt.status === 'cancelled' || 
    apt.status === 'no_show' ||
    (apt.status === 'accepted' && apt.datetime <= new Date())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'no_show':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Awaiting Confirmation';
      case 'accepted':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'no_show':
        return 'No Show';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const AppointmentCard = ({ appointment, isPast }: { appointment: any; isPast: boolean }) => {
    const [doctorOnline, setDoctorOnline] = React.useState<boolean>(() => {
      try { return localStorage.getItem('doctorAvailability') === 'online'; } catch { return false; }
    });
    React.useEffect(() => {
      const sync = () => {
        try { setDoctorOnline(localStorage.getItem('doctorAvailability') === 'online'); } catch {}
      };
      const t = setInterval(sync, 3000);
      const onStorage = (e: StorageEvent) => { if (e.key === 'doctorAvailability') sync(); };
      window.addEventListener('storage', onStorage);
      return () => { clearInterval(t); window.removeEventListener('storage', onStorage); };
    }, []);
    const unreadCount = getUnreadMessageCount(appointment.id, user.id);
    const rating = appointment.patientRating as number | undefined;
    const reviewText = appointment.patientReview as string | undefined;
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <span>{appointment.doctorName}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${doctorOnline ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                  <span className="mr-1">{doctorOnline ? '🟢' : '⚪'}</span>
                  {doctorOnline ? 'Online' : 'Offline'}
                </span>
              </h3>
              <p className="text-sm text-gray-600">{appointment.doctorCategory}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(appointment.status)}`}>
            {getStatusIcon(appointment.status)}
            <span>{getStatusText(appointment.status)}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{appointment.datetime.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{appointment.datetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {appointment.notes && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">{appointment.notes}</p>
          </div>
        )}

        {isPast && appointment.recommendations && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-1">Doctor's Recommendations:</h4>
            <p className="text-sm text-blue-800">{appointment.recommendations}</p>
          </div>
        )}

        {appointment.prescription && (
          <div className="mb-4 p-3 bg-green-50 rounded-md">
            <h4 className="text-sm font-medium text-green-900 mb-1">Prescription:</h4>
            <p className="text-sm text-green-800">{appointment.prescription}</p>
          </div>
        )}

        {isPast && rating && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-md">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">Your Review:</h4>
            <div className="flex items-center mb-1">
              {[1,2,3,4,5].map((i) => (
                <Star key={i} className={`h-4 w-4 mr-1 ${i <= rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
              ))}
              <span className="ml-2 text-sm text-yellow-800">{rating}/5</span>
            </div>
            {reviewText && (
              <p className="text-sm text-yellow-800">{reviewText}</p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Booked on {appointment.createdAt.toLocaleDateString()}
          </div>
          {appointment.status === 'accepted' && !isPast && (
            <button
              onClick={() => setSelectedAppointmentId(appointment.id)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 hover:text-white transition-colors duration-200"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Message</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
        <p className="text-gray-600">Manage your upcoming and past appointments</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'upcoming'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Upcoming ({upcomingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'past'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Past ({pastAppointments.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {activeTab === 'upcoming' && (
          <>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming appointments</h3>
                <p className="text-gray-500 mb-6">Book your first appointment to get started</p>
                <Link
                  to="/patient/browse"
                  className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 hover:text-white transition-colors duration-200"
                >
                  Browse Doctors
                </Link>
              </div>
            ) : (
              upcomingAppointments
                .sort((a, b) => a.datetime.getTime() - b.datetime.getTime())
                .map(appointment => (
                  <AppointmentCard key={appointment.id} appointment={appointment} isPast={false} />
                ))
            )}
          </>
        )}

        {activeTab === 'past' && (
          <>
            {pastAppointments.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No past appointments</h3>
                <p className="text-gray-500">Your completed appointments will appear here</p>
              </div>
            ) : (
              pastAppointments
                .sort((a, b) => b.datetime.getTime() - a.datetime.getTime())
                .map(appointment => (
                  <AppointmentCard key={appointment.id} appointment={appointment} isPast={true} />
                ))
            )}
          </>
        )}
      </div>

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

export default Appointments;