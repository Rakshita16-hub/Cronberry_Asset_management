import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Package, CheckCircle, Clock, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div
    data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
    className="bg-white rounded-xl border border-slate-200 p-6 hover-lift"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="text-4xl font-bold mt-2 tracking-tight text-[#0B1F3A]">{value}</p>
      </div>
      <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-7 w-7 text-white" />
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total_assets: 0,
    assigned_assets: 0,
    available_assets: 0,
    total_employees: 0,
  });
  const [pendingReturns, setPendingReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, pendingRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/pending-returns'),
        ]);
        setStats(statsRes.data);
        setPendingReturns(pendingRes.data);
      } catch (error) {
        toast.error('Failed to fetch dashboard data');
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
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-[#0B1F3A]">Dashboard</h1>
        <p className="text-slate-600 mt-2">Overview of your asset management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Assets"
          value={stats.total_assets}
          icon={Package}
          color="bg-[#0B1F3A]"
        />
        <StatCard
          title="Assigned Assets"
          value={stats.assigned_assets}
          icon={CheckCircle}
          color="bg-[#D81B60]"
        />
        <StatCard
          title="Available Assets"
          value={stats.available_assets}
          icon={Clock}
          color="bg-green-500"
        />
        <StatCard
          title="Total Employees"
          value={stats.total_employees}
          icon={Users}
          color="bg-blue-500"
        />
      </div>

      {pendingReturns.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              <div>
                <h2 className="text-2xl font-bold text-[#0B1F3A]">Pending Asset Returns</h2>
                <p className="text-slate-600 mt-1">
                  Exit employees with unreturned assets ({pendingReturns.length})
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {pendingReturns.map((item) => (
              <div
                key={item.employee_id}
                data-testid={`pending-return-${item.employee_id}`}
                className="p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#0B1F3A]">{item.employee_name}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {item.employee_id} • {item.email}
                    </p>
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        Unreturned Assets ({item.assets.length}):
                      </p>
                      <div className="space-y-2">
                        {item.assets.map((asset) => (
                          <div
                            key={asset.assignment_id}
                            className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm"
                          >
                            <p className="font-medium text-orange-900">{asset.asset_name}</p>
                            <p className="text-orange-700 text-xs mt-1">
                              Asset ID: {asset.asset_id} • Assigned: {asset.assigned_date}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                      Action Required
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}