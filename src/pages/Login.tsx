import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authSucceeded, setAuthSucceeded] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | 'admin' | 'agent' | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        localStorage.setItem('openChatDockAfterLogin', '1');
        setFadeOut(true);
        setTimeout(() => setAuthSucceeded(true), 300);
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'patient' | 'doctor' | 'admin' | 'agent') => {
    setSelectedRole(role);
    setError('');
    setLoading(true);

    const demoCredentials: Record<'patient' | 'doctor' | 'admin', { email: string; password: string }> = {
      patient: { email: 'patient@demo.com', password: 'demo123' },
      doctor: { email: 'doctor@demo.com', password: 'demo123' },
      admin: { email: 'admin@meditour.com', password: 'admin123' },
    };

    let credentials: { email: string; password: string } | null = null;

    if (role === 'agent') {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const agentUser = users.find((u: any) => u.role === 'agent');
      if (!agentUser) {
        setError('No agent account found. Please create an agent account first.');
        setLoading(false);
        return;
      }
      credentials = { email: agentUser.email, password: 'demo123' };
    } else {
      credentials = demoCredentials[role];
    }

    // credentials will always be set at this point, but add a guard for safety
    if (!credentials) {
      setError('Demo credentials are unavailable. Please try again later.');
      setLoading(false);
      return;
    }

    setEmail(credentials.email);
    setPassword(credentials.password);

    try {
      const success = await login(credentials.email, credentials.password);
      if (success) {
        localStorage.setItem('openChatDockAfterLogin', '1');
        setFadeOut(true);
        setTimeout(() => setAuthSucceeded(true), 300);
      } else {
        setError(`Demo ${role} account not found. Please create an account first.`);
      }
    } catch (err) {
      setError('An error occurred during demo login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-neutral-50 to-secondary-50 flex items-center justify-center py-12 section-padding animate-fade-in">
      {!authSucceeded && (
      <div
        id="auth-section"
        className={`max-w-md w-full space-y-8 transition-opacity duration-300 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        {...(fadeOut ? { 'aria-hidden': true } : {})}
      >
        <div className="text-center">
          <Link to="/" className="flex items-center justify-center space-x-2 mb-6">
            <div className="relative">
              <Heart className="h-10 w-10 text-primary-600 transition-transform duration-200 hover:scale-110" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-success-500 rounded-full animate-pulse-soft"></div>
            </div>
            <span className="text-[36px] font-bold text-neutral-900 tracking-tight">MediTour</span>
          </Link>
          <h2 className="text-3xl font-bold text-neutral-900 mb-2 animate-slide-up">
            {selectedRole === 'agent' ? 'Agent Login' : selectedRole ? `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Login` : 'Welcome back'}
          </h2>
          <p className="text-neutral-600 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {selectedRole ? 'Sign in to your account to continue' : 'Sign in to your account to continue'}
          </p>
        </div>

        <div className="card p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {error && (
            <div className="mb-4 bg-error-50 border border-error-200 text-error-600 px-4 py-3 rounded-lg flex items-center animate-scale-in">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input pl-10"
                  tabIndex={fadeOut ? -1 : 0}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input pl-10"
                  tabIndex={fadeOut ? -1 : 0}
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              tabIndex={fadeOut ? -1 : 0}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">Or try demo accounts</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleDemoLogin('patient')}
                disabled={loading}
                className="btn-secondary text-xs py-2 disabled:opacity-50"
              >
                Patient Demo
              </button>
              <button
                onClick={() => handleDemoLogin('doctor')}
                disabled={loading}
                className="btn-secondary text-xs py-2 disabled:opacity-50"
              >
                Doctor Demo
              </button>
              <button
                onClick={() => handleDemoLogin('agent')}
                disabled={loading}
                className="btn-secondary text-xs py-2 disabled:opacity-50"
              >
                Agent Demo
              </button>
              <button
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="btn-secondary text-xs py-2 disabled:opacity-50"
              >
                Admin Demo
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
      )}

      {authSucceeded && (
        <div className="text-neutral-600 text-sm opacity-70">Loading your workspace...</div>
      )}
    </div>
  );
};

export default Login;