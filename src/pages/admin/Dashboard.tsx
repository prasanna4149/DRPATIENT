import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  MessageSquare, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  BarChart3
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';

const Dashboard = () => {
  const { getAppStats, getDoctors, approveDoctor, activityLogs } = useData();
  const [activeTab, setActiveTab] = useState<'overview' | 'doctors' | 'activity'>('overview');

  const stats = getAppStats();
  const doctors = getDoctors();

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      red: 'bg-red-100 text-red-600',
      purple: 'bg-purple-100 text-purple-600',
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
    );
  };

  const formatActivityAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/^./, str => str.toUpperCase());
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('APPOINTMENT')) return Calendar;
    if (action.includes('DOCTOR')) return Users;
    if (action.includes('MESSAGE')) return MessageSquare;
    return Activity;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Monitor platform activity and manage healthcare providers</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('doctors')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'doctors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Doctor Management ({stats.pendingDoctors} pending)
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Activity Feed
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={Users}
              title="Total Doctors"
              value={stats.totalDoctors}
              subtitle={`${stats.approvedDoctors} approved`}
              color="blue"
            />
            <StatCard
              icon={UserCheck}
              title="Total Patients"
              value={stats.totalPatients}
              color="green"
            />
            <StatCard
              icon={Calendar}
              title="Appointments Today"
              value={stats.todayAppointments}
              subtitle={`${stats.weekAppointments} this week`}
              color="purple"
            />
            <StatCard
              icon={MessageSquare}
              title="Messages Today"
              value={stats.todayMessages}
              color="yellow"
            />
          </div>

          {/* Appointment Status Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments by Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-900">{stats.appointmentsByStatus.pending}</div>
                <div className="text-sm text-yellow-700">Pending</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-900">{stats.appointmentsByStatus.accepted}</div>
                <div className="text-sm text-green-700">Accepted</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">{stats.appointmentsByStatus.completed}</div>
                <div className="text-sm text-blue-700">Completed</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-900">{stats.appointmentsByStatus.cancelled}</div>
                <div className="text-sm text-red-700">Cancelled</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-900">{stats.appointmentsByStatus.no_show}</div>
                <div className="text-sm text-orange-700">No Show</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('doctors')}
                className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Review Doctors</h4>
                    <p className="text-sm text-gray-600">{stats.pendingDoctors} pending approval</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Activity Feed</h4>
                    <p className="text-sm text-gray-600">Monitor platform activity</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
              </button>
              <div className="bg-white p-4 rounded-lg shadow-sm text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">System Health</h4>
                    <p className="text-sm text-green-600">All systems operational</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'doctors' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Doctor Approvals</h3>
              <p className="text-sm text-gray-600 mt-1">Review and approve doctor registrations</p>
            </div>
            
            {doctors.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No doctors registered</h4>
                <p className="text-gray-500">Doctor registrations will appear here for approval</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Doctor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Specialty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Experience
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {doctors.map((doctor: any) => (
                      <tr key={doctor.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{doctor.name}</div>
                            <div className="text-sm text-gray-500">{doctor.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{doctor.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{doctor.experience || 'Not specified'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            doctor.isApproved 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {doctor.isApproved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => approveDoctor(doctor.id)}
                            className={`${
                              doctor.isApproved 
                                ? 'text-red-600 hover:text-red-900' 
                                : 'text-green-600 hover:text-green-900'
                            } transition-colors duration-200`}
                          >
                            {doctor.isApproved ? 'Revoke' : 'Approve'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-600 mt-1">Platform activity and user actions</p>
            </div>
            
            {activityLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h4>
                <p className="text-gray-500">Platform activity will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {activityLogs.slice(0, 50).map((log) => {
                  const Icon = getActivityIcon(log.action);
                  return (
                    <div key={log.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Icon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">{log.userName}</span> 
                            <span className="text-gray-600"> - {formatActivityAction(log.action)}</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">{log.details}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {log.timestamp.toLocaleString()}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          log.userRole === 'admin' ? 'bg-purple-100 text-purple-800' :
                          log.userRole === 'doctor' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {log.userRole}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;