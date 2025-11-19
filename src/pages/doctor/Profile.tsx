import React, { useState, useEffect, useRef } from 'react';
import { User, Save, Edit3, Stethoscope, GraduationCap, FileText, TrendingUp, Users, Calendar, Star, Award, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { categories, appointments } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    category: user?.category || '',
    bio: user?.bio || '',
    experience: user?.experience || '',
    degrees: user?.degrees || '',
  });

  // Availability timing state - stores start times, end times are fixed
  const [availabilityTiming, setAvailabilityTiming] = useState({
    morning: '9:00 AM',
    evening: '6:00 PM',
  });
  // Fixed end times for shifts
  const shiftEndTimes = {
    morning: '4:00 PM',
    evening: '9:00 PM',
  };
  const [savedAvailability, setSavedAvailability] = useState<{ morning: string; evening: string } | null>(null);

  // Refs for scroll containers
  const morningHourRef = useRef<HTMLDivElement>(null);
  const morningMinuteRef = useRef<HTMLDivElement>(null);
  const eveningHourRef = useRef<HTMLDivElement>(null);
  const eveningMinuteRef = useRef<HTMLDivElement>(null);
  
  // Track programmatic scrolling to prevent state updates from scroll events
  const isProgrammaticScroll = useRef({ morning: { hour: false, minute: false }, evening: { hour: false, minute: false } });

  // Helper function to parse time string (e.g., "9:00 AM" -> { hour: 9, minute: 0, period: "AM" })
  const parseTime = (timeStr: string): { hour: number; minute: number; period: string } => {
    if (!timeStr) return { hour: 9, minute: 0, period: 'AM' };
    const parts = timeStr.trim().split(' ');
    const period = parts[1] || 'AM';
    const timePart = parts[0] || '9:00';
    const [hourStr, minuteStr] = timePart.split(':');
    const hour = parseInt(hourStr || '9', 10);
    const minute = parseInt(minuteStr || '0', 10);
    return { hour: Math.max(1, Math.min(12, hour)), minute: Math.max(0, Math.min(59, minute)), period };
  };

  // Helper function to format time (e.g., { hour: 9, minute: 0, period: "AM" } -> "9:00 AM")
  const formatTime = (hour: number, minute: number, period: string): string => {
    return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  // Initialize scroll positions based on current availability timing
  const initializeScrollPositions = () => {
    const scrollItemHeight = 50;

    // Morning shift
    const morningTime = parseTime(availabilityTiming.morning);
    if (morningHourRef.current) {
      const hourIndex = morningTime.hour - 1;
      // Scroll to center the item (padding is already in the DOM)
      morningHourRef.current.scrollTop = hourIndex * scrollItemHeight;
      // Force a re-render to ensure scroll position is set
      setTimeout(() => {
        if (morningHourRef.current) {
          morningHourRef.current.scrollTop = hourIndex * scrollItemHeight;
        }
      }, 50);
    }
    if (morningMinuteRef.current) {
      morningMinuteRef.current.scrollTop = morningTime.minute * scrollItemHeight;
      setTimeout(() => {
        if (morningMinuteRef.current) {
          morningMinuteRef.current.scrollTop = morningTime.minute * scrollItemHeight;
        }
      }, 50);
    }

    // Evening shift
    const eveningTime = parseTime(availabilityTiming.evening);
    if (eveningHourRef.current) {
      const hourIndex = eveningTime.hour - 1;
      eveningHourRef.current.scrollTop = hourIndex * scrollItemHeight;
      setTimeout(() => {
        if (eveningHourRef.current) {
          eveningHourRef.current.scrollTop = hourIndex * scrollItemHeight;
        }
      }, 50);
    }
    if (eveningMinuteRef.current) {
      eveningMinuteRef.current.scrollTop = eveningTime.minute * scrollItemHeight;
      setTimeout(() => {
        if (eveningMinuteRef.current) {
          eveningMinuteRef.current.scrollTop = eveningTime.minute * scrollItemHeight;
        }
      }, 50);
    }
  };

  // Load saved availability on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('doctorAvailabilityTiming');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Handle backward compatibility: parse range format or single time format
        const parseTimeFromRange = (timeStr: string): string => {
          if (!timeStr) return '';
          // Check if it's in range format (e.g., "9:00 AM – 4:00 PM")
          if (timeStr.includes('–') || timeStr.includes('-')) {
            // Extract start time (before the dash)
            const startTime = timeStr.split(/[–-]/)[0].trim();
            return startTime;
          }
          // Otherwise, it's already a single time
          return timeStr;
        };
        
        const morningStart = parseTimeFromRange(parsed.morning) || '9:00 AM';
        const eveningStart = parseTimeFromRange(parsed.evening) || '6:00 PM';
        
        setSavedAvailability(parsed);
        setAvailabilityTiming({
          morning: morningStart,
          evening: eveningStart,
        });
      } else {
        // Set default values for new users
        setAvailabilityTiming({
          morning: '9:00 AM',
          evening: '6:00 PM',
        });
      }
    } catch (error) {
      console.error('Error loading availability timing:', error);
      // Set default values on error
      setAvailabilityTiming({
        morning: '9:00 AM',
        evening: '6:00 PM',
      });
    }
  }, []);

  // Initialize scroll positions when availability timing changes
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeScrollPositions();
    }, 100);
    return () => clearTimeout(timer);
  }, [availabilityTiming.morning, availabilityTiming.evening]);

  if (!user || user.role !== 'doctor') return null;

  // Calculate KPIs
  const doctorAppointments = appointments.filter(apt => apt.doctorId === user.id);
  const completedAppointments = doctorAppointments.filter(apt => apt.status === 'completed');
  const totalPatients = new Set(doctorAppointments.map(apt => apt.patientId)).size;
  const thisMonthAppointments = doctorAppointments.filter(apt => {
    const appointmentDate = new Date(apt.datetime);
    const now = new Date();
    return appointmentDate.getMonth() === now.getMonth() && 
           appointmentDate.getFullYear() === now.getFullYear();
  }).length;
  
  const averageRating = 4.7 + Math.random() * 0.3; // Mock rating
  const responseTime = Math.floor(Math.random() * 30) + 15; // Mock response time in minutes
  const experienceYears = user.experience ? parseInt(user.experience.match(/\d+/)?.[0] || '0') : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSave = () => {
    updateUser({
      name: formData.name,
      email: formData.email,
      category: formData.category,
      bio: formData.bio,
      experience: formData.experience,
      degrees: formData.degrees,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      category: user?.category || '',
      bio: user?.bio || '',
      experience: user?.experience || '',
      degrees: user?.degrees || '',
    });
    setIsEditing(false);
  };

  const handleAvailabilityChange = (shift: 'morning' | 'evening', value: string) => {
    setAvailabilityTiming(prev => ({
      ...prev,
      [shift]: value
    }));
  };

  const handleSaveAvailability = () => {
    try {
      // Save with range format for display
      const availabilityWithRanges = {
        morning: `${availabilityTiming.morning} – ${shiftEndTimes.morning}`,
        evening: `${availabilityTiming.evening} – ${shiftEndTimes.evening}`,
      };
      localStorage.setItem('doctorAvailabilityTiming', JSON.stringify(availabilityWithRanges));
      setSavedAvailability(availabilityWithRanges);
      // Show a brief success feedback
      alert('Availability timing saved successfully!');
    } catch (error) {
      console.error('Error saving availability timing:', error);
      alert('Failed to save availability timing. Please try again.');
    }
  };

  const getCategoryName = (slug: string) => {
    const category = categories.find(cat => cat.slug === slug);
    return category?.name || slug;
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'indigo';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    };

    return (
      <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6 hover:shadow-medium transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <TrendingUp className="h-4 w-4 text-success-500" />
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-900 mb-1">{value}</p>
          <p className="text-sm font-medium text-neutral-600 mb-1">{title}</p>
          {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="section-padding">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">My Profile</h1>
          <p className="text-neutral-600">Manage your professional information and credentials</p>
        </div>

        {/* KPI Dashboard */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">Performance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={Users}
              title="Total Patients"
              value={totalPatients}
              subtitle="Unique patients served"
              color="blue"
            />
            <StatCard
              icon={Calendar}
              title="Completed Sessions"
              value={completedAppointments.length}
              subtitle="All-time appointments"
              color="green"
            />
            <StatCard
              icon={Star}
              title="Patient Rating"
              value={averageRating.toFixed(1)}
              subtitle="Based on patient feedback"
              color="orange"
            />
            <StatCard
              icon={Clock}
              title="Avg Response Time"
              value={`${responseTime}m`}
              subtitle="Message response time"
              color="purple"
            />
          </div>
        </div>

        {/* Monthly Performance */}
        <div className="mb-8">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
              This Month's Activity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-primary-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-900 mb-1">{thisMonthAppointments}</div>
                <div className="text-sm text-primary-700">Appointments</div>
              </div>
              <div className="text-center p-4 bg-success-50 rounded-lg">
                <div className="text-2xl font-bold text-success-900 mb-1">{Math.floor(thisMonthAppointments * 0.85)}</div>
                <div className="text-sm text-success-700">Completed</div>
              </div>
              <div className="text-center p-4 bg-secondary-50 rounded-lg">
                <div className="text-2xl font-bold text-secondary-900 mb-1">{experienceYears}+</div>
                <div className="text-sm text-secondary-700">Years Experience</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">Dr. {user.name}</h2>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-neutral-500 capitalize">{user.role}</p>
                  {!user.isApproved && (
                    <span className="status-pending">
                      Pending Approval
                    </span>
                  )}
                  {user.isApproved && (
                    <span className="status-success">
                      Approved
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-primary"
            >
              <Edit3 className="h-4 w-4" />
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="form-input"
                      />
                    ) : (
                      <p className="text-neutral-900">Dr. {user.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="form-input"
                      />
                    ) : (
                      <p className="text-neutral-900">{user.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                  <Stethoscope className="h-5 w-5 mr-2 text-primary-500" />
                  Professional Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Medical Specialty</label>
                    {isEditing ? (
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="form-input"
                      >
                        <option value="">Select your specialty</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.slug}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-neutral-900">{getCategoryName(user.category || '')}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">
                      <GraduationCap className="h-4 w-4 inline mr-1" />
                      Degrees & Certifications
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="degrees"
                        value={formData.degrees}
                        onChange={handleChange}
                        placeholder="e.g., MD, MBBS, MS, Fellowship in Cardiology"
                        className="form-input"
                      />
                    ) : (
                      <p className="text-neutral-900">{user.degrees || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Years of Experience</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="experience"
                        value={formData.experience}
                        onChange={handleChange}
                        placeholder="e.g., 10 years"
                        className="form-input"
                      />
                    ) : (
                      <p className="text-neutral-900">{user.experience || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">
                      <FileText className="h-4 w-4 inline mr-1" />
                      Professional Bio
                    </label>
                    {isEditing ? (
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Tell patients about your background, expertise, and approach to healthcare..."
                        className="form-input"
                      />
                    ) : (
                      <p className="text-neutral-900">{user.bio || 'No bio provided'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Availability Timing Section */}
              <div className="bg-white rounded-xl p-6 shadow-soft border border-primary-200">
                <h3 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-primary-600" />
                  Set Your Availability
                </h3>

                <div className="space-y-6">
                  {/* Helper function to create time selector */}
                  {(['morning', 'evening'] as const).map((shift) => {
                    const time = parseTime(availabilityTiming[shift]);
                    const hourRef = shift === 'morning' ? morningHourRef : eveningHourRef;
                    const minuteRef = shift === 'morning' ? morningMinuteRef : eveningMinuteRef;
                    const scrollItemHeight = 50;
                    const defaultPeriod = shift === 'morning' ? 'AM' : 'PM';

                    // Scroll hour up
                    const scrollHourUp = () => {
                      if (hourRef.current && time.hour > 1) {
                        const newHour = time.hour - 1;
                        const newScroll = (newHour - 1) * scrollItemHeight;
                        isProgrammaticScroll.current[shift].hour = true;
                        hourRef.current.scrollTo({ top: newScroll, behavior: 'smooth' });
                        const newTime = formatTime(newHour, time.minute, time.period);
                        handleAvailabilityChange(shift, newTime);
                        setTimeout(() => {
                          isProgrammaticScroll.current[shift].hour = false;
                        }, 400);
                      }
                    };

                    // Scroll hour down
                    const scrollHourDown = () => {
                      if (hourRef.current && time.hour < 12) {
                        const newHour = time.hour + 1;
                        const newScroll = (newHour - 1) * scrollItemHeight;
                        isProgrammaticScroll.current[shift].hour = true;
                        hourRef.current.scrollTo({ top: newScroll, behavior: 'smooth' });
                        const newTime = formatTime(newHour, time.minute, time.period);
                        handleAvailabilityChange(shift, newTime);
                        setTimeout(() => {
                          isProgrammaticScroll.current[shift].hour = false;
                        }, 400);
                      }
                    };

                    // Scroll minute up
                    const scrollMinuteUp = () => {
                      if (minuteRef.current && time.minute > 0) {
                        const newMinute = time.minute - 1;
                        const newScroll = newMinute * scrollItemHeight;
                        isProgrammaticScroll.current[shift].minute = true;
                        minuteRef.current.scrollTo({ top: newScroll, behavior: 'smooth' });
                        const newTime = formatTime(time.hour, newMinute, time.period);
                        handleAvailabilityChange(shift, newTime);
                        setTimeout(() => {
                          isProgrammaticScroll.current[shift].minute = false;
                        }, 400);
                      }
                    };

                    // Scroll minute down
                    const scrollMinuteDown = () => {
                      if (minuteRef.current && time.minute < 59) {
                        const newMinute = time.minute + 1;
                        const newScroll = newMinute * scrollItemHeight;
                        isProgrammaticScroll.current[shift].minute = true;
                        minuteRef.current.scrollTo({ top: newScroll, behavior: 'smooth' });
                        const newTime = formatTime(time.hour, newMinute, time.period);
                        handleAvailabilityChange(shift, newTime);
                        setTimeout(() => {
                          isProgrammaticScroll.current[shift].minute = false;
                        }, 400);
                      }
                    };

                    // Set AM
                    const setAM = () => {
                      if (time.period !== 'AM') {
                        const newTime = formatTime(time.hour, time.minute, 'AM');
                        handleAvailabilityChange(shift, newTime);
                      }
                    };

                    // Set PM
                    const setPM = () => {
                      if (time.period !== 'PM') {
                        const newTime = formatTime(time.hour, time.minute, 'PM');
                        handleAvailabilityChange(shift, newTime);
                      }
                    };

                    return (
                      <div key={shift}>
                        <label className="form-label block mb-3 text-primary-700 font-medium capitalize">
                          {shift} Shift
                        </label>
                        <div className="flex gap-3 items-center">
                          {/* Hour selector */}
                          <div className="flex-1 relative">
                            <button
                              type="button"
                              onClick={scrollHourUp}
                              onMouseDown={(e) => e.preventDefault()}
                              disabled={time.hour === 1}
                              className={`absolute top-0 left-1/2 transform -translate-x-1/2 z-20 w-full h-8 rounded-t-xl flex items-start justify-center pt-1 transition-all duration-200 shadow-sm ${
                                time.hour === 1
                                  ? 'bg-white border border-primary-200 cursor-not-allowed opacity-50'
                                  : 'bg-white border border-primary-200 hover:bg-primary-50 hover:border-primary-300 hover:shadow-md active:bg-primary-100'
                              }`}
                            >
                              <ChevronUp className="h-4 w-4 text-primary-600" />
                            </button>
                            <div
                              ref={hourRef}
                              onWheel={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onTouchMove={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onTouchStart={(e) => { e.preventDefault(); }}
                              onTouchEnd={(e) => { e.preventDefault(); }}
                              className="hour-selector-scroll relative bg-white rounded-xl shadow-lg border-2 border-primary-200 text-center select-none"
                              style={{
                                height: "120px",
                                scrollSnapType: "y mandatory",
                                scrollbarWidth: "none",
                                msOverflowStyle: "none",
                                touchAction: "none",
                                overflowY: "scroll",
                              }}
                            >
                              <div style={{ height: "35px" }}></div>
                              {[...Array(12)].map((_, i) => {
                                const hour = i + 1;
                                const isSelected = hour === time.hour;
                                return (
                                  <div
                                    key={i}
                                    className={`transition-all duration-300 ${
                                      isSelected
                                        ? "font-bold text-3xl text-primary-700"
                                        : "font-medium text-lg text-gray-400"
                                    }`}
                                    style={{
                                      height: "50px",
                                      lineHeight: "50px",
                                      scrollSnapAlign: "center",
                                      ...(isSelected && {
                                        textShadow: "0 0 15px rgba(37, 99, 235, 0.4), 0 0 8px rgba(37, 99, 235, 0.3)",
                                        backgroundColor: "rgba(239, 246, 255, 0.8)",
                                        transform: "scale(1.15)",
                                        borderLeft: "3px solid rgba(37, 99, 235, 0.6)",
                                        borderRight: "3px solid rgba(37, 99, 235, 0.6)",
                                      }),
                                    }}
                                  >
                                    {hour}
                                  </div>
                                );
                              })}
                              <div style={{ height: "35px" }}></div>
                            </div>
                            <button
                              type="button"
                              onClick={scrollHourDown}
                              onMouseDown={(e) => e.preventDefault()}
                              disabled={time.hour === 12}
                              className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 z-20 w-full h-8 rounded-b-xl flex items-end justify-center pb-1 transition-all duration-200 shadow-sm ${
                                time.hour === 12
                                  ? 'bg-white border border-primary-200 cursor-not-allowed opacity-50'
                                  : 'bg-white border border-primary-200 hover:bg-primary-50 hover:border-primary-300 hover:shadow-md active:bg-primary-100'
                              }`}
                            >
                              <ChevronDown className="h-4 w-4 text-primary-600" />
                            </button>
                          </div>

                          {/* Minute selector */}
                          <div className="flex-1 relative">
                            <button
                              type="button"
                              onClick={scrollMinuteUp}
                              onMouseDown={(e) => e.preventDefault()}
                              disabled={time.minute === 0}
                              className={`absolute top-0 left-1/2 transform -translate-x-1/2 z-20 w-full h-8 rounded-t-xl flex items-start justify-center pt-1 transition-all duration-200 shadow-sm ${
                                time.minute === 0
                                  ? 'bg-white border border-primary-200 cursor-not-allowed opacity-50'
                                  : 'bg-white border border-primary-200 hover:bg-primary-50 hover:border-primary-300 hover:shadow-md active:bg-primary-100'
                              }`}
                            >
                              <ChevronUp className="h-4 w-4 text-primary-600" />
                            </button>
                            <div
                              ref={minuteRef}
                              onWheel={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onTouchMove={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onTouchStart={(e) => { e.preventDefault(); }}
                              onTouchEnd={(e) => { e.preventDefault(); }}
                              className="minute-selector-scroll relative bg-white rounded-xl shadow-lg border-2 border-primary-200 text-center select-none"
                              style={{
                                height: "120px",
                                scrollSnapType: "y mandatory",
                                scrollbarWidth: "none",
                                msOverflowStyle: "none",
                                touchAction: "none",
                                overflowY: "scroll",
                              }}
                            >
                              <div style={{ height: "35px" }}></div>
                              {[...Array(60)].map((_, i) => {
                                const minute = i;
                                const isSelected = minute === time.minute;
                                return (
                                  <div
                                    key={i}
                                    className={`transition-all duration-300 ${
                                      isSelected
                                        ? "font-bold text-3xl text-primary-700"
                                        : "font-medium text-lg text-gray-400"
                                    }`}
                                    style={{
                                      height: "50px",
                                      lineHeight: "50px",
                                      scrollSnapAlign: "center",
                                      ...(isSelected && {
                                        textShadow: "0 0 15px rgba(37, 99, 235, 0.4), 0 0 8px rgba(37, 99, 235, 0.3)",
                                        backgroundColor: "rgba(239, 246, 255, 0.8)",
                                        transform: "scale(1.15)",
                                        borderLeft: "3px solid rgba(37, 99, 235, 0.6)",
                                        borderRight: "3px solid rgba(37, 99, 235, 0.6)",
                                      }),
                                    }}
                                  >
                                    {minute.toString().padStart(2, "0")}
                                  </div>
                                );
                              })}
                              <div style={{ height: "35px" }}></div>
                            </div>
                            <button
                              type="button"
                              onClick={scrollMinuteDown}
                              onMouseDown={(e) => e.preventDefault()}
                              disabled={time.minute === 59}
                              className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 z-20 w-full h-8 rounded-b-xl flex items-end justify-center pb-1 transition-all duration-200 shadow-sm ${
                                time.minute === 59
                                  ? 'bg-white border border-primary-200 cursor-not-allowed opacity-50'
                                  : 'bg-white border border-primary-200 hover:bg-primary-50 hover:border-primary-300 hover:shadow-md active:bg-primary-100'
                              }`}
                            >
                              <ChevronDown className="h-4 w-4 text-primary-600" />
                            </button>
                          </div>

                          {/* AM/PM Selector - Button-based, no scrolling */}
                          <div className="w-24 sm:w-20 relative">
                            <button
                              type="button"
                              onClick={setAM}
                              disabled={time.period === 'AM'}
                              className={`absolute top-0 left-1/2 transform -translate-x-1/2 z-20 w-full h-8 rounded-t-xl flex items-start justify-center pt-1 transition-all duration-200 shadow-sm ${
                                time.period === 'AM'
                                  ? 'bg-white border border-primary-300 cursor-default'
                                  : 'bg-white border border-primary-200 hover:bg-primary-50 hover:border-primary-300 hover:shadow-md active:bg-primary-100'
                              }`}
                            >
                              <ChevronUp className={`h-4 w-4 ${time.period === 'AM' ? 'text-primary-800' : 'text-primary-600'}`} />
                            </button>
                            <div
                              className="relative bg-white rounded-xl shadow-lg border-2 border-primary-200 flex items-center justify-center overflow-hidden"
                              style={{
                                height: "120px",
                              }}
                              onWheel={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onTouchMove={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            >
                              <div
                                className={`font-bold text-2xl sm:text-3xl transition-all duration-300 ${
                                  time.period === 'AM'
                                    ? "text-primary-700"
                                    : "text-primary-700"
                                }`}
                                style={{
                                  textShadow: "0 0 20px rgba(37, 99, 235, 0.4), 0 0 10px rgba(37, 99, 235, 0.3)",
                                  backgroundColor: "rgba(239, 246, 255, 0.8)",
                                  padding: "14px 20px",
                                  borderRadius: "12px",
                                  border: "2px solid rgba(37, 99, 235, 0.5)",
                                  transform: "scale(1.1)",
                                }}
                              >
                                {time.period}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={setPM}
                              disabled={time.period === 'PM'}
                              className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 z-20 w-full h-8 rounded-b-xl flex items-end justify-center pb-1 transition-all duration-200 shadow-sm ${
                                time.period === 'PM'
                                  ? 'bg-white border border-primary-300 cursor-default'
                                  : 'bg-white border border-primary-200 hover:bg-primary-50 hover:border-primary-300 hover:shadow-md active:bg-primary-100'
                              }`}
                            >
                              <ChevronDown className={`h-4 w-4 ${time.period === 'PM' ? 'text-primary-800' : 'text-primary-600'}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Save Button */}
                  <div>
                    <button
                      onClick={handleSaveAvailability}
                      className="btn-primary w-full sm:w-auto mt-2 bg-white border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Availability</span>
                    </button>
                  </div>
                </div>

                {/* Display availability with ranges */}
                <div className="mt-6 pt-4 border-t border-primary-200">
                  <h4 className="text-sm font-semibold text-primary-700 mb-3">
                    {savedAvailability ? 'Your Saved Availability' : 'Current Selection'}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-primary-600 bg-white border border-primary-200 rounded-lg p-2">
                      <span className="text-lg">🕒</span>
                      <span className="text-sm">
                        <strong>Morning:</strong> {savedAvailability ? savedAvailability.morning : `${availabilityTiming.morning} – ${shiftEndTimes.morning}`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-primary-600 bg-white border border-primary-200 rounded-lg p-2">
                      <span className="text-lg">🌙</span>
                      <span className="text-sm">
                        <strong>Evening:</strong> {savedAvailability ? savedAvailability.evening : `${availabilityTiming.evening} – ${shiftEndTimes.evening}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>




              {/* Approval Status */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Account Status</h3>
                {user.isApproved ? (
                  <div className="flex items-center space-x-2 text-success-700">
                    <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                    <span className="text-sm">Your account is approved and visible to patients</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-warning-700">
                    <div className="w-2 h-2 bg-warning-500 rounded-full"></div>
                    <span className="text-sm">Your account is pending admin approval</span>
                  </div>
                )}
              </div>
            </div>

            {/* Save/Cancel Buttons */}
            {isEditing && (
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={handleCancel}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;