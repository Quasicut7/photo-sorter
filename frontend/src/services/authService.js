import api from '../services/api';

// Register new user
export const register = async (email, password, name) => {
  try {
    const response = await api.post('/auth/register', {
      email,
      password,
      name,
    });

    if (response.data.success) {
      const { user, token } = response.data.data;

      // Store token and user in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      return { success: true, user, token };
    }

    return { success: false, error: 'Registration failed' };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Registration failed',
    };
  }
};

// Login user
export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', {
      email,
      password,
    });

    if (response.data.success) {
      const { user, token } = response.data.data;

      // Store token and user in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      return { success: true, user, token };
    }

    return { success: false, error: 'Login failed' };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Login failed',
    };
  }
};

// Logout user
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');

    if (response.data.success) {
      const { user } = response.data.data;
      localStorage.setItem('user', JSON.stringify(user));
      return { success: true, user };
    }

    return { success: false, error: 'Failed to get user info' };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to get user info',
    };
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

// Get stored user
export const getStoredUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};
