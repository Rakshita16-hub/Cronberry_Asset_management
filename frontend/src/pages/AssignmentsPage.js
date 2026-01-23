import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, FileSpreadsheet, Search, Upload, Download } from 'lucide-react';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    asset_id: '',
    assigned_date: '',
    return_date: '',
    asset_return_condition: '',
    remarks: '',
    sim_provider: '',
    sim_mobile_number: '',
    sim_type: '',
    sim_ownership: '',
    sim_purpose: '',
  });

  // Check if selected asset is Mobile
  const [selectedAssetCategory, setSelectedAssetCategory] = useState('');
  
  useEffect(() => {
    if (formData.asset_id && assets.length > 0) {
      const asset = assets.find(a => a.asset_id === formData.asset_id);
      setSelectedAssetCategory(asset?.category || '');
    } else {
      setSelectedAssetCategory('');
    }
  }, [formData.asset_id, assets]);

  const isMobileAsset = selectedAssetCategory.toLowerCase() === 'mobile';
  const hasReturnDate = !!formData.return_date;

  const fetchData = async () => {
    try {
      const [assignmentsRes, employeesRes, assetsRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/employees'),
        api.get('/assets'),
      ]);
      setAssignments(assignmentsRes.data);
      setEmployees(employeesRes.data);
      setAssets(assetsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (assignment = null) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setFormData({
        employee_id: assignment.employee_id,
        asset_id: assignment.asset_id,
        assigned_date: assignment.assigned_date,
        return_date: assignment.return_date || '',
        asset_return_condition: assignment.asset_return_condition || '',
        remarks: assignment.remarks || '',
        sim_provider: assignment.sim_provider || '',
        sim_mobile_number: assignment.sim_mobile_number || '',
        sim_type: assignment.sim_type || '',
        sim_ownership: assignment.sim_ownership || '',
        sim_purpose: assignment.sim_purpose || '',
      });
    } else {
      setEditingAssignment(null);
      setFormData({
        employee_id: '',
        asset_id: '',
        assigned_date: '',
        return_date: '',
        asset_return_condition: '',
        remarks: '',
        sim_provider: '',
        sim_mobile_number: '',
        sim_type: '',
        sim_ownership: '',
        sim_purpose: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation: Asset Return Condition is mandatory if Return Date is filled
    if (formData.return_date && !formData.asset_return_condition) {
      toast.error('Asset Return Condition is required when Return Date is provided');
      return;
    }
    
    try {
      const payload = {
        ...formData,
        return_date: formData.return_date || null,
        asset_return_condition: formData.asset_return_condition || null,
        remarks: formData.remarks || null,
        sim_provider: formData.sim_provider || null,
        sim_mobile_number: formData.sim_mobile_number || null,
        sim_type: formData.sim_type || null,
        sim_ownership: formData.sim_ownership || null,
        sim_purpose: formData.sim_purpose || null,
      };

      if (editingAssignment) {
        await api.put(`/assignments/${editingAssignment.assignment_id}`, payload);
        toast.success('Assignment updated successfully');
      } else {
        await api.post('/assignments', payload);
        toast.success('Assignment created successfully');
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;

    try {
      await api.delete(`/assignments/${assignmentId}`);
      toast.success('Assignment deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete assignment');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/assignments/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'asset_assignments.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export successful');
    } catch (error) {
      toast.error('Failed to export data');
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
      link.setAttribute('download', 'assignments_template.xlsx');
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
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import assignments');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    try {
      const response = await api.get(`/search/employees?q=${searchQuery}`);
      setSearchResults(response.data);
    } catch (error) {
      toast.error('Search failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#0B1F3A]">Asset Assignments</h1>
          <p className="text-slate-600 mt-2">Track asset allocations</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
            data-testid="import-assignments-file-input"
          />
          <Button
            data-testid="download-assignments-template-button"
            variant="outline"
            onClick={handleDownloadTemplate}
            className="border-slate-300"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Template
          </Button>
          <Button
            data-testid="import-assignments-button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="border-slate-300"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? 'Importing...' : 'Import'}
          </Button>
          <Button data-testid="search-button" variant="outline" onClick={() => setSearchDialogOpen(true)} className="border-slate-300">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          <Button data-testid="export-button" variant="outline" onClick={handleExport} className="border-slate-300">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button data-testid="add-assignment-button" onClick={() => handleOpenDialog()} className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90">
            <Plus className="h-4 w-4 mr-2" />
            Assign Asset
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asset</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Return Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remarks</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignments.map((assignment) => (
                <tr key={assignment.assignment_id} className="hover:bg-muted/50 transition-colors" data-testid={`assignment-row-${assignment.assignment_id}`}>
                  <td className="px-6 py-4 text-sm">{assignment.assignment_id}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium">{assignment.employee_name}</div>
                    <div className="text-muted-foreground text-xs">{assignment.employee_id}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium">{assignment.asset_name}</div>
                    <div className="text-muted-foreground text-xs">{assignment.asset_id}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{assignment.assigned_date}</td>
                  <td className="px-6 py-4 text-sm">
                    {assignment.return_date ? (
                      assignment.return_date
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">{assignment.remarks || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <Button
                        data-testid={`edit-assignment-${assignment.assignment_id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(assignment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        data-testid={`delete-assignment-${assignment.assignment_id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(assignment.assignment_id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Assign Asset'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  disabled={!!editingAssignment}
                >
                  <SelectTrigger data-testid="assignment-employee-select">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5}>
                    {employees.map((emp) => (
                      <SelectItem key={emp.employee_id} value={emp.employee_id}>
                        {emp.full_name} ({emp.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset_id">Asset</Label>
                <Select
                  value={formData.asset_id}
                  onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
                  disabled={!!editingAssignment}
                >
                  <SelectTrigger data-testid="assignment-asset-select">
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5}>
                    {assets
                      .filter((asset) => asset.status === 'Available' || asset.asset_id === formData.asset_id)
                      .map((asset) => (
                        <SelectItem key={asset.asset_id} value={asset.asset_id}>
                          {asset.asset_name} ({asset.asset_id}) - {asset.status}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_date">Assigned Date</Label>
                <Input
                  id="assigned_date"
                  data-testid="assignment-date-input"
                  type="date"
                  value={formData.assigned_date}
                  onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="return_date">Return Date (Optional)</Label>
                <Input
                  id="return_date"
                  data-testid="assignment-return-date-input"
                  type="date"
                  value={formData.return_date}
                  onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                />
              </div>
              
              {/* Asset Return Condition - Show only when Return Date is filled */}
              {hasReturnDate && (
                <div className="space-y-2">
                  <Label htmlFor="asset_return_condition">
                    Asset Return Condition <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.asset_return_condition}
                    onValueChange={(value) => setFormData({ ...formData, asset_return_condition: value })}
                  >
                    <SelectTrigger data-testid="asset-return-condition-select">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Damaged">Damaged</SelectItem>
                      <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input
                  id="remarks"
                  data-testid="assignment-remarks-input"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
              
              {/* SIM Connection Details - Show only for Mobile assets */}
              {isMobileAsset && (
                <>
                  <div className="col-span-2 mt-6 pt-6 border-t border-slate-200">
                    <h3 className="text-lg font-semibold text-[#0B1F3A] mb-4">SIM Connection Details (Optional)</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sim_provider">SIM Provider</Label>
                    <Select
                      value={formData.sim_provider}
                      onValueChange={(value) => setFormData({ ...formData, sim_provider: value })}
                    >
                      <SelectTrigger data-testid="sim-provider-select">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Airtel">Airtel</SelectItem>
                        <SelectItem value="Jio">Jio</SelectItem>
                        <SelectItem value="Vi">Vi</SelectItem>
                        <SelectItem value="BSNL">BSNL</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sim_mobile_number">SIM Mobile Number</Label>
                    <Input
                      id="sim_mobile_number"
                      data-testid="sim-mobile-number-input"
                      placeholder="Enter mobile number"
                      value={formData.sim_mobile_number}
                      onChange={(e) => setFormData({ ...formData, sim_mobile_number: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sim_type">SIM Type</Label>
                    <Select
                      value={formData.sim_type}
                      onValueChange={(value) => setFormData({ ...formData, sim_type: value })}
                    >
                      <SelectTrigger data-testid="sim-type-select">
                        <SelectValue placeholder="Select SIM type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Physical SIM">Physical SIM</SelectItem>
                        <SelectItem value="eSIM">eSIM</SelectItem>
                        <SelectItem value="WhatsApp Only">WhatsApp Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sim_ownership">SIM Ownership</Label>
                    <Select
                      value={formData.sim_ownership}
                      onValueChange={(value) => setFormData({ ...formData, sim_ownership: value })}
                    >
                      <SelectTrigger data-testid="sim-ownership-select">
                        <SelectValue placeholder="Select ownership" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="With Employee">With Employee</SelectItem>
                        <SelectItem value="With HR/Office">With HR/Office</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="sim_purpose">SIM Purpose / Remarks</Label>
                    <Input
                      id="sim_purpose"
                      data-testid="sim-purpose-input"
                      placeholder="Enter purpose or remarks"
                      value={formData.sim_purpose}
                      onChange={(e) => setFormData({ ...formData, sim_purpose: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button data-testid="assignment-form-submit" type="submit">
                {editingAssignment ? 'Update' : 'Create'} Assignment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Search Employee Assets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                data-testid="search-input"
                placeholder="Search by name, ID, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button data-testid="search-submit-button" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map((employee) => (
                  <div key={employee.employee_id} className="border border-border rounded-lg p-4" data-testid={`search-result-${employee.employee_id}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{employee.full_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {employee.employee_id} • {employee.department} • {employee.designation}
                        </p>
                      </div>
                    </div>
                    {employee.assigned_assets && employee.assigned_assets.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2">Assigned Assets:</p>
                        <div className="space-y-2">
                          {employee.assigned_assets.map((asset) => (
                            <div key={asset.assignment_id} className="bg-muted/30 rounded p-2 text-sm">
                              <p className="font-medium">{asset.asset_name}</p>
                              <p className="text-xs text-muted-foreground">
                                ID: {asset.asset_id} • Assigned: {asset.assigned_date}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">No assets currently assigned</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}