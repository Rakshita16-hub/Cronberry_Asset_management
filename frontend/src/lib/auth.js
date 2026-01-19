export const setAuthToken = (token) => {
  localStorage.setItem('auth_token', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

export const removeAuthToken = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('employee_id');
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export const setUserRole = (role) => {
  localStorage.setItem('user_role', role);
};

export const getUserRole = () => {
  return localStorage.getItem('user_role');
};

export const setEmployeeId = (employeeId) => {
  if (employeeId) {
    localStorage.setItem('employee_id', employeeId);
  }
};

export const getEmployeeId = () => {
  return localStorage.getItem('employee_id');
};