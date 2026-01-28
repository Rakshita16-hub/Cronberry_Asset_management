import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Upload, Download, FileSpreadsheet } from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [importing, setImporting] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    designation: '',
    email: '',
    date_of_joining: '',
    status: 'Active',
  });

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/employees/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const params = {};
      if (selectedDepartment && selectedDepartment !== 'all') {
        params.department = selectedDepartment;
      }
      params.includeTotal = 'true';
      
      const response = await api.get('/employees', { params });
      
      // Handle both array and object response formats
      if (Array.isArray(response.data)) {
        setEmployees(response.data);
        // Get total from header if available
        const totalFromHeader = response.headers['x-total-count'];
        setTotalCount(totalFromHeader ? parseInt(totalFromHeader) : response.data.length);
      } else {
        setEmployees(response.data.employees || []);
        setTotalCount(response.data.total || 0);
      }
    } catch (error) {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [selectedDepartment]);

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      const dateVal = employee.date_of_joining;
      const dateStr = dateVal ? String(dateVal).slice(0, 10) : '';
      setFormData({
        full_name: employee.full_name,
        department: employee.department,
        designation: employee.designation,
        email: employee.email,
        date_of_joining: dateStr,
        status: employee.status,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        full_name: '',
        department: '',
        designation: '',
        email: '',
        date_of_joining: '',
        status: 'Active',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.employee_id}`, formData);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/employees', formData);
        toast.success('Employee added successfully');
      }
      setDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;

    try {
      await api.delete(`/employees/${employeeId}`);
      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/employees/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employees.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Employees exported successfully');
    } catch (error) {
      toast.error('Failed to export employees');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/employees/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employees_template.xlsx');
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
      const response = await api.post('/employees/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        toast.warning(`Some rows had errors: ${response.data.errors.length} errors`);
      }
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import employees');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#0B1F3A]">Employees</h1>
          <p className="text-slate-600 mt-2">Manage employee records</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
            data-testid="import-file-input"
          />
          <Button
            data-testid="download-template-button"
            variant="outline"
            onClick={handleDownloadTemplate}
            className="border-slate-300"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Template
          </Button>
          <Button
            data-testid="import-employees-button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="border-slate-300"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? 'Importing...' : 'Import'}
          </Button>
          <Button
            data-testid="export-employees-button"
            variant="outline"
            onClick={handleExport}
            className="border-slate-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button data-testid="add-employee-button" onClick={() => handleOpenDialog()} className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="department-filter" className="text-sm font-medium text-muted-foreground">Filter by Department:</Label>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger id="department-filter" className="w-[200px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Designation</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((employee) => (
                <tr key={employee.employee_id} className="hover:bg-muted/50 transition-colors" data-testid={`employee-row-${employee.employee_id}`}>
                  <td className="px-6 py-4 text-sm">{employee.employee_id}</td>
                  <td className="px-6 py-4 text-sm font-medium">{employee.full_name}</td>
                  <td className="px-6 py-4 text-sm">{employee.department}</td>
                  <td className="px-6 py-4 text-sm">{employee.designation}</td>
                  <td className="px-6 py-4 text-sm">{employee.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-medium ${
                        employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <Button
                        data-testid={`edit-employee-${employee.employee_id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(employee)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        data-testid={`delete-employee-${employee.employee_id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(employee.employee_id)}
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
        <div className="px-6 py-4 bg-muted/30 border-t border-border">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{employees.length}</span> of <span className="font-medium">{totalCount}</span> employees
              {selectedDepartment !== 'all' && (
                <span className="ml-2">in <span className="font-medium">{selectedDepartment}</span> department</span>
              )}
            </p>
            <p className="text-sm font-semibold text-[#0B1F3A]">
              Total: {totalCount} employee{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  data-testid="employee-name-input"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="employee-email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  data-testid="employee-department-input"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  data-testid="employee-designation-input"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_joining">Date of Joining</Label>
                <Input
                  id="date_of_joining"
                  data-testid="employee-doj-input"
                  type="date"
                  value={formData.date_of_joining}
                  onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger data-testid="employee-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Exit">Exit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button data-testid="employee-form-submit" type="submit">
                {editingEmployee ? 'Update' : 'Add'} Employee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}