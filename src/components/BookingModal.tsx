import React, { useState } from 'react';
import { X, Calendar, Clock, Activity, Thermometer } from 'lucide-react';

interface BookingModalProps {
  doctor: any;
  onClose: () => void;
  onConfirm: (datetime: Date, vitals?: { bloodPressure?: string; temperature?: string }) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ doctor, onClose, onConfirm }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [bpKnown, setBpKnown] = useState(true);
  const [tempKnown, setTempKnown] = useState(true);

  // Generate available dates (today + next 13 days = 14 days total)
  const availableDates = [];
  const today = new Date();
  for (let i = 0; i <= 13; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    availableDates.push(date);
  }

  // Available time slots
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30'
  ];

  // Filter time slots for today (only future times)
  const getAvailableTimeSlots = () => {
    if (!selectedDate) return timeSlots;
    
    const selected = new Date(selectedDate);
    const now = new Date();
    
    // If selected date is today, filter out past times
    if (selected.toDateString() === now.toDateString()) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      return timeSlots.filter(time => {
        const [hours, minutes] = time.split(':').map(Number);
        const timeInMinutes = hours * 60 + minutes;
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        
        // Add 30 minutes buffer for booking
        return timeInMinutes > currentTimeInMinutes + 30;
      });
    }
    
    return timeSlots;
  };

  const availableTimeSlots = getAvailableTimeSlots();

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const datetime = new Date(selectedDate);
    datetime.setHours(hours, minutes, 0, 0);

    const vitals = {
      bloodPressure: bpKnown ? (bloodPressure || undefined) : undefined,
      temperature: tempKnown ? (temperature || undefined) : undefined,
    };

    onConfirm(datetime, vitals);
  };

  const formatDateForCalendar = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="modal-overlay flex items-center justify-center p-4">
      <div className="modal-content bg-white rounded-2xl shadow-strong max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">Book Appointment</h3>
            <button 
              onClick={onClose} 
              className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg hover:bg-neutral-100 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-neutral-600 mt-1">Dr. {doctor.name}</p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            <div>
              <label className="form-label">
                <Calendar className="h-4 w-4 inline mr-1" />
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime(''); // Reset time when date changes
                }}
                min={formatDateForCalendar(new Date())}
                max={formatDateForCalendar(availableDates[availableDates.length - 1])}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">
                <Clock className="h-4 w-4 inline mr-1" />
                Select Time
              </label>
              {!selectedDate ? (
                <p className="text-sm text-neutral-500 py-4">Please select a date first</p>
              ) : availableTimeSlots.length === 0 ? (
                <p className="text-sm text-error-600 py-4">No available time slots for today. Please select a future date.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableTimeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`px-3 py-2 text-sm border rounded-lg transition-all duration-200 hover:-translate-y-0.5 ${
                        selectedTime === time
                          ? 'bg-primary-600 text-white border-primary-600 shadow-medium'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 hover:border-primary-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="form-label">
                <Activity className="h-4 w-4 inline mr-1" />
                Current BP
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="bp-option"
                      checked={bpKnown}
                      onChange={() => setBpKnown(true)}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700">I know my BP</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="bp-option"
                      checked={!bpKnown}
                      onChange={() => setBpKnown(false)}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700">Don't know</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  disabled={!bpKnown}
                  placeholder="e.g., 120/80"
                  className="form-input disabled:bg-neutral-100 disabled:text-neutral-500"
                />
              </div>
            </div>

            <div>
              <label className="form-label">
                <Thermometer className="h-4 w-4 inline mr-1" />
                Current Temperature
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="temp-option"
                      checked={tempKnown}
                      onChange={() => setTempKnown(true)}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700">I know my temperature</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="temp-option"
                      checked={!tempKnown}
                      onChange={() => setTempKnown(false)}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700">Don't know</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  disabled={!tempKnown}
                  placeholder="e.g., 98.6°F"
                  className="form-input disabled:bg-neutral-100 disabled:text-neutral-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-neutral-200">
          <button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime || availableTimeSlots.length === 0}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;