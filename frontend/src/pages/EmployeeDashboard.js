import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { User, Package, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, assignmentsRes] = await Promise.all([
          api.get('/employees/me'),
          api.get('/assignments/my'),
        ]);
        setProfile(profileRes.data);
        setAssignments(assignmentsRes.data);
      } catch (error) {
        toast.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B1F3A]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-[#0B1F3A]">My Dashboard</h1>
        <p className="text-slate-600 mt-2">View your profile and assigned assets</p>
      </div>

      {profile && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 bg-[#0B1F3A] rounded-xl flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#0B1F3A]">{profile.full_name}</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Employee ID</p>
                  <p className="font-medium text-[#0B1F3A]">{profile.employee_id}</p>
                </div>
                <div>
                  <p className="text-slate-600">Email</p>
                  <p className="font-medium text-[#0B1F3A]">{profile.email}</p>
                </div>
                <div>
                  <p className="text-slate-600">Department</p>
                  <p className="font-medium text-[#0B1F3A]">{profile.department}</p>
                </div>
                <div>
                  <p className="text-slate-600">Designation</p>
                  <p className="font-medium text-[#0B1F3A]">{profile.designation}</p>
                </div>
                <div>
                  <p className="text-slate-600">Date of Joining</p>
                  <p className="font-medium text-[#0B1F3A]">{profile.date_of_joining}</p>
                </div>
                <div>
                  <p className="text-slate-600">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      profile.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {profile.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-[#D81B60]" />
            <h2 className="text-2xl font-bold text-[#0B1F3A]">My Assigned Assets</h2>
          </div>
          <p className="text-slate-600 mt-1">Assets currently assigned to you</p>
        </div>

        <div className="p-6">
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No assets assigned to you at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.assignment_id}
                  data-testid={`my-assignment-${assignment.assignment_id}`}
                  className="border border-slate-200 rounded-lg p-4 hover:border-[#D81B60] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#0B1F3A]">
                        {assignment.asset_name}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Asset ID: {assignment.asset_id}
                      </p>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-slate-600">Assigned Date</p>
                            <p className="font-medium text-[#0B1F3A]">{assignment.assigned_date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-slate-600">Return Date</p>
                            <p className="font-medium text-[#0B1F3A]">
                              {assignment.return_date || 'Not returned yet'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-600">Status</p>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              assignment.return_date
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {assignment.return_date ? 'Returned' : 'In Use'}
                          </span>
                        </div>
                      </div>
                      {assignment.remarks && (
                        <div className="mt-3">
                          <p className="text-slate-600 text-sm">Remarks:</p>
                          <p className="text-sm text-[#0B1F3A]">{assignment.remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {profile?.status === 'Exit' && assignments.some(a => !a.return_date) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Action Required</h3>
              <p className="text-red-700 mt-2">
                You have unreturned assets. Please return all company assets before your last working day.
                Contact HR for assistance.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}