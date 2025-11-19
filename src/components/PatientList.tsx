import React from 'react';
import { Circle } from 'lucide-react';
import { OnlineUser } from '../types';

interface PatientListProps {
  patients: OnlineUser[];
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string, patientName: string) => void;
  getUnreadCount: (patientId: string) => number;
}

const PatientList: React.FC<PatientListProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  getUnreadCount,
}) => {
  if (patients.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">No patients online</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Patient Chats</h2>
        <p className="text-sm text-gray-500 mt-1">{patients.length} patient(s)</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {patients.map((patient) => {
          const unreadCount = getUnreadCount(patient.userId);
          const isSelected = selectedPatientId === patient.userId;

          return (
            <button
              key={patient.userId}
              onClick={() => onSelectPatient(patient.userId, patient.userName)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {patient.userName.charAt(0).toUpperCase()}
                    </div>
                    {patient.isOnline && (
                      <div className="absolute bottom-0 right-0">
                        <Circle className="h-3 w-3 text-green-500 fill-green-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className={`font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {patient.userName}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {patient.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <div className="ml-2 bg-blue-600 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PatientList;

