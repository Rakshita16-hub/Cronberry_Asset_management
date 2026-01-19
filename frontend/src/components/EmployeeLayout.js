import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Package } from 'lucide-react';
import { removeAuthToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { CronberryLogo } from '@/components/CronberryLogo';

export const EmployeeLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeAuthToken();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <CronberryLogo className="h-10 w-auto" />
              <div>
                <h1 className="text-lg font-bold text-[#0B1F3A]">Cronberry</h1>
                <p className="text-xs text-slate-600">Assets Tracker</p>
              </div>
            </div>
            <Button
              data-testid="employee-logout-button"
              onClick={handleLogout}
              variant="outline"
              className="border-slate-300 hover:bg-slate-100 hover:text-[#D81B60]"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default EmployeeLayout;