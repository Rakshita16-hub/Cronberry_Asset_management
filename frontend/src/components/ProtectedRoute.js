import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '@/lib/auth';

export const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;