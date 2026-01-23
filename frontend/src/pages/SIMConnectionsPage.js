import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function SIMConnectionsPage() {
  const [simConnections, setSimConnections] = useState([]);
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSIMConnections = async () => {
    try {
      const response = await api.get('/sim-connections');
      setSimConnections(response.data);
      setFilteredConnections(response.data);
    } catch (error) {
      toast.error('Failed to fetch SIM connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSIMConnections();
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredConnections(simConnections);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = simConnections.filter(
      (conn) =>
        conn.sim_mobile_number?.toLowerCase().includes(query) ||
        conn.employee_name?.toLowerCase().includes(query)
    );
    setFilteredConnections(filtered);
  }, [searchQuery, simConnections]);

  const handleExport = async () => {
    try {
      const response = await api.get('/sim-connections/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sim_connections.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('SIM connections exported successfully');
    } catch (error) {
      toast.error('Failed to export SIM connections');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B1F3A]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#0B1F3A]">SIM Connections</h1>
          <p className="text-slate-600 mt-2">Track official SIM numbers and usage</p>
        </div>
        <Button
          data-testid="export-sim-button"
          variant="outline"
          onClick={handleExport}
          className="border-slate-300"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            data-testid="sim-search-input"
            type="text"
            placeholder="Search by mobile number or employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredConnections.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-600">
            {searchQuery ? 'No SIM connections found matching your search.' : 'No SIM connections recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    SIM Provider
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Mobile Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    SIM Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Ownership
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Assigned Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredConnections.map((conn) => (
                  <tr
                    key={conn.assignment_id}
                    className="hover:bg-slate-50 transition-colors"
                    data-testid={`sim-row-${conn.assignment_id}`}
                  >
                    <td className="px-6 py-4 text-sm">{conn.sim_provider || '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium">{conn.sim_mobile_number || '-'}</td>
                    <td className="px-6 py-4 text-sm">{conn.sim_type || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                          conn.sim_ownership === 'With Employee'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {conn.sim_ownership || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{conn.sim_purpose || '-'}</td>
                    <td className="px-6 py-4 text-sm">{conn.employee_name}</td>
                    <td className="px-6 py-4 text-sm">{conn.asset_name}</td>
                    <td className="px-6 py-4 text-sm">{conn.assigned_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}