import { useState } from 'react';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const GlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults(null);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/global-search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
      setIsOpen(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.length < 2) {
      setSearchResults(null);
    }
  };

  const runSearch = (e) => {
    e?.preventDefault();
    handleSearch(searchQuery);
  };

  const hasResults = searchResults && (searchResults.employees?.length > 0 || searchResults.assets?.length > 0);

  return (
    <>
      <form onSubmit={runSearch} className="relative w-full max-w-xl flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            data-testid="global-search-input"
            type="text"
            placeholder="Search by Employee, Asset or Serial Number..."
            value={searchQuery}
            onChange={handleInputChange}
            className="pl-10 pr-4 w-full"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-[#D81B60] border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || searchQuery.length < 2}
          className="px-4 py-2 rounded-md bg-[#D81B60] text-white font-medium hover:bg-[#c2185b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          Search
        </button>
      </form>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Search Results for "{searchQuery}"</DialogTitle>
          </DialogHeader>

          {!hasResults && searchResults && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No matching records found.</p>
              <p className="text-sm text-slate-500 mt-2">Try searching with different keywords</p>
            </div>
          )}

          {searchResults?.employees && searchResults.employees.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[#0B1F3A] mb-4">Employees ({searchResults.employees.length})</h3>
              <div className="space-y-3">
                {searchResults.employees.map((employee) => (
                  <div
                    key={employee.employee_id}
                    data-testid={`search-employee-${employee.employee_id}`}
                    className="border border-slate-200 rounded-lg p-4 hover:border-[#D81B60] transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-[#0B1F3A]">{employee.full_name}</h4>
                        <p className="text-sm text-slate-600 mt-1">
                          {employee.employee_id} • {employee.department} • {employee.designation}
                        </p>
                        <p className="text-sm text-slate-500">{employee.email}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          employee.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {employee.status}
                      </span>
                    </div>
                    {employee.assigned_assets && employee.assigned_assets.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-sm font-medium text-slate-700 mb-2">
                          Assigned Assets ({employee.assigned_assets.length}):
                        </p>
                        <div className="space-y-1">
                          {employee.assigned_assets.map((asset) => (
                            <div key={asset.assignment_id} className="text-sm text-slate-600">
                              • {asset.asset_name} ({asset.asset_id})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults?.assets && searchResults.assets.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-[#0B1F3A] mb-4">Assets ({searchResults.assets.length})</h3>
              <div className="space-y-3">
                {searchResults.assets.map((asset) => (
                  <div
                    key={asset.asset_id}
                    data-testid={`search-asset-${asset.asset_id}`}
                    className="border border-slate-200 rounded-lg p-4 hover:border-[#D81B60] transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-[#0B1F3A]">{asset.asset_name}</h4>
                        <p className="text-sm text-slate-600 mt-1">
                          {asset.asset_id} • {asset.category} • {asset.brand}
                        </p>
                        <p className="text-sm text-slate-500">Serial: {asset.serial_number}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                            {asset.condition}
                          </span>
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
                        </div>
                      </div>
                    </div>
                    {asset.assigned_to && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-sm font-medium text-slate-700">Assigned To:</p>
                        <p className="text-sm text-slate-600 mt-1">
                          {asset.assigned_to.employee_name} ({asset.assigned_to.employee_id})
                        </p>
                        <p className="text-xs text-slate-500">
                          Since: {formatDisplayDate(asset.assigned_to.assigned_date)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalSearch;