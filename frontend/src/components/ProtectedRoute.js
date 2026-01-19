import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUserRole } from '@/lib/auth';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const userRole = getUserRole();
  
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (userRole === 'Employee') {
      return <Navigate to="/employee" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;