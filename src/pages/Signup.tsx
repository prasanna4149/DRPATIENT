import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Mail, Lock, User, AlertCircle, Calendar, Users, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const Signup = () => {
  const [role, setRole] = useState<'patient' | 'doctor' | 'agent'>('patient');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Patient fields
    age: '',
    sex: '',
    // Doctor fields
    category: '',
    bio: '',
    experience: '',
    // Agent fields
    location: '',
    contactNumber: '',
    agentExperience: '',
    preferredRegion: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authSucceeded, setAuthSucceeded] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const { signup } = useAuth();
  const { categories } = useData();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (role === 'doctor' && !formData.category) {
      setError('Please select a medical specialty');
      return;
    }

    setLoading(true);

    try {
      const userData: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role,
      };

      if (role === 'patient') {
        if (formData.age) userData.age = parseInt(formData.age);
        if (formData.sex) userData.sex = formData.sex;
      } else if (role === 'doctor') {
        userData.category = formData.category;
        userData.bio = formData.bio;
        userData.experience = formData.experience;
        userData.isApproved = false;
      } else if (role === 'agent') {
        userData.location = formData.location;
        userData.contactNumber = formData.contactNumber;
        userData.agentExperience = formData.agentExperience;
        userData.preferredRegion = formData.preferredRegion;
      }

      const success = await signup(userData);
      if (success) {
        localStorage.setItem('openChatDockAfterLogin', '1');
        setFadeOut(true);
        setTimeout(() => setAuthSucceeded(true), 300);
      } else {
        setError('An account with this email already exists');
      }
    } catch (err) {
      setError('An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {!authSucceeded && (
      <div
        id="auth-section"
        className={`max-w-md w-full space-y-8 transition-opacity duration-300 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        {...(fadeOut ? { 'aria-hidden': true } : {})}
      >
        <div className="text-center">
          <Link to="/" className="flex items-center justify-center space-x-2 mb-6">
            <Heart className="h-10 w-10 text-blue-600" />
            <span className="text-[36px] font-bold text-gray-900">MediTour</span>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h2>
          <p className="text-gray-600">Join our healthcare community today</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Role Selection */}
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`flex items-center justify-center px-4 py-3 rounded-md font-medium text-sm transition-colors duration-200 ${
                  role === 'patient'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="h-4 w-4 mr-2" />
                Patient
              </button>
              <button
                type="button"
                onClick={() => setRole('doctor')}
                className={`flex items-center justify-center px-4 py-3 rounded-md font-medium text-sm transition-colors duration-200 ${
                  role === 'doctor'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <User className="h-4 w-4 mr-2" />
                Doctor
              </button>
              <button
                type="button"
                onClick={() => setRole('agent')}
                className={`flex items-center justify-center px-4 py-3 rounded-md font-medium text-sm transition-colors duration-200 ${
                  role === 'agent'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Agent
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Fields */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  tabIndex={fadeOut ? -1 : 0}
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  tabIndex={fadeOut ? -1 : 0}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  tabIndex={fadeOut ? -1 : 0}
                  placeholder="Create a password"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  tabIndex={fadeOut ? -1 : 0}
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            {/* Patient Specific Fields */}
            {role === 'patient' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                      Age (Optional)
                    </label>
                    <input
                      id="age"
                      name="age"
                      type="number"
                      value={formData.age}
                      onChange={handleChange}
                      min="1"
                      max="120"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    tabIndex={fadeOut ? -1 : 0}
                      placeholder="Age"
                    />
                  </div>
                  <div>
                    <label htmlFor="sex" className="block text-sm font-medium text-gray-700 mb-2">
                      Sex (Optional)
                    </label>
                    <select
                      id="sex"
                      name="sex"
                      value={formData.sex}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    tabIndex={fadeOut ? -1 : 0}
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Doctor Specific Fields */}
            {role === 'doctor' && (
              <>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Specialty <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    tabIndex={fadeOut ? -1 : 0}
                  >
                    <option value="">Select your specialty</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience
                  </label>
                  <input
                    id="experience"
                    name="experience"
                    type="text"
                    value={formData.experience}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    tabIndex={fadeOut ? -1 : 0}
                    placeholder="e.g., 5 years"
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                    Brief Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    tabIndex={fadeOut ? -1 : 0}
                    placeholder="Tell patients about your background and expertise..."
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Doctor accounts require admin approval before you can accept appointments.
                    You'll be notified once your account is approved.
                  </p>
                </div>
              </>
            )}

            {/* Agent Specific Fields */}
            {role === 'agent' && (
              <>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    tabIndex={fadeOut ? -1 : 0}
                    placeholder="Enter your location"
                  />
                </div>

                <div>
                  <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number
                  </label>
                  <input
                    id="contactNumber"
                    name="contactNumber"
                    type="tel"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    tabIndex={fadeOut ? -1 : 0}
                    placeholder="Enter your contact number"
                  />
                </div>

                <div>
                  <label htmlFor="agentExperience" className="block text-sm font-medium text-gray-700 mb-2">
                    Experience (in years)
                  </label>
                  <input
                    id="agentExperience"
                    name="agentExperience"
                    type="number"
                    value={formData.agentExperience}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    tabIndex={fadeOut ? -1 : 0}
                    placeholder="Enter years of experience"
                  />
                </div>

                <div>
                  <label htmlFor="preferredRegion" className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Region / Area
                  </label>
                  <input
                    id="preferredRegion"
                    name="preferredRegion"
                    type="text"
                    value={formData.preferredRegion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    tabIndex={fadeOut ? -1 : 0}
                    placeholder="Enter your preferred region or area"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              tabIndex={fadeOut ? -1 : 0}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
      )}

      {authSucceeded && (
        <div className="text-neutral-600 text-sm opacity-70">Setting up your workspace...</div>
      )}
    </div>
  );
};

export default Signup;