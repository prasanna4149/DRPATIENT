import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ChatProvider } from './contexts/ChatContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Patient Pages
import PatientBrowse from './pages/patient/Browse';
import PatientCategory from './pages/patient/Category';
import PatientAppointments from './pages/patient/Appointments';
import PatientProfile from './pages/patient/Profile';
import PatientMessages from './pages/patient/Messages';

// Doctor Pages
import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorProfile from './pages/doctor/Profile';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AgentDashboard from './pages/agent/Dashboard';

// Guards
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={user ? <Navigate to={`/${user.role}`} /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to={`/${user.role}`} /> : <Signup />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          {/* Patient Routes */}
          <Route element={<RoleGuard allowedRoles={['patient']} />}>
            <Route path="/patient" element={<Navigate to="/patient/browse" />} />
            <Route path="/patient/browse" element={<PatientBrowse />} />
            <Route path="/patient/category/:slug" element={<PatientCategory />} />
            <Route path="/patient/messages" element={<PatientMessages />} />
            <Route path="/patient/appointments" element={<PatientAppointments />} />
            <Route path="/patient/profile" element={<PatientProfile />} />
          </Route>

          {/* Doctor Routes */}
          <Route element={<RoleGuard allowedRoles={['doctor']} />}>
            <Route path="/doctor" element={<Navigate to="/doctor/dashboard" />} />
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/profile" element={<DoctorProfile />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<RoleGuard allowedRoles={['admin']} />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Agent Routes */}
          <Route element={<RoleGuard allowedRoles={['agent']} />}>
            <Route path="/agent" element={<Navigate to="/agent/dashboard" />} />
            <Route path="/agent/dashboard" element={<AgentDashboard />} />
          </Route>
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ChatProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <AppRoutes />
            </div>
          </Router>
        </ChatProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;