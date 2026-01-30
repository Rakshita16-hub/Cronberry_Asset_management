import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { setAuthToken, setUserRole, setEmployeeId } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CronberryLogo } from '@/components/CronberryLogo';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password,
      });

      setAuthToken(response.data.access_token);
      setUserRole(response.data.role);
      if (response.data.employee_id) {
        setEmployeeId(response.data.employee_id);
      }
      
      toast.success('Login successful!');
      
      if (response.data.role === 'Employee') {
        navigate('/employee');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
              <CronberryLogo className="h-24 w-auto" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-center text-[#0B1F3A]">
              Cronberry Assets Tracker
            </h1>
            <p className="text-slate-600 text-center mt-2">Sign in to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                data-testid="login-username-input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              data-testid="login-submit-button"
              type="submit"
              className="w-full bg-[#0B1F3A] hover:bg-[#0B1F3A]/90"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* <div className="mt-6 text-center text-sm text-slate-600">
            <p>Demo: admin / admin123</p>
          </div> */}
        </div>
      </div>
    </div>
  );
}