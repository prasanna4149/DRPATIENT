import React from 'react';
import { Circle } from 'lucide-react';
import { OnlineUser } from '../types';

interface DoctorListProps {
  doctors: OnlineUser[];
  selectedDoctorId: string | null;
  onSelectDoctor: (doctorId: string, doctorName: string) => void;
  getUnreadCount: (doctorId: string) => number;
}

const DoctorList: React.FC<DoctorListProps> = ({
  doctors,
  selectedDoctorId,
  onSelectDoctor,
  getUnreadCount,
}) => {
  if (doctors.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">No doctors online</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Doctor Chats</h2>
        <p className="text-sm text-gray-500 mt-1">{doctors.length} doctor(s)</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {doctors.map((doctor) => {
          const unreadCount = getUnreadCount(doctor.userId);
          const isSelected = selectedDoctorId === doctor.userId;

          return (
            <button
              key={doctor.userId}
              onClick={() => onSelectDoctor(doctor.userId, doctor.userName)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {doctor.userName.charAt(0).toUpperCase()}
                    </div>
                    {doctor.isOnline && (
                      <div className="absolute bottom-0 right-0">
                        <Circle className="h-3 w-3 text-green-500 fill-green-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className={`font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {doctor.userName}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {doctor.isOnline ? 'Online' : 'Offline'}
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

export default DoctorList;

