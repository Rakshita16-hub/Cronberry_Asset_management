import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Package, CheckCircle, Clock, Users } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div
    data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
    className="bg-white rounded-xl border border-border p-6 hover-lift"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-4xl font-bold mt-2 tracking-tight">{value}</p>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your asset management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Assets"
          value={stats.total_assets}
          icon={Package}
          color="bg-primary"
        />
        <StatCard
          title="Assigned Assets"
          value={stats.assigned_assets}
          icon={CheckCircle}
          color="bg-accent"
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
    </div>
  );
}