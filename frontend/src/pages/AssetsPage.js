import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Upload, Download, FileSpreadsheet, X } from 'lucide-react';

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [filters, setFilters] = useState({
    asset_name: '',
    category: '',
    condition: '',
    status: '',
  });
  const [formData, setFormData] = useState({
    asset_name: '',
    category: '',
    brand: '',
    serial_number: '',
    imei_2: '',
    condition: 'New',
    status: 'Available',
    assigned_to: '',
    remarks: '',
  });

  const categoryLower = (formData.category || '').toLowerCase().trim();
  const isMobileCategory = categoryLower === 'mobile';
  const isLaptopCategory = categoryLower === 'laptop';
  const isOtherCategory = !isMobileCategory && !isLaptopCategory && formData.category;

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets');
      setAssets(response.data);
    } catch (error) {
      toast.error('Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchEmployees();
  }, []);

  // Get unique categories from assets
  const uniqueCategories = [...new Set(assets.map(asset => asset.category).filter(Boolean))].sort();

  // Filter assets based on filter criteria
  const filteredAssets = assets.filter((asset) => {
    const matchesName = filters.asset_name === '' || 
      asset.asset_name.toLowerCase().includes(filters.asset_name.toLowerCase());
    const matchesCategory = filters.category === '' || filters.category === 'all' || asset.category === filters.category;
    const matchesCondition = filters.condition === '' || filters.condition === 'all' || asset.condition === filters.condition;
    const matchesStatus = filters.status === '' || filters.status === 'all' || asset.status === filters.status;
    
    return matchesName && matchesCategory && matchesCondition && matchesStatus;
  });

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      asset_name: '',
      category: '',
      condition: '',
      status: '',
    });
  };

  const hasActiveFilters = filters.asset_name || (filters.category && filters.category !== 'all') || (filters.condition && filters.condition !== 'all') || (filters.status && filters.status !== 'all');

  const handleOpenDialog = (asset = null) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        asset_name: asset.asset_name,
        category: asset.category,
        brand: asset.brand,
        serial_number: asset.serial_number,
        imei_2: asset.imei_2 || '',
        condition: asset.condition,
        status: asset.status,
        assigned_to: asset.assigned_to || '',
        remarks: asset.remarks || '',
      });
    } else {
      setEditingAsset(null);
      setFormData({
        asset_name: '',
        category: '',
        brand: '',
        serial_number: '',
        imei_2: '',
        condition: 'New',
        status: 'Available',
        assigned_to: '',
        remarks: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Category-based validation
    const categoryLower = (formData.category || '').toLowerCase().trim();
    
    if (categoryLower === 'laptop') {
      if (!formData.serial_number || formData.serial_number.trim() === '') {
        toast.error('Serial Number is required for Laptop category');
        return;
      }
    } else if (categoryLower === 'mobile') {
      if (!formData.serial_number || formData.serial_number.trim() === '') {
        toast.error('IMEI1 Number is required for Mobile category');
        return;
      }
    } else {
      // For other categories (Other, electronic item, cable, mouse, etc.), serial_number is required
      if (!formData.serial_number || formData.serial_number.trim() === '') {
        toast.error('Serial Number is required for this category');
        return;
      }
    }
    
    // Validation - assigned_to is required when status is Assigned
    if (formData.status === 'Assigned' && !formData.assigned_to) {
      toast.error('Please select an employee to assign the asset');
      return;
    }
    
    try {
      // Prepare data - only include assigned_to if status is Assigned
      const submitData = { ...formData };
      if (formData.status !== 'Assigned') {
        delete submitData.assigned_to;
      }
      
      if (editingAsset) {
        await api.put(`/assets/${editingAsset.asset_id}`, submitData);
        toast.success('Asset updated successfully');
      } else {
        await api.post('/assets', submitData);
        toast.success('Asset added successfully');
      }
      setDialogOpen(false);
      fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (asset) => {
    if (asset.status === 'Assigned') {
      toast.error('Cannot delete asset: it is currently assigned. Unassign or return the asset first.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this asset?')) return;

    try {
      await api.delete(`/assets/${asset.asset_id}`);
      toast.success('Asset deleted successfully');
      fetchAssets();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete asset';
      toast.error(message);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/assets/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'assets.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Assets exported successfully');
    } catch (error) {
      toast.error('Failed to export assets');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/assets/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'assets_template.xlsx');
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
      const response = await api.post('/assets/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Check if there are errors in the response
      if (response.data.success === false || (response.data.errors && response.data.errors.length > 0)) {
        // Show summary
        toast.error(response.data.summary || response.data.message || 'Import failed');
        
        // Show detailed errors
        if (response.data.errors && response.data.errors.length > 0) {
          // Show first few errors in toast, then all errors in console
          const errorMessages = response.data.errors.slice(0, 3).join('\n');
          const remainingErrors = response.data.errors.length - 3;
          
          if (remainingErrors > 0) {
            toast.error(`${errorMessages}\n... and ${remainingErrors} more error(s). Check console for full details.`, {
              duration: 10000,
            });
          } else {
            toast.error(errorMessages, {
              duration: 10000,
            });
          }
          
          // Log all errors to console for debugging
          console.error('Import Errors:', response.data.errors);
        }
      } else {
        // Success case
        toast.success(response.data.message || response.data.summary || 'Assets imported successfully');
      }
      
      fetchAssets();
    } catch (error) {
      // Handle error response
      const errorData = error.response?.data;
      
      if (errorData) {
        // Show summary or message
        const errorMessage = errorData.summary || errorData.message || errorData.detail || 'Failed to import assets';
        toast.error(errorMessage);
        
        // Show detailed errors if available
        if (errorData.errors && errorData.errors.length > 0) {
          const errorMessages = errorData.errors.slice(0, 3).join('\n');
          const remainingErrors = errorData.errors.length - 3;
          
          if (remainingErrors > 0) {
            toast.error(`${errorMessages}\n... and ${remainingErrors} more error(s). Check console for full details.`, {
              duration: 10000,
            });
          } else {
            toast.error(errorMessages, {
              duration: 10000,
            });
          }
          
          // Log all errors to console
          console.error('Import Errors:', errorData.errors);
        }
      } else {
        toast.error(error.message || 'Failed to import assets');
      }
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
          <h1 className="text-4xl font-bold tracking-tight text-[#0B1F3A]">Assets</h1>
          <p className="text-slate-600 mt-2">Manage company assets</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
            data-testid="import-assets-file-input"
          />
          <Button
            data-testid="download-assets-template-button"
            variant="outline"
            onClick={handleDownloadTemplate}
            className="border-slate-300"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Template
          </Button>
          <Button
            data-testid="import-assets-button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="border-slate-300"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? 'Importing...' : 'Import'}
          </Button>
          <Button
            data-testid="export-assets-button"
            variant="outline"
            onClick={handleExport}
            className="border-slate-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button data-testid="add-asset-button" onClick={() => handleOpenDialog()} className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Compact Filters Section */}
      <div className="bg-white rounded-lg border border-border p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 min-w-[200px] flex-1">
            <Input
              id="filter-asset-name"
              placeholder="Search by name..."
              value={filters.asset_name}
              onChange={(e) => handleFilterChange('asset_name', e.target.value)}
              className="h-9"
            />
          </div>
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}
          >
            <SelectTrigger id="filter-category" className="h-9 w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.condition || 'all'}
            onValueChange={(value) => handleFilterChange('condition', value === 'all' ? '' : value)}
          >
            <SelectTrigger id="filter-condition" className="h-9 w-[140px]">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Condition</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Good">Good</SelectItem>
              <SelectItem value="Damaged">Damaged</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
          >
            <SelectTrigger id="filter-status" className="h-9 w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="Under Repair">Under Repair</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                <span>{filteredAssets.length} of {assets.length}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 px-3"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Asset Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Serial / IMEI</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Condition</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-sm text-muted-foreground">
                    {hasActiveFilters ? 'No assets match the selected filters' : 'No assets found'}
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                <tr key={asset.asset_id} className="hover:bg-slate-50 transition-colors" data-testid={`asset-row-${asset.asset_id}`}>
                  <td className="px-6 py-4 text-sm">{asset.asset_id}</td>
                  <td className="px-6 py-4 text-sm font-medium">{asset.asset_name}</td>
                  <td className="px-6 py-4 text-sm">{asset.category}</td>
                  <td className="px-6 py-4 text-sm">{asset.brand}</td>
                  <td className="px-6 py-4 text-sm">
                    <div>
                      <div className="font-medium">{asset.serial_number}</div>
                      {asset.imei_2 && asset.category === 'Mobile' && (
                        <div className="text-xs text-slate-500">IMEI 2: {asset.imei_2}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                      {asset.condition}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-medium ${
                        asset.status === 'Available'
                          ? 'bg-green-100 text-green-800'
                          : asset.status === 'Assigned'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <Button
                        data-testid={`edit-asset-${asset.asset_id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(asset)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        data-testid={`delete-asset-${asset.asset_id}`}
                        variant="ghost"
                        size="sm"
                        disabled={asset.status === 'Assigned'}
                        title={asset.status === 'Assigned' ? 'Cannot delete assigned asset. Unassign or return it first.' : 'Delete asset'}
                        onClick={() => handleDelete(asset)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="asset_name">Asset Name</Label>
                <Input
                  id="asset_name"
                  data-testid="asset-name-input"
                  value={formData.asset_name}
                  onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  data-testid="asset-category-input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  data-testid="asset-brand-input"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  required
                />
              </div>
              
              {/* Conditional Fields based on Category */}
              {isMobileCategory ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="imei_1">IMEI 1 <span className="text-red-500">*</span></Label>
                    <Input
                      id="imei_1"
                      data-testid="asset-imei1-input"
                      placeholder="Enter IMEI slot 1 (required)"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imei_2">IMEI 2</Label>
                    <Input
                      id="imei_2"
                      data-testid="asset-imei2-input"
                      placeholder="Enter IMEI slot 2 (optional)"
                      value={formData.imei_2}
                      onChange={(e) => setFormData({ ...formData, imei_2: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="serial_number">
                    Serial Number 
                    {(isLaptopCategory || isOtherCategory) && <span className="text-red-500"> *</span>}
                  </Label>
                  <Input
                    id="serial_number"
                    data-testid="asset-serial-input"
                    placeholder={isLaptopCategory || isOtherCategory ? "Enter serial number (required)" : "Enter serial number (optional)"}
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    required={isLaptopCategory || isOtherCategory}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => setFormData({ ...formData, condition: value })}
                >
                  <SelectTrigger data-testid="asset-condition-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => {
                    const newFormData = { ...formData, status: value };
                    // Clear assigned_to if status is not Assigned
                    if (value !== 'Assigned') {
                      newFormData.assigned_to = '';
                    }
                    setFormData(newFormData);
                  }}
                >
                  <SelectTrigger data-testid="asset-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="Under Repair">Under Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.status === 'Assigned' && (
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assigned To <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.assigned_to}
                    onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                  >
                    <SelectTrigger data-testid="asset-assigned-to-select">
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
              )}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input
                  id="remarks"
                  data-testid="asset-remarks-input"
                  placeholder="Enter remarks or notes"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button data-testid="asset-form-submit" type="submit">
                {editingAsset ? 'Update' : 'Add'} Asset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}