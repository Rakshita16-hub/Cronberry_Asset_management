import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

export default function SIMConnectionsPage() {
  const [simConnections, setSimConnections] = useState([]);
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/assignments/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sim_connections_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/assignments/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        console.error('Import errors:', response.data.errors);
        toast.warning(`Some rows had errors. Check console for details.`);
      }
      fetchSIMConnections();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import SIM connections');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
            data-testid="import-sim-file-input"
          />
          <Button
            data-testid="download-sim-template-button"
            variant="outline"
            onClick={handleDownloadTemplate}
            className="border-slate-300"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Template
          </Button>
          <Button
            data-testid="import-sim-button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="border-slate-300"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? 'Importing...' : 'Import'}
          </Button>
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
          <p className="text-slate-600 mb-4">
            {searchQuery ? 'No SIM connections found matching your search.' : 'No SIM connections recorded yet.'}
          </p>
          <p className="text-sm text-slate-500">
            SIM connections are automatically created when you assign a Mobile asset with SIM details through the Assignments page.
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
                    <td className="px-6 py-4 text-sm">{formatDisplayDate(conn.assigned_date)}</td>
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