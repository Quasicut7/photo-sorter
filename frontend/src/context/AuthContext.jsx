import { createContext, useState, useContext, useEffect } from 'react';
import { getStoredUser, isAuthenticated, getCurrentUser } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on mount
    if (isAuthenticated()) {
      const storedUser = getStoredUser();
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const refreshUser = async () => {
    try {
      if (isAuthenticated()) {
        const result = await getCurrentUser();
        if (result.success) {
          setUser(result.user);
          return { success: true, user: result.user };
        }
      }
      return { success: false, error: 'Failed to refresh user data' };
    } catch (error) {
      console.error('Error refreshing user:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    setUser,
    loading,
    refreshUser,
    isAuthenticated: isAuthenticated(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
